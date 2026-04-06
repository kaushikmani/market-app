import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchStockScan } from './yahooSMA.js';
import { WATCHLIST } from '../data/watchlist.js';
import { callGemini } from '../services/whisperService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOTES_DIR      = path.join(__dirname, '..', 'data', 'notes');
const SCAN_STATE_FILE = path.join(__dirname, '..', 'data', 'scan-alert-state.json');
const WA_NUMBER      = '120363409048565862@g.us';

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1500;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildSectorMap() {
  const map = {};
  for (const group of WATCHLIST) {
    for (const ticker of group.tickers) {
      map[ticker] = group.name;
    }
  }
  return map;
}

// ── Setup #1: Single Inside Day ──
function detectInsideDay(bars) {
  if (!bars || bars.length < 2) return null;
  const today = bars[0];
  const yesterday = bars[1];
  if (today.high == null || today.low == null || yesterday.high == null || yesterday.low == null) return null;

  if (today.high < yesterday.high && today.low > yesterday.low) {
    const range = today.high - today.low;
    const parentRange = yesterday.high - yesterday.low;
    const compression = parentRange > 0 ? ((1 - range / parentRange) * 100).toFixed(0) : 0;
    return {
      type: 'inside_day',
      priority: 2,
      label: 'Inside Day',
      description: `Range compressed ${compression}% inside yesterday — watch for breakout above ${yesterday.high.toFixed(2)} or below ${yesterday.low.toFixed(2)}`,
      metrics: { compression: `${compression}%`, breakoutUp: yesterday.high.toFixed(2), breakoutDown: yesterday.low.toFixed(2) },
    };
  }
  return null;
}

// ── Setup #2: Stage 2 Breakout (Minervini trend template) ──
function detectStage2Breakout(price, smas, weekHigh52) {
  const sma50 = smas[50];
  const sma200 = smas[200];
  if (sma50 == null || sma200 == null || price == null || weekHigh52 == null) return null;

  const priceAbove50 = price > sma50;
  const sma50Above200 = sma50 > sma200;
  const nearHighs = (price / weekHigh52) >= 0.90;

  if (priceAbove50 && sma50Above200 && nearHighs) {
    const pctFromHigh = ((1 - price / weekHigh52) * 100).toFixed(1);
    return {
      type: 'stage2_breakout',
      priority: 5,
      label: 'Stage 2 Breakout',
      description: `${pctFromHigh}% from 52w high — all MAs stacked bullish (50 > 200), trending`,
      metrics: { pctFrom52wHigh: `${pctFromHigh}%`, sma50: sma50.toFixed(2), sma200: sma200.toFixed(2) },
    };
  }
  return null;
}

// ── Setup #6: Overextended (far from MAs — mean reversion risk) ──
function detectOverextended(price, smas) {
  const sma21 = smas[21];
  const sma50 = smas[50];
  if (price == null) return null;

  const checkMA = sma21 || sma50;
  if (checkMA == null) return null;

  const pctAbove = ((price - checkMA) / checkMA) * 100;
  const maLabel = sma21 ? '21 SMA' : '50 SMA';

  if (pctAbove > 15) {
    return {
      type: 'overextended',
      priority: 6,
      label: 'Overextended',
      description: `${pctAbove.toFixed(1)}% above ${maLabel} — stretched, avoid chasing, wait for pullback`,
      metrics: { pctAboveMA: `${pctAbove.toFixed(1)}%`, ma: maLabel },
    };
  }
  if (pctAbove < -15) {
    return {
      type: 'overextended',
      priority: 6,
      label: 'Oversold Stretch',
      description: `${Math.abs(pctAbove).toFixed(1)}% below ${maLabel} — deeply oversold, watch for bounce`,
      metrics: { pctBelowMA: `${Math.abs(pctAbove).toFixed(1)}%`, ma: maLabel },
    };
  }
  return null;
}

