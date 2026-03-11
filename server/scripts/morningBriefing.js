#!/usr/bin/env node

/**
 * Morning Briefing — sends a detailed pre-market report to WhatsApp via wacli.
 * Runs standalone: node server/scripts/morningBriefing.js
 * Scheduled daily at 5:00 AM ET via launchd.
 */

import { execFileSync } from 'child_process';
import { generatePreMarketReport } from '../scrapers/preMarketReport.js';
import { fetchMarketSentiment } from '../scrapers/marketSentiment.js';
import { scrapeNews } from '../scrapers/news.js';
import { callGemini } from '../services/whisperService.js';

const WHATSAPP_JID = '120363409048565862@g.us'; // Morning_Brief group
const WACLI = '/opt/homebrew/bin/wacli';

// ── Formatting helpers ──

function fmtDate() {
  return new Date().toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function fmtTime() {
  return new Date().toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function pct(val, decimals = 2) {
  if (val == null) return 'N/A';
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(decimals)}%`;
}

function price(val) {
  if (val == null) return 'N/A';
  return val.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// ── Rule-based narrative (works without Gemini) ──

function buildNarrativeFromData(report) {
  const f = report.futures;
  const m = report.macroNarrative;
  const gaps = report.gapScanner;

  const spPct = f?.sp500?.changePct;
  const vixPct = f?.vix?.changePct;
  const vixPrice = f?.vix?.price;

  let tone = 'mixed';
  if (spPct != null) {
    if (spPct <= -1.0) tone = 'risk-off';
    else if (spPct >= 1.0) tone = 'risk-on';
    else if (spPct < -0.3) tone = 'cautious';
    else if (spPct > 0.3) tone = 'mildly bullish';
  }

  const lines = [];

  // Tone line
  if (spPct != null) {
    const vixNote = vixPrice != null ? ` VIX at ${vixPrice.toFixed(1)}${vixPct != null ? ` (${pct(vixPct)})` : ''}.` : '';
    lines.push(`Futures signal a *${tone}* open — S&P ${pct(spPct)}, NASDAQ ${pct(f?.nasdaq?.changePct)}, DOW ${pct(f?.dow?.changePct)}.${vixNote}`);
  }

  // Overnight
  if (m?.asia) lines.push(`Asia: ${m.asia}`);
  if (m?.europe) lines.push(`Europe: ${m.europe}`);

  // Gap theme
  const upCount = gaps?.gappingUp?.length || 0;
  const downCount = gaps?.gappingDown?.length || 0;
  if (upCount > 0 || downCount > 0) {
    const biggest = [...(gaps.gappingUp || []), ...(gaps.gappingDown || [])]
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 3)
      .map(g => `${g.ticker} ${g.change}`)
      .join(', ');
    lines.push(`${upCount} gapping up, ${downCount} gapping down. Biggest movers: ${biggest}.`);
  }

  return lines.join('\n');
}

// ── Section builders ──

function buildFutures(report) {
  try {
    const f = report.futures;
    if (!f) return '';
    const lines = ['📊 *FUTURES*'];
    if (f.sp500) lines.push(`S&P:    ${price(f.sp500.price)} (${pct(f.sp500.changePct)})`);
    if (f.nasdaq) lines.push(`NASDAQ: ${price(f.nasdaq.price)} (${pct(f.nasdaq.changePct)})`);
    if (f.dow) lines.push(`DOW:    ${price(f.dow.price)} (${pct(f.dow.changePct)})`);
    if (f.vix) lines.push(`VIX:    ${f.vix.price?.toFixed(2)} (${pct(f.vix.changePct)})`);
    return lines.length > 1 ? lines.join('\n') : '';
  } catch { return ''; }
}

function buildNarrative(report, geminiSummary) {
  try {
    // Use Gemini summary if available and non-trivial, otherwise fallback to rule-based
    const summary = (geminiSummary && geminiSummary.length > 40)
      ? geminiSummary
      : buildNarrativeFromData(report);

    let section = `📰 *MARKET CONTEXT*\n${summary}`;

    const geo = report.macroNarrative?.geopoliticalAlert;
    if (geo) section += `\n\n⚠️ *ALERT:* ${geo}`;

    return section;
  } catch { return ''; }
}

function buildGaps(report) {
  try {
    const g = report.gapScanner;
    if (!g) return '';
    const lines = [];

    if (g.gappingUp?.length > 0) {
      const items = g.gappingUp.slice(0, 10)
        .map(s => `${s.ticker} ${s.change}`)
        .join('  ');
      lines.push(`🟢 *GAP UPS*\n${items}`);
    }
    if (g.gappingDown?.length > 0) {
      const items = g.gappingDown.slice(0, 10)
        .map(s => `${s.ticker} ${s.change}`)
        .join('  ');
      lines.push(`🔴 *GAP DOWNS*\n${items}`);
    }
    return lines.join('\n\n');
  } catch { return ''; }
}

function buildSentiment(sentimentData) {
  try {
    const fg = sentimentData?.fearGreed;
    if (!fg?.score) return '';
    const emoji = fg.score >= 75 ? '😱' : fg.score >= 55 ? '😀' : fg.score >= 45 ? '😐' : fg.score >= 25 ? '😟' : '😰';
    return `${emoji} *FEAR & GREED*\nScore: ${Math.round(fg.score)} — *${fg.rating}*`;
  } catch { return ''; }
}

function buildCatalysts(catalysts, newsArticles) {
  try {
    // Prefer pre-market report catalysts, supplement with Polygon news tickers
    const seen = new Set();
    const lines = ['🧬 *CATALYSTS*'];

    // From pre-market report (news headline based)
    for (const cat of (catalysts || []).slice(0, 6)) {
      if (!cat.ticker || seen.has(cat.ticker)) continue;
      seen.add(cat.ticker);
      lines.push(`• *${cat.ticker}* [${cat.type}] ${cat.description}`);
    }

    // Supplement with top Polygon news (multi-ticker stories = market-moving)
    const polyNews = (newsArticles || [])
      .filter(a => a.tickers?.length > 0 && a.title)
      .slice(0, 15);

    for (const article of polyNews) {
      const ticker = article.tickers[0];
      if (seen.has(ticker)) continue;
      seen.add(ticker);
      const title = article.title.length > 90 ? article.title.slice(0, 87) + '...' : article.title;
      lines.push(`• *${ticker}* ${title}`);
      if (lines.length >= 10) break;
    }

    return lines.length > 1 ? lines.join('\n') : '';
  } catch { return ''; }
}

function buildTopNews(newsArticles) {
  try {
    if (!newsArticles?.length) return '';
    const top = newsArticles.filter(a => a.title).slice(0, 5);
    if (!top.length) return '';
    const lines = ['📰 *TOP NEWS*'];
    for (const a of top) {
      const src = a.source ? ` (${a.source})` : '';
      const title = a.title.length > 100 ? a.title.slice(0, 97) + '...' : a.title;
      lines.push(`• ${title}${src}`);
    }
    return lines.join('\n');
  } catch { return ''; }
}

// ── Gemini narrative (best-effort, with timeout) ──

async function getGeminiNarrative(report, newsArticles) {
  try {
    const f = report.futures;
    const gaps = report.gapScanner;

    const newsContext = newsArticles.slice(0, 10)
      .map((a, i) => `${i + 1}. ${a.title}${a.tickers?.length ? ` (${a.tickers.slice(0,2).join(',')})` : ''}`)
      .join('\n') || '(no news)';

    const prompt = `Pre-market briefing for a swing trader. Write 2-3 sentences only.

FUTURES: S&P ${pct(f?.sp500?.changePct)} at ${price(f?.sp500?.price)}, NASDAQ ${pct(f?.nasdaq?.changePct)}, VIX ${f?.vix?.price?.toFixed(1)}
GAPS: ${gaps?.gappingUp?.slice(0,5).map(g=>`${g.ticker}${g.change}`).join(' ')} up | ${gaps?.gappingDown?.slice(0,5).map(g=>`${g.ticker}${g.change}`).join(' ')} down
NEWS:\n${newsContext}

Write a concise, opinionated 2-3 sentence market context — what's driving futures, key themes to watch, actionable insight. No markdown, no lists, plain text only.`;

    const text = await callGemini(prompt);
    return text?.trim() || null;
  } catch {
    return null;
  }
}

