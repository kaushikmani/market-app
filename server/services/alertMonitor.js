import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { polygonGet } from '../services/polygon.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALERTS_FILE  = path.join(__dirname, '../data/alerts.json');
const STATE_FILE   = path.join(__dirname, '../data/alert-state.json');

// ── Market hours check (9:30am–4pm ET, Mon-Fri) ──────────────────────────────
function isMarketHours() {
  const now = new Date();
  const et  = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const h = et.getHours();
  const m = et.getMinutes();
  const mins = h * 60 + m;
  return mins >= 9 * 60 + 30 && mins < 16 * 60; // 9:30am–4pm
}

// ── Fetch price + SMA via Polygon ────────────────────────────────────────────
async function fetchQuote(ticker) {
  try {
    const to   = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 260 * 86400000).toISOString().slice(0, 10);

    const [snap, aggs] = await Promise.all([
      polygonGet('/v2/snapshot/locale/us/markets/stocks/tickers', { tickers: ticker }),
      polygonGet(`/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${from}/${to}`, {
        adjusted: true, sort: 'asc', limit: 220,
      }),
    ]);

    const t = snap.tickers?.[0];
    const price = t?.lastTrade?.p || t?.day?.c;
    if (!price) return null;

    const closes = (aggs.results || []).map(r => r.c).filter(c => c != null).reverse();
    if (closes.length < 50) return null;

    const smas = {};
    for (const period of [20, 50, 100, 200]) {
      if (closes.length >= period) {
        smas[period] = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
      }
    }

    return { ticker: ticker.toUpperCase(), price, smas };
  } catch {
    return null;
  }
}

// ── Load / save state ────────────────────────────────────────────────────────
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ── Check a single alert against fetched data ────────────────────────────────
function checkAlert(alert, quote, state) {
  const { id, condition, period, threshold } = alert;
  const { price, smas, ticker } = quote;
  const sma = smas[period];

  if (!sma) return;

  const pctFromSma = ((price - sma) / sma) * 100;
  const absPct     = Math.abs(pctFromSma);

  let triggered = false;
  let message   = '';

  if (condition === 'near_sma') {
    // Within threshold% of the SMA (either side)
    triggered = absPct <= threshold;
    if (triggered) {
      const side = price >= sma ? 'above' : 'below';
      message = `[Alert] ${ticker} is near its ${period}-day SMA — Price: $${price.toFixed(2)}, SMA${period}: $${sma.toFixed(2)} (${pctFromSma > 0 ? '+' : ''}${pctFromSma.toFixed(2)}% ${side})`;
    }
  } else if (condition === 'cross_above_sma') {
    const prevPrice = state[id]?.lastPrice;
    if (prevPrice != null && prevPrice < sma && price >= sma) {
      triggered = true;
      message = `[Alert] ${ticker} crossed ABOVE its ${period}-day SMA — Price: $${price.toFixed(2)}, SMA${period}: $${sma.toFixed(2)}`;
    }
  } else if (condition === 'cross_below_sma') {
    const prevPrice = state[id]?.lastPrice;
    if (prevPrice != null && prevPrice > sma && price <= sma) {
      triggered = true;
      message = `[Alert] ${ticker} crossed BELOW its ${period}-day SMA — Price: $${price.toFixed(2)}, SMA${period}: $${sma.toFixed(2)}`;
    }
  } else if (condition === 'price_above') {
    triggered = price >= threshold;
    if (triggered) message = `[Alert] ${ticker} above $${threshold} — Price: $${price.toFixed(2)}`;
  } else if (condition === 'price_below') {
    triggered = price <= threshold;
    if (triggered) message = `[Alert] ${ticker} below $${threshold} — Price: $${price.toFixed(2)}`;
  }

  return { triggered, message };
}

// ── Main run loop ─────────────────────────────────────────────────────────────
export async function runAlertCheck() {
  if (!isMarketHours()) return;

  let alerts;
  try {
    alerts = JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf-8'));
  } catch {
    return;
  }

  const state   = loadState();
  const enabled = alerts.filter(a => a.enabled);
  if (enabled.length === 0) return;

  // Group by ticker to avoid duplicate fetches
  const tickers = [...new Set(enabled.map(a => a.ticker))];

  for (const ticker of tickers) {
    const quote = await fetchQuote(ticker);
    if (!quote) {
      console.log(`[Alerts] No data for ${ticker}`);
      continue;
    }

    const tickerAlerts = enabled.filter(a => a.ticker === ticker);

    for (const alert of tickerAlerts) {
      const { id, cooldownHours } = alert;
      const lastSent = state[id]?.lastSent;
      const cooldownMs = (cooldownHours || 4) * 60 * 60 * 1000;

      if (lastSent && Date.now() - lastSent < cooldownMs) {
        // Still in cooldown
        state[id] = { ...state[id], lastPrice: quote.price };
        continue;
      }

      const result = checkAlert(alert, quote, state);

      if (result?.triggered) {
        console.log(`[Alerts] Triggered: ${result.message}`);
        state[id] = { lastSent: Date.now(), lastPrice: quote.price };
      } else {
        state[id] = { ...(state[id] || {}), lastPrice: quote.price };
      }
    }
  }

  saveState(state);
}
