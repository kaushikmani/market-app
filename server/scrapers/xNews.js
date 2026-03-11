import { getBrowser } from './browser.js';
import { X_ACCOUNTS } from '../data/xWhitelist.js';

// Cache: scrape all profiles once, reuse for 15 min
let feedCache = { data: null, expiry: 0 };
const CACHE_TTL = 15 * 60 * 1000;

// Extract tweets from current page (reused per profile)
async function extractTweets(page) {
  return page.evaluate(() => {
    /* eslint-disable no-undef */
    const articles = document.querySelectorAll('[data-testid="tweet"]');
    const results = [];

    articles.forEach(article => {
      try {
        let handle = '';
        let author = '';
        const userNameEl = article.querySelector('[data-testid="User-Name"]');
        if (userNameEl) {
          const links = userNameEl.querySelectorAll('a');
          for (const link of links) {
            const href = link.getAttribute('href') || '';
            if (href.match(/^\/[A-Za-z0-9_]+$/) && !handle) {
              handle = href.replace('/', '@');
            }
          }
          const spans = userNameEl.querySelectorAll('span');
          if (spans.length > 0) {
            author = spans[0].textContent?.trim() || '';
          }
        }

        const textEl = article.querySelector('[data-testid="tweetText"]');
        const text = textEl ? textEl.textContent?.trim() : '';

        const timeEl = article.querySelector('time');
        const time = timeEl ? timeEl.getAttribute('datetime') : null;

        const timeLink = timeEl?.closest('a');
        const tweetHref = timeLink ? timeLink.getAttribute('href') : '';
        const url = tweetHref ? `https://x.com${tweetHref}` : '';

        const metrics = {};
        const groupEl = article.querySelector('[role="group"]');
        if (groupEl) {
          const buttons = groupEl.querySelectorAll('button');
          buttons.forEach(btn => {
            const label = btn.getAttribute('aria-label') || '';
            if (label.includes('repl')) {
              const m = label.match(/([\d,]+)/);
              if (m) metrics.replies = m[1];
            } else if (label.includes('repost') || label.includes('Repost')) {
              const m = label.match(/([\d,]+)/);
              if (m) metrics.reposts = m[1];
            } else if (label.includes('like') || label.includes('Like')) {
              const m = label.match(/([\d,]+)/);
              if (m) metrics.likes = m[1];
            }
          });
        }

        if (text) {
          results.push({ author, handle, text, time, url, metrics });
        }
      } catch {
        // Skip malformed tweets
      }
    });
    /* eslint-enable no-undef */

    return results;
  });
}

// Scrape a single profile for recent tweets
async function scrapeProfile(browser, username) {
  let page;
  try {
    page = await browser.newPage();
    await page.goto(`https://x.com/${username}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Check for login redirect
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/i/flow/login')) {
      if (username === X_ACCOUNTS[0]) console.log('[X] Session expired — redirected to login');
      await page.close();
      return [];
    }

    // Wait for tweets — try primary selector, fall back to article
    const tweetSelector = '[data-testid="tweet"], article[data-testid="tweet"], [data-testid="tweetText"]';
    try {
      await page.waitForSelector(tweetSelector, { timeout: 12000 });
    } catch {
      if (username === X_ACCOUNTS[0]) {
        const title = await page.title().catch(() => '?');
        console.log(`[X] No tweets rendered for @${username} — title: "${title}" url: ${page.url()}`);
      }
      await page.close();
      return [];
    }

    // Small scroll to load a few more
    // eslint-disable-next-line no-undef
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(1000);

    const tweets = await extractTweets(page);
    await page.close();

    // Filter to last 24 hours only
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return tweets.filter(t => {
      if (!t.time) return false;
      return new Date(t.time).getTime() > cutoff;
    });
  } catch {
    if (page) await page.close().catch(() => {});
    return [];
  }
}

// Scrape all whitelisted profiles — returns full feed sorted by time
async function scrapeAllProfiles() {
  const browser = await getBrowser();
  const allTweets = [];

  // Scrape 3 profiles at a time to avoid overwhelming the browser
  for (let i = 0; i < X_ACCOUNTS.length; i += 3) {
    const batch = X_ACCOUNTS.slice(i, i + 3);
    const results = await Promise.allSettled(
      batch.map(username => scrapeProfile(browser, username))
    );

    for (const res of results) {
      if (res.status === 'fulfilled') {
        allTweets.push(...res.value);
      }
    }

    // Brief delay between batches
    if (i + 3 < X_ACCOUNTS.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Dedupe by URL
  const seen = new Set();
  const unique = allTweets.filter(t => {
    if (!t.url || seen.has(t.url)) return false;
    seen.add(t.url);
    return true;
  });

  // Sort newest first
  unique.sort((a, b) => new Date(b.time) - new Date(a.time));

  return unique;
}

// Get the full X feed (cached 15 min)
export async function getXFeed() {
  const now = Date.now();
  if (feedCache.data && now < feedCache.expiry) {
    return feedCache.data;
  }

  console.log(`[X] Scraping ${X_ACCOUNTS.length} profiles...`);
  const tweets = await scrapeAllProfiles();
  console.log(`[X] Found ${tweets.length} tweets in last 24h`);

  const feed = tweets.map(t => ({
    title: t.text.length > 280 ? t.text.substring(0, 280) + '...' : t.text,
    fullText: t.text,
    url: t.url,
    source: t.handle || 'X',
    author: t.author,
    time: t.time,
    metrics: t.metrics,
    provider: 'x',
  }));

  // Only cache if we got actual tweets — empty result means browser wasn't ready yet
  if (feed.length > 0) {
    feedCache = { data: feed, expiry: now + CACHE_TTL };
  }
  return feed;
}

// For stock-specific X posts: filter the feed by $TICKER mentions
export async function scrapeXPosts(ticker) {
  try {
    const feed = await getXFeed();
    const upper = ticker.toUpperCase();
    const cashtag = `$${upper}`;

    const filtered = feed.filter(t => {
      const text = (t.fullText || t.title || '').toUpperCase();
      return text.includes(cashtag) || text.includes(upper);
    });

    return { news: filtered, success: true };
  } catch (error) {
    return { news: [], success: false, error: error.message };
  }
}
