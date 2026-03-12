import { polygonGet } from '../services/polygon.js';

// Get up to 8 past earnings dates and price moves around each
export async function fetchEarningsHistory(ticker) {
  const upper = ticker.toUpperCase();

  // Get last 2 years of daily bars
  const toDate = new Date().toISOString().slice(0, 10);
  const fromDate = new Date(Date.now() - 2 * 365 * 86400000).toISOString().slice(0, 10);

  let bars = [];
  try {
    const data = await polygonGet(`/v2/aggs/ticker/${upper}/range/1/day/${fromDate}/${toDate}`, {
      adjusted: true,
      sort: 'asc',
      limit: 730,
    });
    bars = data.results || [];
  } catch {
    return { ticker: upper, history: [], expectedMove: null };
  }

  // We need earnings dates — use Polygon's news to find earnings-related dates
  // as a proxy (since we don't have financial calendar from Polygon on basic tier)
  // Instead, use a heuristic: fetch earnings dates from Polygon financials endpoint
  let earningsDates = [];
  try {
    const fin = await polygonGet('/vX/reference/financials', {
      ticker: upper,
      limit: 8,
      sort: 'period_of_report_date',
      order: 'desc',
    });
    earningsDates = (fin.results || [])
      .map(r => r.filing_date || r.period_of_report_date)
      .filter(Boolean)
      .slice(0, 8);
  } catch {
    // Financials endpoint requires higher tier — silently skip
  }

  if (earningsDates.length === 0) {
    return { ticker: upper, history: [], expectedMove: null, note: 'Earnings date history requires Polygon Stocks Developer plan' };
  }

  // Build a price map: date string -> close price
  const priceMap = {};
  for (const bar of bars) {
    const d = new Date(bar.t).toISOString().slice(0, 10);
    priceMap[d] = { open: bar.o, close: bar.c, high: bar.h, low: bar.l, volume: bar.v };
  }

  const sortedDates = Object.keys(priceMap).sort();

  function closestTradingDay(targetDate, offset = 0) {
    // Find closest date in sortedDates at offset from targetDate
    const idx = sortedDates.findIndex(d => d >= targetDate);
    if (idx < 0) return null;
    const adjusted = idx + offset;
    return sortedDates[Math.max(0, Math.min(adjusted, sortedDates.length - 1))];
  }

  const history = earningsDates.map(earningsDate => {
    const dayBefore = closestTradingDay(earningsDate, -1);
    const dayOf = closestTradingDay(earningsDate, 0);
    const dayAfter = closestTradingDay(earningsDate, 1);

    const prevClose = dayBefore ? priceMap[dayBefore]?.close : null;
    const earningsClose = dayOf ? priceMap[dayOf]?.close : null;
    const nextClose = dayAfter ? priceMap[dayAfter]?.close : null;

    const oneDayMove = prevClose && earningsClose
      ? Math.round(((earningsClose - prevClose) / prevClose) * 10000) / 100
      : null;

    const twoDayMove = prevClose && nextClose
      ? Math.round(((nextClose - prevClose) / prevClose) * 10000) / 100
      : null;

    return {
      date: earningsDate,
      prevClose,
      earningsClose,
      nextClose,
      oneDayMove,
      twoDayMove,
    };
  }).filter(h => h.oneDayMove !== null);

  // Expected move = average of abs(oneDayMove) for last 4 quarters
  const recent = history.slice(0, 4);
  const expectedMove = recent.length > 0
    ? Math.round(recent.reduce((s, h) => s + Math.abs(h.oneDayMove), 0) / recent.length * 100) / 100
    : null;

  return { ticker: upper, history, expectedMove };
}
