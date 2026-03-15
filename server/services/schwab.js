import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH   = path.join(__dirname, '../.env');
const BASE       = 'https://api.schwabapi.com';

// ── .env helpers ─────────────────────────────────────────────────────────────

function updateEnv(key, value) {
  try {
    let content = fs.readFileSync(ENV_PATH, 'utf-8');
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) content = content.replace(regex, `${key}=${value}`);
    else content += `\n${key}=${value}`;
    fs.writeFileSync(ENV_PATH, content);
    process.env[key] = String(value);
  } catch (e) {
    console.error('[Schwab] Failed to update .env:', e.message);
  }
}

// ── Token management ─────────────────────────────────────────────────────────

async function refreshAccessToken() {
  const clientId     = process.env.SCHWAB_CLIENT_ID;
  const clientSecret = process.env.SCHWAB_CLIENT_SECRET;
  const refreshToken = process.env.SCHWAB_REFRESH_TOKEN;

  if (!refreshToken) throw new Error('No SCHWAB_REFRESH_TOKEN — run node schwab-auth.js');

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body        = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString();

  const res = await fetch(`${BASE}/v1/oauth/token`, {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body,
  });

  const tokens = await res.json();
  if (tokens.error) throw new Error(`Token refresh failed: ${tokens.error_description || tokens.error}`);

  const expiresAt = Date.now() + (tokens.expires_in || 1800) * 1000;
  updateEnv('SCHWAB_ACCESS_TOKEN',    tokens.access_token);
  updateEnv('SCHWAB_TOKEN_EXPIRES_AT', String(expiresAt));
  if (tokens.refresh_token) updateEnv('SCHWAB_REFRESH_TOKEN', tokens.refresh_token);

  console.log('[Schwab] Access token refreshed');
  return tokens.access_token;
}

async function getAccessToken() {
  const expiresAt = parseInt(process.env.SCHWAB_TOKEN_EXPIRES_AT || '0');
  // Refresh 2 minutes before expiry
  if (process.env.SCHWAB_ACCESS_TOKEN && Date.now() < expiresAt - 120_000) {
    return process.env.SCHWAB_ACCESS_TOKEN;
  }
  return refreshAccessToken();
}

// ── Core request helper ───────────────────────────────────────────────────────

export async function schwabGet(path, params = {}) {
  const token = await getAccessToken();
  const url   = new URL(BASE + '/marketdata/v1' + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Schwab ${path}: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ── Quotes: fetch multiple tickers in one call ────────────────────────────────
// Returns { AAPL: { price, changePct, change, bid, ask, volume, open, prevClose,
//                   high52w, low52w, preMarketChangePct, postMarketChangePct }, ... }

export async function getQuotes(tickers) {
  if (!tickers?.length) return {};

  // Schwab allows up to 500 symbols per call
  const chunks = [];
  for (let i = 0; i < tickers.length; i += 500) chunks.push(tickers.slice(i, i + 500));

  const results = {};
  await Promise.all(chunks.map(async (chunk) => {
    const data = await schwabGet('/quotes', { symbols: chunk.join(','), fields: 'quote' });
    for (const [symbol, info] of Object.entries(data || {})) {
      const q = info.quote || {};
      results[symbol] = {
        price:               q.lastPrice                  ?? q.regularMarketLastPrice ?? null,
        changePct:           q.netPercentChange            ?? null,
        change:              q.netChange                   ?? null,
        bid:                 q.bidPrice                    ?? null,
        ask:                 q.askPrice                    ?? null,
        volume:              q.totalVolume                 ?? null,
        open:                q.openPrice                   ?? null,
        prevClose:           q.closePrice                  ?? null, // Schwab closePrice = prev day close
        high52w:             q['52WeekHigh']               ?? null,
        low52w:              q['52WeekLow']                ?? null,
        preMarketPrice:      q.preMarketPrice              ?? null,
        preMarketChange:     q.preMarketChange             ?? null,
        preMarketChangePct:  q.preMarketPercentChange      ?? null,
        postMarketChangePct: q.postMarketPercentChange     ?? null,
      };
    }
  }));

  return results;
}

// ── Price history: daily candles ──────────────────────────────────────────────
// Returns array of { t (ms timestamp), o, h, l, c, v } sorted oldest → newest

export async function getPriceHistory(ticker, { days = 400, startDate, endDate } = {}) {
  const params = {
    symbol:                ticker.toUpperCase(),
    periodType:            'year',
    period:                days > 365 ? 2 : 1,
    frequencyType:         'daily',
    frequency:             1,
    needExtendedHoursData: false,
  };

  if (startDate) params.startDate = startDate; // ms timestamp
  if (endDate)   params.endDate   = endDate;   // ms timestamp

  const data = await schwabGet('/pricehistory', params);
  return (data.candles || []).map(c => ({
    t: c.datetime,
    o: c.open,
    h: c.high,
    l: c.low,
    c: c.close,
    v: c.volume,
  }));
}

// ── Market movers ─────────────────────────────────────────────────────────────
// index: '$SPX' | '$COMPX' | '$DJI'
// direction: 'up' | 'down'

export async function getMovers(index, direction = 'up') {
  const sort = direction === 'up' ? 'PERCENT_CHANGE_UP' : 'PERCENT_CHANGE_DOWN';
  const data = await schwabGet(`/movers/${encodeURIComponent(index)}`, { sort, frequency: 0 });
  return data.screeners || [];
}

// ── Market hours ──────────────────────────────────────────────────────────────

export async function getMarketStatus() {
  const data = await schwabGet('/markets', { markets: 'equity' });
  const equity = data?.equity?.EQ;
  return {
    isOpen:     equity?.isOpen    ?? false,
    sessionHours: equity?.sessionHours ?? null,
  };
}
