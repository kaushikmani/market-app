import { execSync } from 'child_process';
import { getBrowser } from './browser.js';
import { callGemini } from '../services/whisperService.js';

// Only paid/subscribed Substacks
const SUBSTACKS = [
  { name: "Za's Market Terminal", feedUrl: 'https://zastocks.substack.com/feed', domain: 'zastocks.com', color: '#10b981' },
  { name: 'Citrini Research', feedUrl: 'https://citriniresearch.substack.com/feed', domain: 'citriniresearch.com', color: '#6366f1' },
];

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const match = xml.match(regex);
  if (!match) return '';
  return (match[1] || match[2] || '').trim();
}

function extractAllItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    items.push(match[1]);
  }
  return items;
}

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fetchFeedList(substack) {
  try {
    const raw = execSync(
      `curl -sL -H "User-Agent: Mozilla/5.0" "${substack.feedUrl}"`,
      { timeout: 15000, encoding: 'utf-8' }
    );

    const items = extractAllItems(raw);
    return items.slice(0, 3).map(item => {
      const title = stripHtml(extractTag(item, 'title'));
      const link = extractTag(item, 'link');
      const pubDate = extractTag(item, 'pubDate');
      const creator = stripHtml(extractTag(item, 'dc:creator'));

      return {
        title,
        link,
        pubDate,
        date: pubDate ? new Date(pubDate).toISOString() : null,
        author: creator || substack.name,
        source: substack.name,
        sourceColor: substack.color,
      };
    }).filter(item => item.title);
  } catch (e) {
    console.error(`[SubstackFeed] Failed to fetch feed for ${substack.name}:`, e.message);
    return [];
  }
}

async function scrapeArticleContent(url) {
  try {
    const ctx = await getBrowser();
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Wait for article body to load
    await page.waitForSelector('.body, .post-content, article', { timeout: 10000 }).catch(() => {});

    // Extract article text from the post body
    const content = await page.evaluate(() => {
      /* eslint-disable no-undef */
      // Substack article body
      const body = document.querySelector('.body.markup') ||
                   document.querySelector('.post-content') ||
                   document.querySelector('article') ||
                   document.querySelector('.body');
      if (!body) return '';

      // Remove subscription CTAs, footers, share buttons
      body.querySelectorAll('.subscription-widget-wrap, .footer, .share-dialog, .post-ufi, .pencraft').forEach(el => {
        if (el.textContent.includes('Subscribe') || el.textContent.includes('Share')) {
          el.remove();
        }
      });

      /* eslint-enable no-undef */
      return body.innerText || '';
    });

    await page.close();
    return content.substring(0, 8000); // Cap at 8k chars for Gemini
  } catch (e) {
    console.error(`[SubstackFeed] Failed to scrape ${url}:`, e.message);
    return '';
  }
}

async function summarizeArticle(title, content, source) {
  if (!content || content.length < 100) return null;

  const prompt = `You are a market analyst assistant. Summarize this Substack article for an active trader.

Article Title: "${title}"
Source: ${source}

Article Content:
${content}

Respond with valid JSON only, no markdown:
{
  "summary": "2-4 sentence summary of the key points and thesis",
  "watchFor": ["actionable item 1 — specific ticker, level, or event to watch", "actionable item 2", "actionable item 3"],
  "tickers": ["TICKER1", "TICKER2"],
  "sentiment": "bullish" | "bearish" | "neutral" | "mixed"
}

Rules:
- summary should capture the author's thesis and key insights
- watchFor should be specific and actionable: price levels, earnings dates, sector rotations, trade setups
- tickers should list any stocks/ETFs mentioned as important
- Keep it concise and useful for a trader preparing for the week`;

  try {
    const raw = await callGemini(prompt);
    if (!raw) return null;

    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error(`[SubstackFeed] Failed to summarize "${title}":`, e.message);
    return null;
  }
}

// Cache
let cache = { data: null, expiry: 0 };
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour (scraping + summarizing is expensive)

export async function fetchSubstackFeed() {
  const now = Date.now();
  if (cache.data && now < cache.expiry) {
    return cache.data;
  }

  console.log('[SubstackFeed] Fetching paid Substack feeds...');
  const startTime = Date.now();

  // Step 1: Get article list from RSS
  const allPosts = [];
  for (const sub of SUBSTACKS) {
    const posts = fetchFeedList(sub);
    allPosts.push(...posts);
  }

  // Sort by date, newest first
  allPosts.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  // Step 2: Scrape full content + summarize (latest 3 articles — keep Gemini quota for game plan)
  const postsToProcess = allPosts.slice(0, 3);
  for (const post of postsToProcess) {
    console.log(`[SubstackFeed] Scraping: "${post.title}"...`);
    const content = await scrapeArticleContent(post.link);

    if (content && content.length >= 100) {
      console.log(`[SubstackFeed] Summarizing: "${post.title}" (${content.length} chars)...`);
      const analysis = await summarizeArticle(post.title, content, post.source);
      if (analysis) {
        post.summary = analysis.summary;
        post.watchFor = analysis.watchFor;
        post.tickers = analysis.tickers;
        post.sentiment = analysis.sentiment;
      }
    }

    if (!post.summary) {
      post.summary = null;
      post.watchFor = [];
      post.tickers = [];
      post.sentiment = null;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[SubstackFeed] Done in ${elapsed}s — ${postsToProcess.length} posts processed`);

  const data = {
    success: true,
    posts: postsToProcess,
    sources: SUBSTACKS.map(s => ({ name: s.name, color: s.color })),
    updatedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  };

  cache = { data, expiry: now + CACHE_DURATION };
  return data;
}
