import { execSync } from 'child_process';
import { callGemini } from '../services/whisperService.js';
import { scrapeMarketBriefing } from './marketBriefing.js';
import { scanGaps } from './gapScanner.js';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ── Yahoo Finance v8 chart API via curl (no crumb needed) ──

function fetchChartData(symbol) {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
    const raw = execSync(
      `curl -sL -H "User-Agent: Mozilla/5.0" "${url}"`,
      { timeout: 10000, encoding: 'utf-8' }
    );
    const json = JSON.parse(raw);
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice;

    // Get yesterday's close and today's open from actual bar data
    const quote = result.indicators?.quote?.[0];
    const closes = quote?.close || [];
    const opens = quote?.open || [];

    // Yesterday's close = second-to-last bar's close
    // Today's open = last bar's open
    const yesterdayClose = closes.length >= 2 ? closes[closes.length - 2] : null;
    const todayOpen = opens.length > 0 ? opens[opens.length - 1] : null;

    // Fall back to chartPreviousClose only for futures/indices (single bar)
    const prevClose = yesterdayClose || meta.chartPreviousClose || meta.previousClose;
    if (!price || !prevClose) return null;

    const changePct = ((price - prevClose) / prevClose) * 100;

    return {
      symbol: meta.symbol,
      name: meta.shortName || meta.symbol,
      price,
      prevClose,
      todayOpen,
      change: price - prevClose,
      changePct,
      preMarketPrice: meta.preMarketPrice || null,
      postMarketPrice: meta.postMarketPrice || null,
    };
  } catch {
    return null;
  }
}

function fetchMultipleCharts(symbols) {
  const results = {};
  for (const sym of symbols) {
    const data = fetchChartData(sym);
    if (data) results[data.symbol] = data;
  }
  return results;
}

// ── Fetch futures & international indices ──
function fetchMarketData() {
  const symbols = [
    'ES=F', 'NQ=F', 'YM=F',           // US futures
    '^GSPC', '^IXIC', '^DJI',           // US indices
    '^N225', '^HSI', '^FTSE', '^GDAXI', // International
    '^VIX',                               // Volatility
  ];
  console.log('[PreMarketReport] Fetching market data for', symbols.length, 'symbols...');
  return fetchMultipleCharts(symbols);
}

// ── Extract catalysts from real news headlines ──

// Known ticker-to-company mappings for headline matching
const COMPANY_TICKERS = {
  'apple': 'AAPL', 'nvidia': 'NVDA', 'tesla': 'TSLA', 'microsoft': 'MSFT',
  'google': 'GOOGL', 'alphabet': 'GOOGL', 'amazon': 'AMZN', 'meta': 'META',
  'facebook': 'META', 'walmart': 'WMT', 'boeing': 'BA', 'intel': 'INTC',
  'amd': 'AMD', 'broadcom': 'AVGO', 'palantir': 'PLTR', 'coinbase': 'COIN',
  'netflix': 'NFLX', 'disney': 'DIS', 'moderna': 'MRNA', 'pfizer': 'PFE',
  'berkshire': 'BRK.B', 'jpmorgan': 'JPM', 'goldman': 'GS', 'salesforce': 'CRM',
  'snowflake': 'SNOW', 'crowdstrike': 'CRWD', 'palo alto': 'PANW',
  'uber': 'UBER', 'spotify': 'SPOT', 'shopify': 'SHOP', 'snap': 'SNAP',
  'pinterest': 'PINS', 'reddit': 'RDDT', 'oracle': 'ORCL', 'servicenow': 'NOW',
  'supermicro': 'SMCI', 'samsung': 'SSNLF', 'taiwan semi': 'TSM', 'tsmc': 'TSM',
  'applovin': 'APP', 'opendoor': 'OPEN', 'hubspot': 'HUBS', 'rocket lab': 'RKLB',
  'deere': 'DE', 'caterpillar': 'CAT', 'exxon': 'XOM', 'chevron': 'CVX',
  'lockheed': 'LMT', 'raytheon': 'RTX', 'northrop': 'NOC',
};

