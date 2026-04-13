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

function readEnvValue(key) {
  try {
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

async function refreshAccessToken() {
  const clientId     = process.env.SCHWAB_CLIENT_ID;
  const clientSecret = process.env.SCHWAB_CLIENT_SECRET;
  // Always read from .env file directly — process.env may be stale if schwab-auth.js
  // was run while the server was already running
  const refreshToken = readEnvValue('SCHWAB_REFRESH_TOKEN') || process.env.SCHWAB_REFRESH_TOKEN;

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

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token refresh failed: ${res.status} — ${text.slice(0, 200)}`);
  }

  const tokens = await res.json();
  if (tokens.error) throw new Error(`Token refresh failed: ${tokens.error_description || tokens.error}`);

  const expiresAt = Date.now() + (tokens.expires_in || 1800) * 1000;
  updateEnv('SCHWAB_ACCESS_TOKEN',    tokens.access_token);
  updateEnv('SCHWAB_TOKEN_EXPIRES_AT', String(expiresAt));
  if (tokens.refresh_token) {
    updateEnv('SCHWAB_REFRESH_TOKEN', tokens.refresh_token);
    updateEnv('SCHWAB_REFRESH_TOKEN_ISSUED_AT', String(Date.now()));
  }

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
//                   high52w, low52w, preMarketChangePct, postMarketChangePct,
//                   marketCap (if fields includes 'fundamental') }, ... }
//
// fields: comma-separated Schwab fields string, e.g. 'quote' or 'quote,fundamental'

export async function getQuotes(tickers, fields = 'quote') {
  if (!tickers?.length) return {};

  // Schwab allows up to 500 symbols per call
  const chunks = [];
  for (let i = 0; i < tickers.length; i += 500) chunks.push(tickers.slice(i, i + 500));

  const results = {};
  await Promise.all(chunks.map(async (chunk) => {
    const data = await schwabGet('/quotes', { symbols: chunk.join(','), fields });
    for (const [symbol, info] of Object.entries(data || {})) {
      const q = info.quote || {};
      const f = info.fundamental || {};
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
        // Fundamental fields (populated when fields includes 'fundamental')
        marketCap:           f.marketCap                   ?? null, // in millions USD
      };
    }
  }));

  return results;
}

// ── Instrument fundamentals: market cap, PE, EPS, etc ────────────────────────
// Returns { marketCap, peRatio, eps, high52, low52, dividendYield } for one ticker
// marketCap is in millions USD per Schwab convention

export async function getInstrumentFundamentals(ticker) {
  const data = await schwabGet('/instruments', { symbol: ticker.toUpperCase(), projection: 'fundamental' });
  // Schwab returns { instruments: [...] }
  const items = data?.instruments ?? (Array.isArray(data) ? data : Object.values(data || {}));
  const item = items.find(i => i.symbol?.toUpperCase() === ticker.toUpperCase()) || items[0];
  if (!item) return {};
  const f = item.fundamental || {};
  return {
    marketCap:        f.marketCap        ?? null, // full dollars
    sharesOutstanding: f.sharesOutstanding ?? null, // raw share count
    peRatio:          f.peRatio          ?? null,
    eps:              f.eps              ?? null,
    high52:           f.high52           ?? null,
    low52:            f.low52            ?? null,
    dividendYield:    f.dividendYield    ?? null,
  };
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

// ── Options chain summary ─────────────────────────────────────────────────────
// Returns: { iv, callOI, putOI, callVolume, putVolume, putCallRatio, success }

export async function getOptionsChain(ticker) {
  const data = await schwabGet('/chains', {
    symbol:          ticker.toUpperCase(),
    contractType:    'ALL',
    strikeCount:     10,
    optionType:      'ALL',
    includeUnderlyingQuote: false,
  });

  if (!data || data.status === 'FAILED') {
    return { success: false, error: 'Options data unavailable' };
  }

  let callOI = 0, putOI = 0, callVolume = 0, putVolume = 0;

  const sumMap = (expMap) => {
    if (!expMap) return;
    for (const strikes of Object.values(expMap)) {
      for (const contracts of Object.values(strikes)) {
        for (const c of contracts) {
          const oi  = c.openInterest  ?? 0;
          const vol = c.totalVolume   ?? 0;
          if (c.putCall === 'CALL') { callOI += oi; callVolume += vol; }
          else                      { putOI  += oi; putVolume  += vol; }
        }
      }
    }
  };

  sumMap(data.callExpDateMap);
  sumMap(data.putExpDateMap);

  const totalOI  = callOI  + putOI;
  const putCallRatio = callOI > 0 ? Math.round((putOI / callOI) * 100) / 100 : null;
  const iv = data.volatility != null ? Math.round(data.volatility * 10) / 10 : null;

  return {
    success:       true,
    iv,
    callOI,
    putOI,
    totalOI,
    callVolume,
    putVolume,
    putCallRatio,
    underlyingPrice: data.underlyingPrice ?? null,
    numberOfContracts: data.numberOfContracts ?? null,
  };
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
