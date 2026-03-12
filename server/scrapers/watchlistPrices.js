import { polygonGet } from '../services/polygon.js';

export async function fetchWatchlistPrices(tickers) {
  if (!tickers?.length) return {};

  // Polygon allows all tickers in one snapshot call (up to 1000)
  const data = await polygonGet('/v2/snapshot/locale/us/markets/stocks/tickers', {
    tickers: tickers.join(','),
  });

  const results = {};
  for (const t of data.tickers || []) {
    results[t.ticker] = {
      price: t.min?.c || t.lastTrade?.p || t.day?.c,
      changePct: t.todaysChangePerc,
      change: t.todaysChange,
      bid: t.lastQuote?.p || null,
      ask: t.lastQuote?.P || null,
      volume: t.day?.v || null,
      preMarketChangePct: null,
      postMarketChangePct: null,
    };
  }
  return results;
}
