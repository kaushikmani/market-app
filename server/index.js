import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { scrapeNews } from './scrapers/news.js';
import { scrapeFinvizQuote } from './scrapers/finvizQuote.js';
import { scrapeFinvizPeers } from './scrapers/finvizPeers.js';
import { fetchSMAs } from './scrapers/yahooSMA.js';
import { scrapeGoogleNews } from './scrapers/googleNews.js';
import { scrapeFinvizNews } from './scrapers/finvizNews.js';
import { scrapeXPosts, getXFeed } from './scrapers/xNews.js';
import { scrapeMarketBriefing } from './scrapers/marketBriefing.js';
import { scanWatchlist } from './scrapers/watchlistScanner.js';
import { closeBrowser, openLoginBrowser } from './scrapers/browser.js';
import { generateEarningsPreview } from './services/whisperService.js';
import { generatePreMarketReport } from './scrapers/preMarketReport.js';
import { fetchThemePerformance } from './scrapers/themePerformance.js';
import { fetchSubstackFeed } from './scrapers/substackFeed.js';
import { scrapePreMarketMovers } from './scrapers/preMarketMovers.js';
import { scanGaps } from './scrapers/gapScanner.js';
import { fetchWatchlistPrices } from './scrapers/watchlistPrices.js';
import { runAlertCheck, getRecentTriggers, clearTrigger } from './services/alertMonitor.js';
import { fetchEarningsCalendar } from './scrapers/earningsCalendar.js';
import { fetchMarketSentiment } from './scrapers/marketSentiment.js';
import { callGemini } from './services/whisperService.js';
import notesRouter from './routes/notes.js';
import { WATCHLIST } from './data/watchlist.js';
import { getQuotes, getMarketStatus as schwabMarketStatus } from './services/schwab.js';
import { fetchEarningsHistory } from './scrapers/earningsHistory.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Rate limiting ─────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 120,                  // 120 requests per minute per IP (2/sec average)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});
// Stricter limit for expensive AI/scrape endpoints
const heavyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests for this endpoint.' },
});
app.use('/api/', apiLimiter);

// ── Disk cache — persists slow data across server restarts ────────────────────
const DISK_CACHE_DIR = path.join(__dirname, 'data', 'page-cache');
if (!fs.existsSync(DISK_CACHE_DIR)) fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });

// maxAgeMs: if provided, returns null when the cached file is older than maxAgeMs
function loadDiskCache(name, maxAgeMs) {
  try {
    const p = path.join(DISK_CACHE_DIR, `${name}.json`);
    if (!fs.existsSync(p)) return null;
    if (maxAgeMs) {
      const age = Date.now() - fs.statSync(p).mtimeMs;
      if (age > maxAgeMs) return null;
    }
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch { return null; }
}

function saveDiskCache(name, data) {
  try { fs.writeFileSync(path.join(DISK_CACHE_DIR, `${name}.json`), JSON.stringify(data)); }
  catch { /* ignore write errors */ }
}

app.use(cors());
app.use(express.json());

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.use('/api/uploads', express.static(path.join(__dirname, 'data', 'notes', 'uploads')));
app.use('/api', notesRouter);

// ── Input validation helpers ──────────────────────────────────────────────────
function validateTicker(ticker) {
  if (!ticker) return 'Ticker is required';
  if (!/^[A-Z0-9.-]{1,10}$/i.test(ticker)) return 'Invalid ticker format';
  return null;
}

const VALID_ALERT_CONDITIONS = ['above', 'below', 'crosses_above', 'crosses_below'];

// Resolve absolute paths for data files so they work regardless of cwd
const alertsPath    = path.join(__dirname, 'data', 'alerts.json');
const alertStatePath = path.join(__dirname, 'data', 'alert-state.json');

function readAlerts() {
  try { return JSON.parse(fs.readFileSync(alertsPath, 'utf-8')); } catch { return []; }
}
function writeAlerts(alerts) {
  fs.writeFileSync(alertsPath, JSON.stringify(alerts, null, 2));
}
function readAlertState() {
  try { return JSON.parse(fs.readFileSync(alertStatePath, 'utf-8')); } catch { return {}; }
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ── Watchlist — single source of truth served from server/data/watchlist.js ──
app.get('/api/watchlist', (req, res) => {
  res.json({ success: true, watchlist: WATCHLIST });
});

// News — 10-minute in-memory cache + disk cache for cold starts
let newsCache = { data: loadDiskCache('news'), expiry: 0 };

app.get('/api/news', async (req, res) => {
  const now = Date.now();
  if (newsCache.data && now < newsCache.expiry) return res.json(newsCache.data);
  const disk = newsCache.data;
  if (disk) res.json(disk);
  try {
    const data = await scrapeNews();
    newsCache = { data, expiry: now + 10 * 60 * 1000 };
    if (data?.success && data.articles?.length > 0) saveDiskCache('news', data);
    if (!disk) res.json(data);
  } catch (error) {
    if (!disk) res.status(500).json({ error: error.message });
  }
});


app.get('/api/finviz-quote', async (req, res) => {
  const { ticker } = req.query;
  const tickerErr = validateTicker(ticker);
  if (tickerErr) return res.status(400).json({ error: tickerErr });

  try {
    const data = await scrapeFinvizQuote(ticker);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/finviz-peers', async (req, res) => {
  const { tickers } = req.query;
  if (!tickers) return res.status(400).json({ error: 'tickers query param required' });

  try {
    const data = await scrapeFinvizPeers(tickers);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stock-news', async (req, res) => {
  const { ticker } = req.query;
  const tickerErr = validateTicker(ticker);
  if (tickerErr) return res.status(400).json({ error: tickerErr });

  try {
    // Fetch all sources in parallel: Google News + Finviz News + X Posts
    const [googleRes, finvizRes, xRes] = await Promise.allSettled([
      scrapeGoogleNews(ticker),
      scrapeFinvizNews(ticker),
      scrapeXPosts(ticker),
    ]);

    const googleNews = googleRes.status === 'fulfilled' && googleRes.value.success ? googleRes.value.news : [];
    const finvizNews = finvizRes.status === 'fulfilled' && finvizRes.value.success ? finvizRes.value.news : [];
    const xPosts     = xRes.status === 'fulfilled' && xRes.value.success ? xRes.value.news : [];

    res.json({
      ticker: ticker.toUpperCase(),
      google: googleNews,
      finviz: finvizNews,
      x: xPosts,
      polygon: [], // removed — no longer using Polygon
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/market-briefing', async (req, res) => {
  const disk = loadDiskCache('market-briefing');
  if (disk) res.json(disk);
  try {
    const data = await scrapeMarketBriefing();
    if (data) {
      saveDiskCache('market-briefing', data);
      if (!disk) res.json(data);
    } else if (!disk) {
      res.status(500).json({ error: 'Failed to scrape market briefing' });
    }
  } catch (error) {
    if (!disk) res.status(500).json({ error: error.message });
  }
});

app.get('/api/sma', async (req, res) => {
  const { ticker } = req.query;
  const tickerErr = validateTicker(ticker);
  if (tickerErr) return res.status(400).json({ error: tickerErr });

  try {
    const data = await fetchSMAs(ticker);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/earnings-preview', heavyLimiter, async (req, res) => {
  const { ticker } = req.query;
  const tickerErr = validateTicker(ticker);
  if (tickerErr) return res.status(400).json({ error: tickerErr });

  try {
    // Fetch finviz data for context
    let context = {};
    try {
      const fData = await scrapeFinvizQuote(ticker);
      if (fData?.success && fData.fundamentals) {
        const f = fData.fundamentals;
        const earningsKey = Object.keys(f).find(k => k.endsWith('Earnings') || k === 'Earnings');
        context = {
          price: fData.price,
          earningsDate: earningsKey ? f[earningsKey] : null,
          sector: fData.sector,
          industry: fData.industry,
          eps: f['EPS (ttm)'],
          pe: f['P/E'],
        };
      }
    } catch { /* ignore — generate preview with empty context */ }

    const data = await generateEarningsPreview(ticker, context);
    if (!data) {
      return res.status(500).json({ error: 'Failed to generate earnings preview' });
    }
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pre-market-report', async (req, res) => {
  // Serve disk cache immediately if in-memory is cold, refresh in background
  // Max age: 12 hours — prevents serving a report from yesterday indefinitely
  const diskPmr = loadDiskCache('pre-market-report', 12 * 60 * 60 * 1000);
  if (diskPmr) res.json(diskPmr);
  try {
    const data = await generatePreMarketReport();
    if (data) {
      const narrative = data.macroNarrative?.summary || '';
      if (narrative && narrative !== 'Market data loaded. Narrative unavailable.') {
        saveDiskCache('pre-market-report', data);
      }
      if (!diskPmr) res.json(data);
    } else if (!diskPmr) {
      res.status(500).json({ error: 'Failed to generate pre-market report' });
    }
  } catch (error) {
    if (!diskPmr) res.status(500).json({ error: error.message });
  }
});

app.get('/api/theme-performance', async (req, res) => {
  const range = req.query.range || 'today';
  try {
    const data = await fetchThemePerformance(range);
    if (!data) return res.status(500).json({ error: 'Failed to fetch theme performance' });
    res.json(data);
  } catch (error) {
    const isAuth = error.message?.includes('401') || error.message?.includes('API Key');
    res.status(isAuth ? 503 : 500).json({
      error: isAuth ? 'Market data unavailable: POLYGON_API_KEY not configured' : error.message,
    });
  }
});

app.get('/api/substack-feed', async (req, res) => {
  try {
    const data = await fetchSubstackFeed();
    if (!data) {
      return res.status(500).json({ error: 'Failed to fetch Substack feed' });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/earnings-calendar', async (req, res) => {
  const disk = loadDiskCache('earnings-calendar');
  if (disk) res.json(disk);
  try {
    const data = await fetchEarningsCalendar();
    if (data) {
      const hasEarnings = (data.thisWeek?.length || 0) + (data.nextWeek?.length || 0) > 0;
      if (hasEarnings) saveDiskCache('earnings-calendar', data);
      if (!disk) res.json(data);
    } else if (!disk) {
      res.status(500).json({ error: 'Earnings calendar unavailable' });
    }
  } catch (error) {
    if (!disk) res.status(500).json({ error: error.message });
  }
});

app.get('/api/market-sentiment', async (req, res) => {
  const disk = loadDiskCache('market-sentiment');
  if (disk) res.json(disk);
  try {
    const data = await fetchMarketSentiment();
    if (data) {
      if (data.score != null || data.rating) saveDiskCache('market-sentiment', data);
      if (!disk) res.json(data);
    } else if (!disk) {
      res.status(500).json({ error: 'Sentiment unavailable' });
    }
  } catch (error) {
    if (!disk) res.status(500).json({ error: error.message });
  }
});

// Alerts — poll for recent triggers, then clear them
app.get('/api/alerts/triggered', (req, res) => {
  const triggers = getRecentTriggers();
  res.json({ triggers });
});
app.delete('/api/alerts/triggered/:id', (req, res) => {
  clearTrigger(req.params.id);
  res.json({ success: true });
});

// Alerts CRUD
app.get('/api/alerts', (req, res) => {
  try {
    const alerts = readAlerts();
    const state  = readAlertState();
    res.json({ success: true, alerts: alerts.map(a => ({ ...a, lastSent: state[a.id]?.lastSent || null })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/alerts', (req, res) => {
  try {
    const { ticker, condition, price } = req.body;
    const tickerErr = validateTicker(ticker);
    if (tickerErr) return res.status(400).json({ error: tickerErr });
    if (!VALID_ALERT_CONDITIONS.includes(condition))
      return res.status(400).json({ error: `condition must be one of: ${VALID_ALERT_CONDITIONS.join(', ')}` });
    const numPrice = parseFloat(price);
    if (!isFinite(numPrice) || numPrice <= 0)
      return res.status(400).json({ error: 'price must be a positive number' });

    const alerts = readAlerts();
    const newAlert = {
      ticker: ticker.toUpperCase(),
      condition,
      price: numPrice,
      id: `${ticker.toLowerCase()}-${condition}-${Date.now()}`,
      enabled: true,
    };
    alerts.push(newAlert);
    writeAlerts(alerts);
    res.json({ success: true, alert: newAlert });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/alerts/:id', (req, res) => {
  try {
    const alerts = readAlerts();
    const idx = alerts.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Alert not found' });
    // Only allow toggling enabled; prevent overwriting id/ticker/condition/price
    const { enabled } = req.body;
    if (enabled !== undefined) alerts[idx].enabled = Boolean(enabled);
    writeAlerts(alerts);
    res.json({ success: true, alert: alerts[idx] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/alerts/:id', (req, res) => {
  try {
    const alerts = readAlerts().filter(a => a.id !== req.params.id);
    writeAlerts(alerts);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Ask AI — conversational stock analysis
app.post('/api/ask', async (req, res) => {
  const { ticker, question, context } = req.body;
  if (!ticker || !question) return res.status(400).json({ error: 'ticker and question required' });

  try {
    const prompt = `You are a concise, sharp trading analyst. Answer the following question about ${ticker}.

Stock context:
${context || 'No additional context provided.'}

Question: ${question}

Answer in 2-4 sentences max. Be direct, specific, and actionable. No fluff. If you don't have enough data, say so briefly.`;

    const answer = await callGemini(prompt);
    if (!answer) return res.status(503).json({ error: 'AI unavailable' });
    res.json({ success: true, answer: answer.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// News sentiment batch scoring
app.post('/api/news-sentiment', async (req, res) => {
  const { headlines } = req.body;
  if (!headlines?.length) return res.json({ scores: [] });

  try {
    const prompt = `Score each headline as Bullish, Bearish, or Neutral with a confidence 1-10.
Return ONLY a JSON array: [{"index":0,"sentiment":"Bullish","score":8}, ...]

Headlines:
${headlines.map((h, i) => `${i}. ${h}`).join('\n')}`;

    const raw = await callGemini(prompt);
    if (!raw) return res.json({ scores: [] });
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const scores = JSON.parse(cleaned);
    res.json({ success: true, scores });
  } catch {
    res.json({ scores: [] });
  }
});

// Gap scanner with 90-second in-memory cache + disk cache for cold starts
let gapScannerCache = { data: loadDiskCache('gap-scanner'), expiry: 0 };

app.get('/api/gap-scanner', async (req, res) => {
  const now = Date.now();
  if (gapScannerCache.data && now < gapScannerCache.expiry) {
    return res.json(gapScannerCache.data);
  }
  const disk = gapScannerCache.data; // stale disk cache (expiry already 0)
  if (disk) res.json(disk);
  try {
    const data = await scanGaps();
    gapScannerCache = { data, expiry: now + 90 * 1000 };
    const hasGaps = (data?.gapUps?.length || 0) + (data?.gapDowns?.length || 0) > 0;
    if (data?.success && hasGaps) saveDiskCache('gap-scanner', data);
    if (!disk) res.json(data);
  } catch (error) {
    if (!disk) {
      const isAuth = error.message?.includes('401') || error.message?.includes('API Key');
      res.status(isAuth ? 503 : 500).json({
        error: isAuth ? 'Market data unavailable: POLYGON_API_KEY not configured' : error.message,
      });
    }
  }
});

// Pre-market movers with 10-minute cache
let preMarketMoversCache = { data: null, expiry: 0 };

app.get('/api/pre-market-movers', async (req, res) => {
  try {
    const now = Date.now();
    if (preMarketMoversCache.data && now < preMarketMoversCache.expiry) {
      return res.json(preMarketMoversCache.data);
    }

    const data = await scrapePreMarketMovers();
    preMarketMoversCache = { data, expiry: now + 10 * 60 * 1000 };
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Watchlist scanner with 15-minute cache (disk-backed for instant cold-start)
let scanCache = { data: loadDiskCache('watchlist-scan'), expiry: Date.now() + 14 * 60 * 1000 };

app.get('/api/watchlist-scan', async (req, res) => {
  try {
    const now = Date.now();
    if (scanCache.data && now < scanCache.expiry) {
      return res.json(scanCache.data);
    }

    const data = await scanWatchlist();
    scanCache = { data, expiry: now + 15 * 60 * 1000 };
    if (data?.results?.length > 0) saveDiskCache('watchlist-scan', data);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/login', async (req, res) => {
  try {
    await closeBrowser();
    const ctx = await openLoginBrowser();
    res.json({ success: true, message: 'Login browser opened. Log into X, then close the browser window.' });
    // Wait for browser to close, then reset
    ctx.on('close', () => {
      console.log('[Login] Browser closed. Session saved.');
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(async () => {
    await closeBrowser();
    console.log('Server closed');
    process.exit(0);
  });
  // Force exit after 10s if server hasn't closed
  setTimeout(() => process.exit(1), 10_000);
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Background cache warming
async function refreshData(label, fn) {
  try {
    console.log(`[BGRefresh] Refreshing ${label}...`);
    const start = Date.now();
    await fn();
    console.log(`[BGRefresh] ${label} done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  } catch (e) {
    console.error(`[BGRefresh] ${label} failed:`, e.message);
  }
}

// Mutex for browser-dependent tasks (Market Briefing, Pre-Market Report, Substack)
// Chrome's persistent context only allows one instance at a time
let browserQueue = Promise.resolve();
function withBrowserLock(label, fn) {
  browserQueue = browserQueue.then(() => refreshData(label, fn));
  return browserQueue;
}

function startBackgroundRefresh() {
  // ── Startup warmup (all run immediately on server start) ──────────────────
  // Browser tasks run sequentially through the lock (Chrome only allows one at a time)
  setTimeout(() => withBrowserLock('Pre-Market Report', generatePreMarketReport), 0);
  setTimeout(() => withBrowserLock('Substack Feed', fetchSubstackFeed), 0);
  // X feed warmup — runs after Pre-Market Report so browser is already initialized
  // Retries every 2 min until tweets are found (browser needs a warm-up scrape first)
  const warmXFeed = () => withBrowserLock('X Feed', async () => {
    const feed = await getXFeed();
    if (feed.length === 0) setTimeout(warmXFeed, 2 * 60_000);
  });
  setTimeout(warmXFeed, 30_000);

  // Non-browser tasks run in parallel, staggered slightly to avoid burst
  setTimeout(() => refreshData('News', async () => {
    const data = await scrapeNews();
    if (data?.success && data.articles?.length > 0) {
      newsCache = { data, expiry: Date.now() + 10 * 60_000 };
      saveDiskCache('news', data);
    }
  }), 2_000);

  setTimeout(() => refreshData('Market Sentiment', async () => {
    const data = await fetchMarketSentiment();
    if (data?.fearGreed?.score != null) saveDiskCache('market-sentiment', data);
  }), 3_000);

  setTimeout(() => refreshData('Gap Scanner', async () => {
    const data = await scanGaps();
    const hasGaps = (data?.gapUps?.length || 0) + (data?.gapDowns?.length || 0) > 0;
    if (data?.success && hasGaps) {
      gapScannerCache = { data, expiry: Date.now() + 90_000 };
      saveDiskCache('gap-scanner', data);
    }
  }), 4_000);

  setTimeout(() => refreshData('Earnings Calendar', async () => {
    const data = await fetchEarningsCalendar();
    const hasEarnings = (data?.thisWeek?.length || 0) + (data?.nextWeek?.length || 0) > 0;
    if (hasEarnings) saveDiskCache('earnings-calendar', data);
  }), 5_000);

  setTimeout(() => refreshData('Watchlist Scan', async () => {
    const data = await scanWatchlist();
    scanCache = { data, expiry: Date.now() + 15 * 60_000 };
    if (data?.results?.length > 0) saveDiskCache('watchlist-scan', data);
  }), 6_000);

  setTimeout(() => refreshData('Theme Performance', () => fetchThemePerformance('today')), 8_000);

  // ── Recurring intervals ───────────────────────────────────────────────────
  setInterval(() => withBrowserLock('Market Briefing', scrapeMarketBriefing), 14 * 60_000);
  setInterval(() => withBrowserLock('Pre-Market Report', generatePreMarketReport), 9 * 60_000);
  setInterval(() => withBrowserLock('Substack Feed', fetchSubstackFeed), 55 * 60_000);

  setInterval(() => refreshData('News', async () => {
    const data = await scrapeNews();
    if (data?.success && data.articles?.length > 0) {
      newsCache = { data, expiry: Date.now() + 10 * 60_000 };
      saveDiskCache('news', data);
    }
  }), 10 * 60_000);

  setInterval(() => refreshData('Market Sentiment', async () => {
    const data = await fetchMarketSentiment();
    if (data?.fearGreed?.score != null) saveDiskCache('market-sentiment', data);
  }), 15 * 60_000);

  setInterval(() => refreshData('Gap Scanner', async () => {
    const data = await scanGaps();
    const hasGaps = (data?.gapUps?.length || 0) + (data?.gapDowns?.length || 0) > 0;
    if (data?.success && hasGaps) {
      gapScannerCache = { data, expiry: Date.now() + 90_000 };
      saveDiskCache('gap-scanner', data);
    }
  }), 2 * 60_000);

  setInterval(() => refreshData('Watchlist Scan', async () => {
    const data = await scanWatchlist();
    scanCache = { data, expiry: Date.now() + 15 * 60_000 };
    if (data?.results?.length > 0) saveDiskCache('watchlist-scan', data);
  }), 14 * 60_000);

  setInterval(() => refreshData('Theme Performance', () => fetchThemePerformance('today')), 28 * 60_000);

  // Price alerts — check every 5 minutes
  setInterval(() => runAlertCheck(), 5 * 60_000);
}

// ── Production static file serving ───────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// ── Watchlist prices ──────────────────────────────────────────────────────────
let watchlistPricesCache = { data: null, expiry: 0 };
const ALL_WATCHLIST_TICKERS = [
  'SPY','QQQ','IWM','DIA','GLD','SLV','XLK','XLC','XLV','IGV','ARKG','NAIL','EWY','EWZ','ILF',
  'NVDA','TSLA','AAPL','MSFT','GOOGL','AMZN','META',
  'CRWD','PANW','FTNT','ZS','OKTA','S','RBRK',
  'MU','WDC','STX','SNDK','PSTG',
  'AMD','INTC','ARM','AVGO','MRVL','TXN','ADI','ON','TSM','GFS',
  'ASML','LRCX','KLAC','AMAT','AMKR','ICHR','FORM','CAMT','TER',
  'ALAB','CRDO','INDI','SOLS',
  'ANET','CIEN','LITE','APH','FN','POET','SKYT','AXTI','COHR','AAOI','GLW',
  'SMCI','VRT','DELL','HPE','CLS','SANM','FLEX','WYFI','AEHR','PLAB',
  'PLTR','ORCL','CRM','NOW','ADBE','TEAM','WDAY','HUBS','MDB','MNDY','SNOW','DDOG','NET','PATH',
  'MSTR','COIN','HOOD','MARA','RIOT','HUT','IREN','WULF',
  'VST','CEG','LEU','CCJ','UUUU','UEC','NXE','OKLO','SMR','TLN','BWXT','NNE','GEV',
  'FSLR','ENPH','BE','PLUG','EOSE','SLDP','FLNC',
  'LMT','RTX','NOC','GD','LHX','DRS','KTOS','BA','AVAV','RCAT','ERJ',
  'RKLB','ASTS','PL','BKSY','LUNR','RDW',
  'SERV','RR','SYM','ZBRA','OUST','PDYN',
  'IONQ','RGTI','QBTS','QUBT',
  'FI','FISV','SOFI','ALLY','DFS','LMND',
  'V','MA','AXP','GS','JPM','BAC','C','SCHW','WFC',
  'BABA','BIDU','JD','PDD','FUTU',
  'LI','XPEV','RIVN','LCID','BLNK','CHPT',
  'ACHR','JOBY',
  'UNH','ABBV','JNJ','MRK','LLY','NVO','AMGN','MRNA','CRSP',
  'DHI','LEN','PHM','TOL','RKT','CBRE','DLR','EQIX',
  'RDDT','SNAP','PINS','SPOT','TTD','APP','DIS','NFLX',
  'HD','WMT','NKE','KO','PG','CAVA',
  'CMG','COCO','EAT','SHAK','WING',
  'ABNB','BKNG','EXPE','CCL','RCL','NCLH','DAL',
  'XOM','BP','SHEL','CVX','DVN','OXY',
  'DOW','CAT','HON','SCCO','FCX','ALB',
  'ABAT','AMPX','ENVX','MVST','QS',
  'AMC','GME','PTON',
];

app.get('/api/watchlist-prices', async (req, res) => {
  try {
    const now = Date.now();
    if (watchlistPricesCache.data && now < watchlistPricesCache.expiry) {
      return res.json(watchlistPricesCache.data);
    }
    const prices = await fetchWatchlistPrices(ALL_WATCHLIST_TICKERS);
    const data = { success: true, prices, fetchedAt: now };
    watchlistPricesCache = { data, expiry: now + 60 * 1000 };
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Market status from Schwab
app.get('/api/market-status', async (req, res) => {
  try {
    const data = await schwabMarketStatus();
    res.json({
      market:      data.isOpen ? 'open' : 'closed',
      isOpen:      data.isOpen,
      serverTime:  new Date().toISOString(),
      sessionHours: data.sessionHours,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Ticker reference data
app.get('/api/ticker-info', async (req, res) => {
  const { ticker } = req.query;
  const tickerErr = validateTicker(ticker);
  if (tickerErr) return res.status(400).json({ error: tickerErr });
  try {
    const quotes = await getQuotes([ticker.toUpperCase()]);
    const q = quotes[ticker.toUpperCase()] || {};
    res.json({
      price:     q.price,
      change:    q.change,
      changePct: q.changePct,
      volume:    q.volume,
      high52w:   q.high52w,
      low52w:    q.low52w,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Earnings history + expected move — cached per ticker for 4 hours
const earningsHistoryCache = new Map(); // ticker → { data, ts }
const EARNINGS_HISTORY_TTL = 4 * 60 * 60 * 1000;

app.get('/api/earnings-history', async (req, res) => {
  const { ticker } = req.query;
  const tickerErr = validateTicker(ticker);
  if (tickerErr) return res.status(400).json({ error: tickerErr });
  try {
    const upper = ticker.toUpperCase();
    const cached = earningsHistoryCache.get(upper);
    if (cached && Date.now() - cached.ts < EARNINGS_HISTORY_TTL) {
      return res.json(cached.data);
    }
    const data = await fetchEarningsHistory(upper);
    earningsHistoryCache.set(upper, { data, ts: Date.now() });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 404 & global error handlers ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, _next) => {
  console.error(`[ERROR] ${new Date().toISOString()} ${req.method} ${req.path}:`, err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`Stock Analyzer server running on http://localhost:${PORT}`);
  startBackgroundRefresh();
});