// ── Setup #7: Breakout & Retest (pulled back to prior resistance, now support) ──
function detectBreakoutRetest(bars, price, smas, weekHigh52) {
  if (!bars || bars.length < 5 || price == null || weekHigh52 == null) return null;
  const sma50 = smas[50];
  if (sma50 == null || price <= sma50) return null;

  // Look for a recent high in bars[2..4] that was higher than current price,
  // then a pullback, now price recovering near that level
  const recentHighs = bars.slice(1, 5).map(b => b.high).filter(h => h != null);
  if (recentHighs.length === 0) return null;
  const recentPeak = Math.max(...recentHighs);

  // Current price within 2% of recent peak, and was lower yesterday (bouncing)
  const pctFromPeak = ((recentPeak - price) / recentPeak) * 100;
  const prevClose = bars[1]?.close;
  if (pctFromPeak >= 0 && pctFromPeak <= 3 && prevClose && price > prevClose) {
    const pctFrom52w = ((1 - price / weekHigh52) * 100).toFixed(1);
    return {
      type: 'breakout_retest',
      priority: 7,
      label: 'Breakout & Retest',
      description: `Retesting recent high $${recentPeak.toFixed(2)} — ${pctFrom52w}% from 52w high, holding above 50 SMA`,
      metrics: { recentPeak: recentPeak.toFixed(2), pctFromPeak: `${pctFromPeak.toFixed(1)}%` },
    };
  }
  return null;
}

// ── Setup #8: Breakdown (lost 50 SMA — bearish) ──
function detectBreakdown(price, prevClose, smas) {
  const sma50 = smas[50];
  const sma200 = smas[200];
  if (sma50 == null || price == null) return null;

  // Just broke below 50 SMA
  if (prevClose && prevClose > sma50 && price < sma50) {
    const below200 = sma200 != null && price < sma200;
    return {
      type: 'breakdown',
      priority: 8,
      label: 'Breakdown',
      description: `Lost 50 SMA ($${sma50.toFixed(2)}) — ${below200 ? 'also below 200 SMA, bearish structure' : 'watch for failed breakdown or further selling'}`,
      metrics: { sma50: sma50.toFixed(2) },
    };
  }

  // Below both 50 and 200 (Stage 4 decline)
  if (price < sma50 && sma200 && sma50 < sma200 && price < sma200) {
    const pctBelow200 = ((sma200 - price) / sma200 * 100).toFixed(1);
    return {
      type: 'breakdown',
      priority: 8,
      label: 'Stage 4 Decline',
      description: `${pctBelow200}% below 200 SMA — MAs stacked bearish (50 < 200), avoid longs`,
      metrics: { pctBelow200: `${pctBelow200}%`, sma50: sma50.toFixed(2), sma200: sma200.toFixed(2) },
    };
  }
  return null;
}

// ── Setup #9: Volume Surge (unusual activity) ──
function detectVolumeSurge(bars, avgVolume) {
  if (!bars || bars.length < 1 || avgVolume == null || avgVolume === 0) return null;
  const today = bars[0];
  if (today.volume == null) return null;

  const ratio = today.volume / avgVolume;
  if (ratio >= 2.0) {
    const direction = today.close >= today.open ? 'up' : 'down';
    const pctMove = today.open > 0 ? (((today.close - today.open) / today.open) * 100).toFixed(1) : '?';
    return {
      type: 'volume_surge',
      priority: 9,
      label: 'Volume Surge',
      description: `${ratio.toFixed(1)}x avg volume — ${direction === 'up' ? 'buying' : 'selling'} pressure (${pctMove}% move)`,
      metrics: { volumeRatio: `${ratio.toFixed(1)}x`, direction },
    };
  }
  return null;
}