const CATALYST_PATTERNS = [
  { pattern: /\bearnings?\b|\bEPS\b|\brevenue\b|\bquarter(ly)?\b|\bbeat[s]?\b|\bmiss(es|ed)?\b|\bguidance\b|\boutlook\b|\bforecast\b/i, type: 'EARNINGS' },
  { pattern: /\bFDA\b|\bapproval\b|\bdrug\b|\btrial\b|\bphase\s*[123]\b|\bclinical\b|\bBLA\b|\bNDA\b/i, type: 'FDA' },
  { pattern: /\bupgrade[sd]?\b|\bprice target\s*(raise|hike|increase)\b|\boverweight\b|\boutperform\b/i, type: 'UPGRADE' },
  { pattern: /\bdowngrade[sd]?\b|\bprice target\s*(cut|lower|reduce)\b|\bunderweight\b|\bunderperform\b/i, type: 'DOWNGRADE' },
  { pattern: /\bguidance\b|\bforecast\b|\boutlook\b|\braise[sd]?\b.*\bguidance\b|\blower[sd]?\b.*\bguidance\b/i, type: 'GUIDANCE' },
  { pattern: /\bM&A\b|\bacquir[es]\b|\bacquisition\b|\bmerger\b|\bbuyout\b|\btakeover\b|\bbid\b/i, type: 'M&A' },
  { pattern: /\boffering\b|\bIPO\b|\bsecondary\b|\bdilut(ion|ive)\b|\bshelf\b/i, type: 'OFFERING' },
  { pattern: /\bfiling\b|\bSEC\b|\b13[FDG]\b|\bantitrust\b|\blawsuit\b|\bsue[sd]?\b/i, type: 'FILING' },
  { pattern: /\bactivist\b|\bstake\b|\bboard seat\b|\bproxy\b/i, type: 'ACTIVIST' },
  { pattern: /\bjobs?\b|\binflation\b|\bCPI\b|\bPPI\b|\bFed\b|\bFOMC\b|\brate[s]?\b|\bGDP\b|\bunemployment\b/i, type: 'DATA' },
];

