import { execFileSync } from 'child_process';
import { getPriceHistory } from '../services/schwab.js';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Fetch earnings history from Yahoo Finance quoteSummary API
// Uses execFileSync (no shell) because Yahoo Finance blocks Node's native fetch via TLS fingerprinting
async function fetchYahooEarnings(ticker) {
  try {
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=earningsHistory,earningsTrend`;
    const raw = execFileSync('curl', ['-sL', '-H', `User-Agent: ${USER_AGENT}`, url], {
      timeout: 12000,
      encoding: 'utf-8',
    });
    const json = JSON.parse(raw);
    const result = json?.quoteSummary?.result?.[0];
    if (!result) return [];

    const history = result.earningsHistory?.history || [];
    return history.map(q => ({
      date: q.period || null,          // e.g. "2024-09-30"
      quarter: q.quarter?.fmt || null, // e.g. "3Q2024"
      epsActual: q.epsActual?.raw ?? null,
      epsEstimate: q.epsEstimate?.raw ?? null,
      surprisePct: q.surprisePercent?.raw ?? null,
    })).filter(q => q.date);
  } catch {
    return [];
  }
}

// Get up to 8 past earnings dates and price moves around each
export async function fetchEarningsHistory(ticker) {
  const upper = ticker.toUpperCase();

  // Fetch in parallel: price bars (2 years) and earnings dates
  const [candles, earningsData] = await Promise.all([
    getPriceHistory(upper, { days: 730 }).catch(() => []),
    fetchYahooEarnings(upper),
  ]);

  if (!candles.length) return { ticker: upper, history: [], expectedMove: null };

  // Build price map: 'YYYY-MM-DD' → close, and sorted list for prev-day lookup
  const priceMap = {};
  const sortedBars = [...candles].sort((a, b) => a.t - b.t);
  for (const bar of sortedBars) {
    const d = new Date(bar.t).toISOString().slice(0, 10);
    priceMap[d] = { open: bar.o, close: bar.c, high: bar.h, low: bar.l };
  }
  const sortedDates = Object.keys(priceMap).sort();

  // For each earnings date find the closest trading day and compute move
  const history = [];
  for (const eq of earningsData.slice(-8)) {
    const earningsDay = eq.date; // "2024-09-30"

    // Find this date or the next trading day in our price map
    let tradingDate = earningsDay;
    if (!priceMap[tradingDate]) {
      // Scan forward up to 5 days
      for (let offset = 1; offset <= 5; offset++) {
        const d = new Date(earningsDay);
        d.setDate(d.getDate() + offset);
        const ds = d.toISOString().slice(0, 10);
        if (priceMap[ds]) { tradingDate = ds; break; }
      }
    }
    if (!priceMap[tradingDate]) continue;

    // Find prev trading day close
    const idx = sortedDates.indexOf(tradingDate);
    if (idx <= 0) continue;
    const prevDate = sortedDates[idx - 1];
    const prevClose = priceMap[prevDate]?.close;
    if (!prevClose) continue;

    const dayClose = priceMap[tradingDate].close;
    const movePct = ((dayClose - prevClose) / prevClose) * 100;

    history.push({
      date: tradingDate,
      quarter: eq.quarter,
      epsActual: eq.epsActual,
      epsEstimate: eq.epsEstimate,
      surprisePct: eq.surprisePct,
      open: priceMap[tradingDate].open,
      close: dayClose,
      prevClose,
      movePct: Math.round(movePct * 100) / 100,
    });
  }

  // Expected move = average absolute move over last 4 quarters
  const recent4 = history.slice(-4);
  const avgMove = recent4.length
    ? recent4.reduce((s, h) => s + Math.abs(h.movePct), 0) / recent4.length
    : null;

  return {
    ticker: upper,
    history: history.slice(-8),
    expectedMove: avgMove ? Math.round(avgMove * 10) / 10 : null,
  };
}