// ── Setup: Downtrend Break (price breaks above descending trendline of swing highs) ──
function detectDowntrendBreak(bars, price) {
  if (!bars || bars.length < 10 || price == null) return null;

  // Find swing highs in bars[1..29] (exclude today so we can check if today broke it)
  // bars[0]=today, bars[1]=yesterday, bars[N]=older; so bars[i].high > bars[i+1].high && bars[i].high > bars[i-1].high
  const swingHighs = [];
  for (let i = 1; i < Math.min(bars.length - 1, 30); i++) {
    const prev = bars[i + 1]; // older bar
    const curr = bars[i];
    const next = bars[i - 1]; // more recent bar
    if (curr.high != null && prev?.high != null && next?.high != null &&
        curr.high > prev.high && curr.high > next.high) {
      swingHighs.push({ idx: i, high: curr.high });
    }
  }

  if (swingHighs.length < 2) return null;

  // Find two swing highs that form a descending line (older high > newer high)
  // swingHighs are sorted by idx ascending (smallest idx = most recent)
  let h1 = null, h2 = null; // h1 = older, h2 = more recent
  for (let i = 0; i < swingHighs.length - 1; i++) {
    for (let j = i + 1; j < swingHighs.length; j++) {
      // swingHighs[j].idx > swingHighs[i].idx → j is older
      if (swingHighs[j].high > swingHighs[i].high) {
        h2 = swingHighs[i]; // more recent (smaller idx)
        h1 = swingHighs[j]; // older (larger idx)
        break;
      }
    }
    if (h1) break;
  }

  if (!h1 || !h2) return null;

  // Extrapolate trendline to today (idx=0) and yesterday (idx=1)
  // Line through (h1.idx, h1.high) and (h2.idx, h2.high)
  const slope = (h2.high - h1.high) / (h2.idx - h1.idx); // negative = descending
  const trendlineToday = h1.high + slope * (0 - h1.idx);
  const trendlineYesterday = h1.high + slope * (1 - h1.idx);

  // Require: yesterday was at or below the trendline (fresh break today)
  const prevClose = bars[1]?.close;
  if (prevClose == null || prevClose > trendlineYesterday * 1.005) return null;

  // Today's price broke above
  if (price > trendlineToday) {
    const pctAbove = ((price - trendlineToday) / trendlineToday * 100).toFixed(1);
    return {
      type: 'downtrend_break',
      priority: 3,
      label: 'Downtrend Break',
      description: `Broke above descending trendline at $${trendlineToday.toFixed(2)} — ${pctAbove}% above, trendline from ${h1.idx}–${h2.idx} bars ago`,
      metrics: { trendlineLevel: trendlineToday.toFixed(2), pctAbove: `${pctAbove}%`, barsBack: `${h1.idx}–${h2.idx}` },
    };
  }
  return null;
}

// ── Setup: Uptrend Break (price breaks below ascending trendline of swing lows) ──
function detectUptrendBreak(bars, price) {
  if (!bars || bars.length < 10 || price == null) return null;

  // Find swing lows in bars[1..29] (exclude today)
  // bars[i].low < bars[i+1].low && bars[i].low < bars[i-1].low
  const swingLows = [];
  for (let i = 1; i < Math.min(bars.length - 1, 30); i++) {
    const prev = bars[i + 1]; // older bar
    const curr = bars[i];
    const next = bars[i - 1]; // more recent bar
    if (curr.low != null && prev?.low != null && next?.low != null &&
        curr.low < prev.low && curr.low < next.low) {
      swingLows.push({ idx: i, low: curr.low });
    }
  }

  if (swingLows.length < 2) return null;

  // Find two swing lows that form an ascending line (older low < newer low)
  let h1 = null, h2 = null; // h1 = older, h2 = more recent
  for (let i = 0; i < swingLows.length - 1; i++) {
    for (let j = i + 1; j < swingLows.length; j++) {
      // swingLows[j].idx > swingLows[i].idx → j is older
      if (swingLows[j].low < swingLows[i].low) {
        h2 = swingLows[i]; // more recent (smaller idx, higher low)
        h1 = swingLows[j]; // older (larger idx, lower low)
        break;
      }
    }
    if (h1) break;
  }

  if (!h1 || !h2) return null;

  // Extrapolate trendline to today (idx=0) and yesterday (idx=1)
  const slope = (h2.low - h1.low) / (h2.idx - h1.idx); // positive = ascending
  const trendlineToday = h1.low + slope * (0 - h1.idx);
  const trendlineYesterday = h1.low + slope * (1 - h1.idx);

  // Require: yesterday was at or above the trendline (fresh break today)
  const prevClose = bars[1]?.close;
  if (prevClose == null || prevClose < trendlineYesterday * 0.995) return null;

  // Today's price broke below
  if (price < trendlineToday) {
    const pctBelow = ((trendlineToday - price) / trendlineToday * 100).toFixed(1);
    return {
      type: 'uptrend_break',
      priority: 4,
      label: 'Uptrend Break',
      description: `Broke below ascending trendline at $${trendlineToday.toFixed(2)} — ${pctBelow}% below, trendline from ${h1.idx}–${h2.idx} bars ago`,
      metrics: { trendlineLevel: trendlineToday.toFixed(2), pctBelow: `${pctBelow}%`, barsBack: `${h1.idx}–${h2.idx}` },
    };
  }
  return null;
}

