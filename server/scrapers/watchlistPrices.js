import { getQuotes } from '../services/schwab.js';

export async function fetchWatchlistPrices(tickers) {
  if (!tickers?.length) return {};
  const quotes = await getQuotes(tickers);

  const results = {};
  for (const [ticker, q] of Object.entries(quotes)) {
    results[ticker] = {
      price:               q.price,
      changePct:           q.changePct,
      change:              q.change,
      bid:                 q.bid,
      ask:                 q.ask,
      volume:              q.volume,
      preMarketChangePct:  q.preMarketChangePct,
      postMarketChangePct: q.postMarketChangePct,
    };
  }
  return results;
}
