import { getPriceHistory } from '../services/schwab.js';

function calcSMA(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(0, period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcRSI(closes, period = 14) {
  const prices = [...closes].reverse(); // chronological
  if (prices.length < period + 1) return null;

  const changes = [];
  for (let i = 1; i < prices.length; i++) changes.push(prices[i] - prices[i - 1]);

  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  return Math.round((100 - 100 / (1 + avgGain / avgLoss)) * 100) / 100;
}

export async function fetchStockScan(ticker) {
  try {
    const results = await getPriceHistory(ticker, { days: 400 });
    if (results.length < 10) return { success: false, error: 'Insufficient data' };

    const closes  = results.map(r => r.c).filter(c => c != null);
    const highs   = results.map(r => r.h).filter(h => h != null);
    const lows    = results.map(r => r.l).filter(l => l != null);
    const volumes = results.map(r => r.v);

    const recent = [...closes].reverse();
    const currentPrice = recent[0];
    const prevClose    = recent[1] ?? null;

    const periods = [8, 10, 21, 50, 100, 200];
    const smas = {};
    for (const p of periods) {
      const val = calcSMA(recent, p);
      if (val !== null) smas[p] = Math.round(val * 100) / 100;
    }

    const len  = results.length;
    const bars = results.slice(Math.max(0, len - 30)).reverse().map(r => ({
      open: r.o, high: r.h, low: r.l, close: r.c, volume: r.v,
    }));

    const recentVols = volumes.slice(-50).filter(v => v != null);
    const avgVolume  = recentVols.length > 0
      ? Math.round(recentVols.reduce((a, b) => a + b, 0) / recentVols.length)
      : null;

    return {
      ticker:     ticker.toUpperCase(),
      price:      Math.round(currentPrice * 100) / 100,
      prevClose:  prevClose ? Math.round(prevClose * 100) / 100 : null,
      bars,
      smas,
      rsi:        calcRSI(recent, 14),
      avgVolume,
      weekHigh52: highs.length ? Math.max(...highs) : null,
      weekLow52:  lows.length  ? Math.min(...lows)  : null,
      success:    true,
    };
  } catch (error) {
    return { ticker: ticker.toUpperCase(), success: false, error: error.message };
  }
}

export async function fetchSMAs(ticker) {
  try {
    const results = await getPriceHistory(ticker, { days: 400 });
    if (results.length === 0) return { smas: {}, success: false, error: 'No data' };

    const closes       = results.map(r => r.c).filter(c => c != null);
    const recent       = [...closes].reverse();
    const currentPrice = recent[0];

    const periods = [8, 10, 21, 50, 100, 200];
    const smas = {};
    for (const p of periods) {
      const val = calcSMA(recent, p);
      if (val !== null) {
        smas[p] = {
          period:       p,
          value:        Math.round(val * 100) / 100,
          pctFromPrice: Math.round(((currentPrice - val) / val) * 10000) / 100,
        };
      }
    }

    const candles = results
      .filter(r => r.c != null && r.o != null)
      .map(r => ({
        time:   Math.floor(r.t / 1000), // ms → seconds for TradingView
        open:   Math.round(r.o * 100) / 100,
        high:   Math.round(r.h * 100) / 100,
        low:    Math.round(r.l * 100) / 100,
        close:  Math.round(r.c * 100) / 100,
        volume: r.v || 0,
      }));

    return {
      ticker:  ticker.toUpperCase(),
      price:   Math.round(currentPrice * 100) / 100,
      smas,
      rsi:     calcRSI(recent, 14),
      candles,
      success: true,
    };
  } catch (error) {
    return { ticker: ticker.toUpperCase(), smas: {}, rsi: null, candles: [], success: false, error: error.message };
  }
}