// ── Chart Pattern Detection (badge-level signals) ──
function detectPatterns(bars, smas, rsi, avgVolume) {
  const patterns = [];
  if (!bars || bars.length < 2) return patterns;

  // 1. Inside Day
  if (bars.length >= 2 &&
      bars[0].high != null && bars[1].high != null &&
      bars[0].low != null && bars[1].low != null &&
      bars[0].high < bars[1].high && bars[0].low > bars[1].low) {
    patterns.push('Inside Day');
  }

  // 2. VDU (Volume Dry Up): last 3 bars avg volume < avgVolume * 0.7
  if (bars.length >= 3 && avgVolume != null && avgVolume > 0) {
    const recent3Vols = bars.slice(0, 3).map(b => b.volume).filter(v => v != null);
    if (recent3Vols.length === 3) {
      const avg3 = recent3Vols.reduce((a, b) => a + b, 0) / 3;
      if (avg3 < avgVolume * 0.7) {
        patterns.push('VDU');
      }
    }
  }

  // 3. Tight Coil: last 5 closes within 2% band
  if (bars.length >= 5) {
    const closes5 = bars.slice(0, 5).map(b => b.close).filter(c => c != null);
    if (closes5.length === 5) {
      const maxC = Math.max(...closes5);
      const minC = Math.min(...closes5);
      if (minC > 0 && (maxC - minC) / minC < 0.02) {
        patterns.push('Tight Coil');
      }
    }
  }

  // 4. Bounce SMA: price within 2% above any key SMA (21, 50, 200) AND rsi < 55
  if (smas && rsi != null && rsi < 55 && bars[0].close != null) {
    const price = bars[0].close;
    for (const period of [21, 50, 200]) {
      const sma = smas[period];
      if (sma != null && price >= sma) {
        const pctAbove = ((price - sma) / sma) * 100;
        if (pctAbove <= 2) {
          patterns.push('Bounce SMA');
          break;
        }
      }
    }
  }

  // 5. Bull Flag: close[5..10] significantly higher than close[15..20] (>8% move),
  //    AND last 5 days consolidating (range < 4% of recent high)
  if (bars.length >= 20) {
    const recentCloses = bars.slice(5, 11).map(b => b.close).filter(c => c != null);
    const olderCloses = bars.slice(15, 21).map(b => b.close).filter(c => c != null);
    if (recentCloses.length >= 3 && olderCloses.length >= 3) {
      const avgRecent = recentCloses.reduce((a, b) => a + b, 0) / recentCloses.length;
      const avgOlder = olderCloses.reduce((a, b) => a + b, 0) / olderCloses.length;
      if (avgOlder > 0 && (avgRecent - avgOlder) / avgOlder > 0.08) {
        // Check last 5 days consolidation
        const last5 = bars.slice(0, 5);
        const highs5 = last5.map(b => b.high).filter(h => h != null);
        const lows5 = last5.map(b => b.low).filter(l => l != null);
        if (highs5.length === 5 && lows5.length === 5) {
          const rangeHigh = Math.max(...highs5);
          const rangeLow = Math.min(...lows5);
          if (rangeHigh > 0 && (rangeHigh - rangeLow) / rangeHigh < 0.04) {
            patterns.push('Bull Flag');
          }
        }
      }
    }
  }

  // 6. Vol Surge: today's volume > avgVolume * 1.5
  if (bars[0].volume != null && avgVolume != null && avgVolume > 0) {
    if (bars[0].volume > avgVolume * 1.5) {
      patterns.push('Vol Surge');
    }
  }

  return patterns;
}

