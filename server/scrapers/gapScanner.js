import { getQuotes, getMovers } from '../services/schwab.js';
import { WATCHLIST } from '../data/watchlist.js';

const ALL_TICKERS = [...new Set(WATCHLIST.flatMap(g => g.tickers))];

const TICKER_GROUP = {};
for (const g of WATCHLIST) {
  for (const t of g.tickers) TICKER_GROUP[t] = g.name;
}

function isPreMarket() {
  const et   = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day  = et.getDay();
  if (day === 0 || day === 6) return false;
  const mins = et.getHours() * 60 + et.getMinutes();
  return mins >= 4 * 60 && mins < 9 * 60 + 30; // 4am–9:30am ET
}

export async function scanGaps() {
  const quotes    = await getQuotes(ALL_TICKERS);
  const preMarket = isPreMarket();

  const all = [];
  for (const [ticker, q] of Object.entries(quotes)) {
    const prevC = q.prevClose;
    if (!prevC || prevC === 0) continue;

    let gapPrice, curr, session;

    if (preMarket && q.preMarketPrice) {
      // Pre-market: gap = preMarketPrice vs prev close
      gapPrice = q.preMarketPrice;
      curr     = q.preMarketPrice;
      session  = 'pre-market';
    } else if (q.open) {
      // Regular/post session: gap = open vs prev close
      gapPrice = q.open;
      curr     = q.price;
      session  = 'regular';
    } else {
      continue;
    }

    const gapPct    = ((gapPrice - prevC) / prevC) * 100;
    const changePct = curr ? ((curr - prevC) / prevC) * 100 : gapPct;

    all.push({
      ticker,
      company:   TICKER_GROUP[ticker] || '',
      price:     Math.round((curr || gapPrice) * 100) / 100,
      changePct: Math.round(changePct * 100) / 100,
      gapPct:    Math.round(gapPct * 100) / 100,
      open:      Math.round(gapPrice * 100) / 100,
      prevClose: Math.round(prevC * 100) / 100,
      volume:    q.volume ? Math.round(q.volume).toLocaleString() : '',
      direction: gapPct > 0 ? 'up' : 'down',
      session,
    });
  }

  const ups   = all.filter(t => t.gapPct > 0).sort((a, b) => b.gapPct - a.gapPct);
  const downs = all.filter(t => t.gapPct < 0).sort((a, b) => a.gapPct - b.gapPct);

  // Primary: >= 2% threshold
  let gapUps   = ups.filter(t => t.gapPct >= 2);
  let gapDowns = downs.filter(t => t.gapPct <= -2);

  // Fallback: relax threshold progressively
  if (!gapUps.length)   gapUps   = ups.filter(t => t.gapPct >= 1.5);
  if (!gapUps.length)   gapUps   = ups.filter(t => t.gapPct >= 1);
  if (!gapUps.length)   gapUps   = ups;

  if (!gapDowns.length) gapDowns = downs.filter(t => t.gapPct <= -1.5);
  if (!gapDowns.length) gapDowns = downs.filter(t => t.gapPct <= -1);
  if (!gapDowns.length) gapDowns = downs;

  // Market-wide movers from Schwab ($SPX)
  let marketGainers = [];
  let marketLosers  = [];
  try {
    const [gainers, losers] = await Promise.allSettled([
      getMovers('$SPX', 'up'),
      getMovers('$SPX', 'down'),
    ]);

    if (gainers.status === 'fulfilled') {
      marketGainers = gainers.value.map(m => ({
        ticker:    m.symbol,
        company:   m.description || '',
        price:     Math.round((m.last || 0) * 100) / 100,
        changePct: Math.round((m.percentChange || 0) * 100) / 100,
        gapPct:    0,
        open:      0,
        prevClose: 0,
        volume:    m.totalVolume ? Math.round(m.totalVolume).toLocaleString() : '',
        direction: 'up',
      }));
    }

    if (losers.status === 'fulfilled') {
      marketLosers = losers.value.map(m => ({
        ticker:    m.symbol,
        company:   m.description || '',
        price:     Math.round((m.last || 0) * 100) / 100,
        changePct: Math.round((m.percentChange || 0) * 100) / 100,
        gapPct:    0,
        open:      0,
        prevClose: 0,
        volume:    m.totalVolume ? Math.round(m.totalVolume).toLocaleString() : '',
        direction: 'down',
      }));
    }
  } catch { /* silently ignore movers failures */ }

  const watchlistUpTickers   = new Set(gapUps.map(t => t.ticker));
  const watchlistDownTickers = new Set(gapDowns.map(t => t.ticker));

  const extraUps   = marketGainers.filter(t => !watchlistUpTickers.has(t.ticker));
  const extraDowns = marketLosers.filter(t => !watchlistDownTickers.has(t.ticker));

  const mergedUps   = [...gapUps,   ...extraUps].slice(0, 5);
  const mergedDowns = [...gapDowns, ...extraDowns].slice(0, 5);

  return {
    success:    true,
    gapUps:     mergedUps,
    gapDowns:   mergedDowns,
    timestamp:  Date.now(),
    isPreMarket: preMarket,
  };
}