// ── Main ──

async function main() {
  const startTime = Date.now();
  console.log(`[MorningBriefing] Starting at ${new Date().toISOString()}`);

  // Fetch all data sources in parallel
  const [reportResult, sentimentResult, newsResult] = await Promise.allSettled([
    generatePreMarketReport(),
    fetchMarketSentiment(),
    scrapeNews(),
  ]);

  const report = reportResult.status === 'fulfilled' ? reportResult.value : null;
  const sentiment = sentimentResult.status === 'fulfilled' ? sentimentResult.value : null;
  const newsData = newsResult.status === 'fulfilled' ? newsResult.value : null;
  const newsArticles = newsData?.articles || [];

  if (reportResult.status === 'rejected') console.error('[MorningBriefing] Report failed:', reportResult.reason?.message);
  if (sentimentResult.status === 'rejected') console.error('[MorningBriefing] Sentiment failed:', sentimentResult.reason?.message);
  if (newsResult.status === 'rejected') console.error('[MorningBriefing] News failed:', newsResult.reason?.message);

  // Get Gemini narrative (optional — falls back to rule-based if it fails)
  let geminiSummary = null;
  if (report) {
    geminiSummary = await getGeminiNarrative(report, newsArticles);
    if (geminiSummary) console.log('[MorningBriefing] Gemini narrative OK');
    else console.log('[MorningBriefing] Gemini failed, using rule-based narrative');
  }

  // Build message
  const header = `☀️ *MORNING BRIEF* — ${fmtDate()}`;
  const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  const sections = [
    header,
    divider,
    report ? buildFutures(report) : '',
    sentiment ? buildSentiment(sentiment) : '',
    report ? buildNarrative(report, geminiSummary) : '',
    report ? buildGaps(report) : '',
    report ? buildCatalysts(report.catalysts, newsArticles) : buildCatalysts([], newsArticles),
    newsArticles.length > 0 ? buildTopNews(newsArticles) : '',
    divider,
    `🕐 ${fmtTime()} ET`,
  ].filter(s => s && s.length > 0);

  const message = sections.join('\n\n');

  console.log(`[MorningBriefing] Sending message (${message.length} chars)...`);
  console.log('\n--- PREVIEW ---\n' + message + '\n--- END ---\n');

  try {
    execFileSync(WACLI, ['send', 'text', '--to', WHATSAPP_JID, '--message', message], {
      timeout: 30000,
      encoding: 'utf-8',
      env: { ...process.env, PATH: `/opt/homebrew/bin:${process.env.PATH}` },
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[MorningBriefing] Sent successfully in ${elapsed}s`);
  } catch (e) {
    console.error('[MorningBriefing] Failed to send WhatsApp message:', e.message);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('[MorningBriefing] Fatal error:', e);
  process.exit(1);
});