// ── CONNOR BATES picks — get priority boost in scan results ──
const CONNOR_PICKS = new Set([
  // Tier 1: Most frequently mentioned (3+ tweets)
  'PLTR','CRDO','ALAB','HOOD','CLS','RKLB','IONQ','NVDA','TSLA',
  'RGTI','QBTS','QS','MP','LEU','RDDT','CRWV','IREN',
  // Tier 2: Mentioned in 2 tweets
  'GEV','AVGO','QUBT','SMR','ASTS','COIN','SOFI','CCJ','APLD',
  'OPEN','STX','AMD',
  // Tier 3: Notable single mentions (TMLs and key momentum)
  'SPOT','AXON','APP','RBRK','NBIS','U','ORCL','TEM','BE','AMSC',
  'KTOS','RIOT','KRMN','RBLX','SYM','JOBY','OKLO','SEZL','DAVE',
  'CRSP','UPST','W','NET','TER',
]);

// ── LEADER GROUPS for 8/10d setups ──
const LEADER_TICKERS = new Set([
  'NVDA','TSLA','AAPL','MSFT','GOOGL','AMZN','META',
  'AVGO','CRM','PLTR','NOW','ORCL','ADBE',
  'CRWD','PANW','ANET','ASML','AMD','ARM','MRVL',
  'LLY','UNH','ABBV','NVO',
  'GS','JPM','V','MA',
  'COIN','MSTR',
  'VST','CEG','GEV',
  'LMT','RTX','RKLB',
  'NFLX','APP','SPOT','TTD',
  'BKNG','ABNB',
]);

// ── Setup #3: Leader near 8/10d SMA — potential buy ──
function detectLeader810dBuy(ticker, price, smas) {
  if (!LEADER_TICKERS.has(ticker)) return null;
  const sma8 = smas[8];
  const sma10 = smas[10];
  const sma21 = smas[21];
  if (price == null) return null;

  // Check both 8d and 10d, pick the closer one
  let bestMA = null, bestPct = Infinity, bestPeriod = null;
  for (const [period, val] of [[8, sma8], [10, sma10]]) {
    if (val == null) continue;
    const pct = ((price - val) / val) * 100;
    if (Math.abs(pct) < Math.abs(bestPct)) {
      bestMA = val; bestPct = pct; bestPeriod = period;
    }
  }
  if (bestMA == null) return null;

  // Within 0-1% of 8 or 10d, and in uptrend (above 21d)
  const inUptrend = sma21 != null && price > sma21;
  if (Math.abs(bestPct) <= 1.0 && inUptrend) {
    const side = bestPct >= 0 ? 'holding' : 'pulling back to';
    return {
      type: 'leader_8_10d_buy',
      priority: 2,
      label: `Leader ${bestPeriod}d Buy`,
      description: `${Math.abs(bestPct).toFixed(1)}% from ${bestPeriod} SMA ($${bestMA.toFixed(2)}) — leader ${side} short-term support`,
      metrics: { period: bestPeriod, pctFromMA: `${bestPct.toFixed(1)}%`, smaValue: bestMA.toFixed(2) },
    };
  }
  return null;
}

// ── Setup #12: RSI < 20 — deeply oversold ──
function detectRSIOversold(rsi, price) {
  if (rsi == null || price == null) return null;
  if (rsi < 20) {
    return {
      type: 'rsi_oversold',
      priority: 1,
      label: `RSI ${rsi.toFixed(0)}`,
      description: `RSI at ${rsi.toFixed(1)} — deeply oversold, watch for bounce or capitulation`,
      metrics: { rsi: rsi.toFixed(1) },
    };
  }
  return null;
}

// ── Setup #16: RSI > 80 — overbought warning ──
function detectRSIOverbought(rsi, price) {
  if (rsi == null || price == null) return null;
  if (rsi > 80) {
    return {
      type: 'rsi_overbought',
      priority: 6,
      label: `RSI ${rsi.toFixed(0)}`,
      description: `RSI at ${rsi.toFixed(1)} — overbought, potential mean reversion or sell signal`,
      metrics: { rsi: rsi.toFixed(1) },
    };
  }
  return null;
}