function extractCatalysts(headlines) {
  const seen = new Set();
  const catalysts = [];
  // Skip generic market indices/ETFs — not useful as catalysts
  const SKIP_TICKERS = new Set(['SPY', 'QQQ', 'DIA', 'IWM', 'SPX', 'DJI', 'VIX']);

  // Process news headlines first (more reliable), then X posts
  const isXPost = (h) => h.source?.startsWith('@') || h.source === 'X' || h.source === 'x';
  const newsHeadlines = headlines.filter(h => !isXPost(h));
  const xHeadlines = headlines.filter(h => isXPost(h));
  const ordered = [...newsHeadlines, ...xHeadlines];

  for (const h of ordered) {
    const title = h.title || '';
    if (!title || title.length < 20) continue;

    // Find tickers in this headline
    const tickerMatches = [];

    // Match $TICKER pattern
    const dollarTickers = title.match(/\$([A-Z]{1,5})\b/g);
    if (dollarTickers) {
      for (const t of dollarTickers) {
        const sym = t.replace('$', '');
        if (!SKIP_TICKERS.has(sym)) tickerMatches.push(sym);
      }
    }

    // Match company names to tickers
    const titleLower = title.toLowerCase();
    for (const [company, ticker] of Object.entries(COMPANY_TICKERS)) {
      if (titleLower.includes(company) && !SKIP_TICKERS.has(ticker)) {
        if (!tickerMatches.includes(ticker)) tickerMatches.push(ticker);
      }
    }

    if (tickerMatches.length === 0) continue;

    // For X posts with 4+ tickers, skip (listicles)
    if (isXPost(h) && tickerMatches.length > 3) continue;

    // Determine catalyst type from headline content
    let type = 'DATA';
    for (const { pattern, type: t } of CATALYST_PATTERNS) {
      if (pattern.test(title)) {
        type = t;
        break;
      }
    }

    // For news headlines: only take the first ticker (the main subject)
    // For X posts: take only the first ticker
    const ticker = tickerMatches[0];
    if (seen.has(ticker)) continue;
    seen.add(ticker);

    // Clean description: strip " - Source Name" suffix from news headlines
    let desc = title.replace(/\s*[-–—]\s*[A-Z][\w\s&'.,:!?]+$/, '').trim();
    // Also strip HTML entities
    desc = desc.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    if (desc.length > 120) desc = desc.slice(0, 117) + '...';

    catalysts.push({ ticker, type, description: desc, source: h.source || '' });
    if (catalysts.length >= 10) return catalysts;
  }

  return catalysts;
}

// ── Main report generator ──
let cache = { data: null, expiry: 0 };

export async function generatePreMarketReport() {
  const now = Date.now();
  if (cache.data && now < cache.expiry) {
    return cache.data;
  }

  console.log('[PreMarketReport] Generating report with live data...');

  // Fetch news in parallel with Yahoo data (news doesn't use Yahoo)
  const newsPromise = scrapeMarketBriefing().catch(() => ({ google: [], x: [] }));

  // Fetch market data (Yahoo for futures/indices) + Polygon for stock gaps
  let market = {};
  let gaps = { gappingUp: [], gappingDown: [] };
  try {
    market = fetchMarketData();
  } catch (e) {
    console.error('[PreMarketReport] Yahoo market data error:', e.message);
  }
  try {
    const polygonGaps = await scanGaps();
    const toGapper = (g) => ({
      ticker: g.ticker,
      change: (g.gapPct >= 0 ? '+' : '') + g.gapPct.toFixed(1) + '%',
      changePct: g.gapPct,
      open: g.open,
      prevClose: g.prevClose,
    });
    gaps = {
      gappingUp:   (polygonGaps.gapUps   || []).map(toGapper),
      gappingDown: (polygonGaps.gapDowns || []).map(toGapper),
    };
    console.log('[PreMarketReport] Polygon gaps:', gaps.gappingUp.length, 'up,', gaps.gappingDown.length, 'down');
  } catch (e) {
    console.error('[PreMarketReport] Polygon gap data error:', e.message);
  }

  const news = await newsPromise;

  // Build news context for Gemini
  const headlines = [
    ...(news.news || []).slice(0, 15),
    ...(news.trading || []).slice(0, 10),
  ];
  const newsContext = headlines.length > 0
    ? headlines.map((h, i) => `${i + 1}. [${h.source}] ${h.title}`).join('\n')
    : '(No headlines available)';

  // Build market data context for Gemini
  const fmt = (sym) => {
    const d = market[sym];
    if (!d) return 'N/A';
    const sign = d.changePct >= 0 ? '+' : '';
    return `${d.name}: ${d.price?.toFixed(2)} (${sign}${d.changePct?.toFixed(2)}%)`;
  };

  const marketContext = `
US FUTURES (LIVE):
- ${fmt('ES=F')}
- ${fmt('NQ=F')}
- ${fmt('YM=F')}

US INDICES:
- ${fmt('^GSPC')}
- ${fmt('^IXIC')}
- ${fmt('^DJI')}

INTERNATIONAL:
- ${fmt('^N225')}
- ${fmt('^HSI')}
- ${fmt('^FTSE')}
- ${fmt('^GDAXI')}

VIX: ${market['^VIX'] ? market['^VIX'].price?.toFixed(2) : 'N/A'}

TOP MOVERS FROM WATCHLIST (LIVE):
Gapping Up: ${gaps.gappingUp.slice(0, 15).map(g => `${g.ticker} ${g.change}`).join(', ') || 'None significant'}
Gapping Down: ${gaps.gappingDown.slice(0, 15).map(g => `${g.ticker} ${g.change}`).join(', ') || 'None significant'}
`.trim();

  const est = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  const estDate = new Date(est);
  const dateStr = estDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = estDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Extract catalysts from news headlines first
  let catalysts = extractCatalysts(headlines);

  // Use Gemini for narrative + catalyst extraction from headlines
  const prompt = `You are a senior market strategist writing a pre-market briefing for active traders.
Today is ${dateStr}. Current time: ${timeStr} ET.

LIVE MARKET DATA:
${marketContext}

TODAY'S NEWS HEADLINES:
${newsContext}

Based on the LIVE DATA above, write a brief market narrative as valid JSON (no markdown, no code fences, just raw JSON):
{
  "summary": "2-3 sentences synthesizing the overnight action, key theme, and what traders should watch today. Reference the actual futures moves and key movers from the data above.",
  "geopoliticalAlert": "One sentence ONLY if there's a major geopolitical event in the headlines above, otherwise null",
  "keyEarnings": "Summarize any earnings-related headlines from the news above and their market impact. If no earnings news, say so briefly.",
  "catalysts": [{"ticker": "SYMBOL", "type": "TYPE", "description": "what happened based on headlines above"}]
}

IMPORTANT for catalysts:
- Extract 3-8 catalysts ONLY from the news headlines provided above. Do NOT invent or hallucinate news.
- Each catalyst must be directly traceable to a specific headline above.
- Use types: EARNINGS, FDA, UPGRADE, DOWNGRADE, GUIDANCE, DATA, FILING, M&A, ACTIVIST, OFFERING
- The description should summarize the actual headline, not guess.
Return ONLY valid JSON.`;

  let narrative = { summary: '', geopoliticalAlert: null, keyEarnings: '', catalysts: [] };

  try {
    const text = await callGemini(prompt);
    if (text) {
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      narrative = JSON.parse(cleaned);
    }
  } catch (e) {
    console.error('[PreMarketReport] Gemini narrative error:', e.message);
  }

  // Rule-based narrative fallback when Gemini fails or returns nothing
  if (!narrative.summary) {
    const sp  = market['ES=F'];
    const nq  = market['NQ=F'];
    const vix = market['^VIX'];
    const spPct = sp?.changePct;

    const tone = spPct == null ? 'mixed'
      : spPct <= -1.5 ? 'sharply lower'
      : spPct <= -0.5 ? 'risk-off'
      : spPct >= 1.5  ? 'sharply higher'
      : spPct >= 0.5  ? 'risk-on'
      : 'flat';

    const parts = [];
    if (sp)  parts.push(`S&P futures ${spPct >= 0 ? '+' : ''}${spPct?.toFixed(2)}% at ${sp.price?.toLocaleString()}`);
    if (nq)  parts.push(`NASDAQ ${nq.changePct >= 0 ? '+' : ''}${nq.changePct?.toFixed(2)}%`);
    if (vix) parts.push(`VIX ${vix.price?.toFixed(1)} (${vix.changePct >= 0 ? '+' : ''}${vix.changePct?.toFixed(1)}%)`);

    const topUp   = gaps.gappingUp.slice(0, 3).map(g => `${g.ticker} +${g.changePct.toFixed(1)}%`).join(', ');
    const topDown = gaps.gappingDown.slice(0, 3).map(g => `${g.ticker} ${g.changePct.toFixed(1)}%`).join(', ');
    const gapNote = (topUp || topDown)
      ? ` Notable movers: ${[topUp, topDown].filter(Boolean).join(' | ')}.`
      : '';

    narrative.summary = `Futures pointing ${tone}. ${parts.join(', ')}.${gapNote}`;
  }

  // Merge: prefer regex-extracted catalysts, supplement with Gemini catalysts
  // Merge Gemini catalysts if we didn't extract enough from headlines
  const SKIP_CATALYST_TICKERS = new Set([
    'N/A', 'SPY', 'QQQ', 'DIA', 'IWM', 'SPX', 'DJI', 'VIX', '',
    'MARKET', 'OIL', 'GOLD', 'USD', 'BONDS', 'CRYPTO', 'BTC',
  ]);
  const isValidTicker = (t) => t && !SKIP_CATALYST_TICKERS.has(t) && /^[A-Z]{1,5}$/.test(t);

  if (catalysts.length < 3 && narrative.catalysts?.length > 0) {
    const seen = new Set(catalysts.map(c => c.ticker));
    for (const c of narrative.catalysts) {
      if (!isValidTicker(c.ticker)) continue;
      if (!seen.has(c.ticker) && c.type && c.description) {
        seen.add(c.ticker);
        catalysts.push(c);
      }
      if (catalysts.length >= 10) break;
    }
  }
  // Final filter
  catalysts = catalysts.filter(c => isValidTicker(c.ticker));

  // Build final report with REAL data
  const fmtIndex = (sym, label) => {
    const d = market[sym];
    if (!d) return null;
    const sign = d.changePct >= 0 ? '+' : '';
    return `${label} ${sign}${d.changePct?.toFixed(2)}% at ${d.price?.toLocaleString()}`;
  };

  const result = {
    macroNarrative: {
      summary: narrative.summary || 'Market data loaded. Narrative unavailable.',
      geopoliticalAlert: narrative.geopoliticalAlert || null,
      keyEarnings: narrative.keyEarnings || null,
      asia: fmtIndex('^N225', 'Nikkei') && fmtIndex('^HSI', 'Hang Seng')
        ? `${fmtIndex('^N225', 'Nikkei')}; ${fmtIndex('^HSI', 'Hang Seng')}.`
        : null,
      europe: fmtIndex('^FTSE', 'FTSE 100') && fmtIndex('^GDAXI', 'DAX')
        ? `${fmtIndex('^FTSE', 'FTSE 100')}; ${fmtIndex('^GDAXI', 'DAX')}.`
        : null,
    },
    futures: {
      sp500: market['ES=F'] ? { price: market['ES=F'].price, changePct: market['ES=F'].changePct } : null,
      nasdaq: market['NQ=F'] ? { price: market['NQ=F'].price, changePct: market['NQ=F'].changePct } : null,
      dow: market['YM=F'] ? { price: market['YM=F'].price, changePct: market['YM=F'].changePct } : null,
      vix: market['^VIX'] ? { price: market['^VIX'].price, changePct: market['^VIX'].changePct } : null,
    },
    gapScanner: {
      gappingUp: gaps.gappingUp.slice(0, 15),
      gappingDown: gaps.gappingDown.slice(0, 15),
    },
    catalysts,
    generatedAt: new Date().toISOString(),
    success: true,
  };

  cache = { data: result, expiry: now + 10 * 60 * 1000 }; // 10-min cache
  return result;
}
