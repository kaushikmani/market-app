import { polygonGet } from '../services/polygon.js';
import { WATCHLIST } from '../data/watchlist.js';

const ALL_TICKERS = [...new Set(WATCHLIST.flatMap(g => g.tickers))];

const TICKER_GROUP = {};
for (const g of WATCHLIST) {
  for (const t of g.tickers) TICKER_GROUP[t] = g.name;
}

export async function scanGaps() {
  const data = await polygonGet('/v2/snapshot/locale/us/markets/stocks/tickers', {
    tickers: ALL_TICKERS.join(','),
  });

  const all = [];

  for (const t of data.tickers || []) {
    const open  = t.day?.o;
    const prevC = t.prevDay?.c;
    const curr  = t.lastTrade?.p || t.day?.c;

    if (!open || !prevC || prevC === 0) continue;

    const gapPct    = ((open - prevC) / prevC) * 100;
    const changePct = curr ? ((curr - prevC) / prevC) * 100 : gapPct;

    all.push({
      ticker:    t.ticker,
      company:   TICKER_GROUP[t.ticker] || '',
      price:     Math.round((curr || open) * 100) / 100,
      changePct: Math.round(changePct * 100) / 100,
      gapPct:    Math.round(gapPct * 100) / 100,
      open:      Math.round(open * 100) / 100,
      prevClose: Math.round(prevC * 100) / 100,
      volume:    t.day?.v ? Math.round(t.day.v).toLocaleString() : '',
      direction: gapPct > 0 ? 'up' : 'down',
    });
  }

  const ups   = all.filter(t => t.gapPct > 0).sort((a, b) => b.gapPct - a.gapPct);
  const downs = all.filter(t => t.gapPct < 0).sort((a, b) => a.gapPct - b.gapPct);

  // Primary: >= 2% threshold
  let gapUps   = ups.filter(t => t.gapPct >= 2);
  let gapDowns = downs.filter(t => t.gapPct <= -2);

  // Fallback: if nothing hits 2%, try 1.5%, then 1%, then just top movers
  if (!gapUps.length)   gapUps   = ups.filter(t => t.gapPct >= 1.5);
  if (!gapUps.length)   gapUps   = ups.filter(t => t.gapPct >= 1);
  if (!gapUps.length)   gapUps   = ups;

  if (!gapDowns.length) gapDowns = downs.filter(t => t.gapPct <= -1.5);
  if (!gapDowns.length) gapDowns = downs.filter(t => t.gapPct <= -1);
  if (!gapDowns.length) gapDowns = downs;

  return {
    success: true,
    gapUps:   gapUps.slice(0, 10),
    gapDowns: gapDowns.slice(0, 10),
    timestamp: Date.now(),
  };
}