// ── Market hours check (9:30am–4pm ET, Mon-Fri) ──────────────────────────────
function isMarketHours() {
  const now = new Date();
  const et  = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const mins = et.getHours() * 60 + et.getMinutes();
  return mins >= 9 * 60 + 30 && mins < 16 * 60;
}

// WhatsApp setup alerts disabled — setups only sent via morning brief

// ── Scan alert state ─────────────────────────────────────────────────────────
function loadScanState() {
  try { return JSON.parse(fs.readFileSync(SCAN_STATE_FILE, 'utf-8')); } catch { return {}; }
}
function saveScanState(state) {
  fs.writeFileSync(SCAN_STATE_FILE, JSON.stringify(state, null, 2));
}

// ── Robust partial-JSON parser for truncated Gemini responses ──────────────────
function tryParseJsonArray(raw) {
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  // Full parse first
  try { return JSON.parse(cleaned); } catch { /* ignore */ }
  // Find last complete object and close the array
  const lastClose = cleaned.lastIndexOf('}');
  if (lastClose === -1) return null;
  try { return JSON.parse(cleaned.slice(0, lastClose + 1) + ']'); } catch { /* ignore */ }
  return null;
}

// ── AI quality scoring — Gemini rates each setup & suggests entry/stop/target ─
async function aiScoreSetups(results) {
  const top = results.filter(r => !r.hasNoteSetup).slice(0, 8); // keep under token limit
  if (!top.length) return;

  const summary = top.map(r => {
    const s = r.setups[0];
    const smaStr = Object.entries(r.smas || {})
      .filter(([p]) => [21, 50, 200].includes(Number(p)))
      .map(([p, v]) => `SMA${p}=$${Number(v).toFixed(0)}`)
      .join(', ');
    return `${r.ticker} $${r.price} | ${s.label}: ${s.description.slice(0, 80)} | ${smaStr} | RSI:${r.rsi != null ? r.rsi.toFixed(0) : 'N/A'}`;
  }).join('\n');

  const prompt = `Swing trader scoring ${top.length} setups. Return JSON array only, no markdown.

${summary}

[{"ticker":"X","score":8,"entry":"0.00","stop":"0.00","target":"0.00","rr":"2.0","note":"one line"}]

score: 9-10=strong | 7-8=good | 5-6=marginal | 1-4=avoid. Keep note under 12 words.`;

  try {
    const raw = await callGemini(prompt);
    if (!raw) return;
    const scores = tryParseJsonArray(raw);
    if (!Array.isArray(scores)) return;

    for (const sc of scores) {
      const r = results.find(r => r.ticker === sc.ticker);
      if (!r) continue;
      r.aiScore  = sc.score;
      r.aiEntry  = sc.entry;
      r.aiStop   = sc.stop;
      r.aiTarget = sc.target;
      r.aiRR     = sc.rr;
      r.aiNote   = sc.note;
    }

    // Re-sort: blend setup priority with AI score (higher score → higher rank)
    results.sort((a, b) => {
      const rankA = (a.hasNoteSetup ? 0 : a.topPriority) - ((a.aiScore || 5) - 5) * 0.4;
      const rankB = (b.hasNoteSetup ? 0 : b.topPriority) - ((b.aiScore || 5) - 5) * 0.4;
      return rankA - rankB;
    });
    console.log('[WatchlistScanner] AI scoring complete');
  } catch (e) {
    console.error('[WatchlistScanner] AI scoring failed:', e.message);
  }
}

// ── Auto-alert: WhatsApp on new high-priority setups since last scan ──────────
function sendSetupAlerts(results) {
  if (!isMarketHours()) return;

  const state = loadScanState();
  const now   = Date.now();
  const COOLDOWN = 4 * 60 * 60 * 1000; // 4 hrs per ticker

  const toAlert = [];
  for (const r of results) {
    if (r.topPriority > 3) break; // only priorities 1-3 (sorted)
    if (r.hasNoteSetup) continue;

    const topSetup = r.setups[0];
    const prev     = state[r.ticker];
    const isNew    = !prev;
    const changed  = prev && prev.setupType !== topSetup.type;
    const expired  = prev && (now - (prev.alertedAt || 0)) > COOLDOWN;

    if (isNew || changed || expired) {
      toAlert.push(r);
      state[r.ticker] = { setupType: topSetup.type, alertedAt: now };
    }
  }

  saveScanState(state);

  if (toAlert.length) console.log(`[SetupAlerts] ${toAlert.length} new setups (no WA — see morning brief)`);
}

// ── Extract trade setups from today's audio/text notes via Gemini ──
async function extractNoteSetups() {
  try {
    if (!fs.existsSync(NOTES_DIR)) return [];

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Read today's and yesterday's notes
    const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith('.json'));
    const recentNotes = [];
    for (const f of files) {
      try {
        const note = JSON.parse(fs.readFileSync(path.join(NOTES_DIR, f), 'utf-8'));
        if (note.date === today || note.date === yesterday) {
          if (note.content && note.content.length > 50) {
            recentNotes.push(note);
          }
        }
      } catch { /* ignore malformed note file */ }
    }

    if (recentNotes.length === 0) return [];

    // Build context from notes
    const notesText = recentNotes.map(n => {
      const label = n.type === 'audio' ? 'Audio Note' : 'Text Note';
      return `--- ${label}: ${n.title} (${n.date}) ---\n${n.content.substring(0, 4000)}`;
    }).join('\n\n');

    const prompt = `You are a trading analyst extracting actionable trade setups from a trader's daily notes/audio recordings.

Extract EVERY specific trade setup, price level, or actionable insight mentioned. Be thorough.

Notes:
${notesText}

Return valid JSON only (no markdown):
[
  {
    "ticker": "SYMBOL",
    "bias": "long" | "short" | "watch",
    "setup": "concise 1-sentence description with specific price levels",
    "entry": "$XXX or null",
    "stop": "$XXX or null",
    "target": "$XXX or null",
    "keyLevel": "$XXX key support/resistance level or null",
    "catalyst": "brief catalyst if mentioned or null"
  }
]

Rules:
- Include ALL tickers mentioned with any actionable context
- Always include dollar amounts when mentioned
- If bias isn't clear, use "watch"
- Include even vague setups like "watching NVDA at $140" — set bias to "watch"
- Return empty array [] if no actionable setups found`;

    const raw = await callGemini(prompt);
    if (!raw) return [];

    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const setups = JSON.parse(cleaned);
    return Array.isArray(setups) ? setups : [];
  } catch (e) {
    console.error('[WatchlistScanner] Failed to extract note setups:', e.message);
    return [];
  }
}

export async function scanWatchlist() {
  const sectorMap = buildSectorMap();
  const allTickers = WATCHLIST.flatMap(g => g.tickers);
  const results = [];
  let scanned = 0;
  let errors = 0;

  for (let i = 0; i < allTickers.length; i += BATCH_SIZE) {
    const batch = allTickers.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(ticker => fetchStockScan(ticker))
    );

    for (const res of batchResults) {
      if (res.status !== 'fulfilled' || !res.value?.success) {
        errors++;
        continue;
      }

      const data = res.value;
      scanned++;
      const setups = [];

      const leader810Buy = detectLeader810dBuy(data.ticker, data.price, data.smas);
      if (leader810Buy) setups.push(leader810Buy);

      const retest = detectBreakoutRetest(data.bars, data.price, data.smas, data.weekHigh52);
      if (retest) setups.push(retest);

      const downtrendBreak = detectDowntrendBreak(data.bars, data.price);
      if (downtrendBreak) setups.push(downtrendBreak);

      const uptrendBreak = detectUptrendBreak(data.bars, data.price);
      if (uptrendBreak) setups.push(uptrendBreak);

      const volSurge = detectVolumeSurge(data.bars, data.avgVolume);
      if (volSurge) setups.push(volSurge);

      // Detect chart patterns (badge-level signals)
      const patterns = detectPatterns(data.bars, data.smas, data.rsi, data.avgVolume);

      if (setups.length > 0) {
        // Sort by priority (lowest = best)
        setups.sort((a, b) => a.priority - b.priority);
        const isConnorPick = CONNOR_PICKS.has(data.ticker);
        // Connor picks get priority boost (subtract 0.5 so they sort above same-priority non-picks)
        const effectivePriority = isConnorPick ? setups[0].priority - 0.5 : setups[0].priority;
        results.push({
          ticker: data.ticker,
          sector: sectorMap[data.ticker] || 'Unknown',
          price: data.price,
          topPriority: effectivePriority,
          isConnorPick,
          patterns,
          setups,
          smas: data.smas,
          rsi:  data.rsi,
        });
      }
    }

    if (i + BATCH_SIZE < allTickers.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // Sort by priority, keep top 25
  results.sort((a, b) => a.topPriority - b.topPriority || b.setups.length - a.setups.length);
  const topResults = results.slice(0, 25);

  // ── Merge setups from today's audio/text notes ──
  let noteSetupsCount = 0;
  try {
    console.log('[WatchlistScanner] Extracting setups from today\'s notes...');
    const noteSetups = await extractNoteSetups();
    noteSetupsCount = noteSetups.length;

    if (noteSetups.length > 0) {
      console.log(`[WatchlistScanner] Found ${noteSetups.length} setups from notes`);

      for (const ns of noteSetups) {
        if (!ns.ticker) continue;
        const ticker = ns.ticker.toUpperCase();

        // Build the setup object
        const parts = [ns.setup || ''];
        if (ns.entry) parts.push(`Entry: ${ns.entry}`);
        if (ns.stop) parts.push(`Stop: ${ns.stop}`);
        if (ns.target) parts.push(`Target: ${ns.target}`);
        if (ns.keyLevel) parts.push(`Key level: ${ns.keyLevel}`);
        if (ns.catalyst) parts.push(ns.catalyst);

        const noteSetup = {
          type: ns.bias === 'long' ? 'notes_long' : ns.bias === 'short' ? 'notes_short' : 'notes_watch',
          priority: 0, // highest priority — user's own analysis
          label: ns.bias === 'long' ? 'Notes: Long' : ns.bias === 'short' ? 'Notes: Short' : 'Notes: Watch',
          description: parts.join(' — '),
          metrics: { entry: ns.entry, stop: ns.stop, target: ns.target, keyLevel: ns.keyLevel },
        };

        // Check if ticker already in results
        const existing = topResults.find(r => r.ticker === ticker);
        if (existing) {
          // Prepend note setup (highest priority)
          existing.setups.unshift(noteSetup);
          existing.hasNoteSetup = true;
          existing.topPriority = Math.min(existing.topPriority, 0);
        } else {
          // Add as new entry
          topResults.push({
            ticker,
            sector: sectorMap[ticker] || 'Notes',
            price: null,
            topPriority: 0,
            isConnorPick: CONNOR_PICKS.has(ticker),
            hasNoteSetup: true,
            setups: [noteSetup],
          });
        }
      }

      // Re-sort: note setups bubble to top
      topResults.sort((a, b) => a.topPriority - b.topPriority || b.setups.length - a.setups.length);
    }
  } catch (e) {
    console.error('[WatchlistScanner] Note setup merge failed:', e.message);
  }

  // AI quality scoring — adds aiScore, aiEntry, aiStop, aiTarget, aiNote to each result
  try {
    console.log('[WatchlistScanner] Running AI scoring...');
    await aiScoreSetups(topResults);
  } catch (e) {
    console.error('[WatchlistScanner] AI scoring error:', e.message);
  }

  // Auto-alert via WhatsApp for new high-priority setups
  sendSetupAlerts(topResults);

  return {
    success: true,
    scannedAt: new Date().toISOString(),
    totalTickers: allTickers.length,
    scanned,
    errors,
    flagged: results.length,
    earningsFiltered,
    noteSetups: noteSetupsCount,
    results: topResults,
  };
}
