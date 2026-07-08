import 'dotenv/config';
import fs from 'fs';
import { schwabGet } from './services/schwab.js';

const TRADES = JSON.parse(fs.readFileSync('/tmp/bulltard_trades.json', 'utf-8'));

// Load themes from themePerformance.js
const { default: themeMod } = await import('./scrapers/themePerformance.js')
  .then(m => ({ default: m }))
  .catch(() => ({ default: null }));

// Re-read themes directly (file has named constant THEMES not exported)
const tpSrc = fs.readFileSync('./scrapers/themePerformance.js', 'utf-8');
const themeMatch = tpSrc.match(/const THEMES = (\[[\s\S]*?\n\];)/);
let THEMES = [];
if (themeMatch) {
  // eslint-disable-next-line no-eval
  THEMES = eval(themeMatch[1]);
}

// Build ticker -> theme map (first match wins)
const tickerTheme = {};
for (const t of THEMES) {
  for (const sym of t.tickers) {
    if (!tickerTheme[sym]) tickerTheme[sym] = t.name;
  }
}

// Unique tickers from trades
const tickers = [...new Set(TRADES.map(t => t.ticker))];
console.log(`Fetching chains for ${tickers.length} tickers...`);

// Fetch full chain per ticker (raw, not aggregated)
const chains = {};
let ok = 0, fail = 0;
for (const tk of tickers) {
  try {
    const data = await schwabGet('/chains', {
      symbol: tk.toUpperCase(),
      contractType: 'ALL',
      strikeCount: 50,
      optionType: 'ALL',
      includeUnderlyingQuote: true,
    });
    if (!data || data.status === 'FAILED') { fail++; continue; }
    chains[tk] = data;
    ok++;
  } catch (e) {
    fail++;
    console.warn(`  ${tk}: ${e.message.slice(0, 80)}`);
  }
  await new Promise(r => setTimeout(r, 120));
}
console.log(`Chains ok=${ok} fail=${fail}\n`);

function findContract(chain, trade) {
  if (!chain) return null;
  const map = trade.side === 'CALL' ? chain.callExpDateMap : chain.putExpDateMap;
  if (!map) return null;
  // keys like "2026-05-15:24" (date:DTE)
  const dateKey = Object.keys(map).find(k => k.startsWith(trade.exp));
  if (!dateKey) return null;
  const strikes = map[dateKey];
  // strike keys are strings like "75.0"
  const strikeKey = Object.keys(strikes).find(k => Math.abs(parseFloat(k) - trade.strike) < 0.01);
  if (!strikeKey) return null;
  const contracts = strikes[strikeKey];
  return contracts?.[0] || null;
}

function midPrice(c) {
  if (!c) return null;
  const bid = c.bid, ask = c.ask, last = c.last, mark = c.mark;
  if (bid != null && ask != null && bid > 0 && ask > 0) return (bid + ask) / 2;
  if (mark != null && mark > 0) return mark;
  if (last != null && last > 0) return last;
  return null;
}

const enriched = TRADES.map(t => {
  const c = findContract(chains[t.ticker], t);
  const mid = midPrice(c);
  const notional = mid != null ? t.size * mid * 100 : null;
  return {
    ...t,
    premium: mid,
    notional,
    theme: tickerTheme[t.ticker] || 'Unclassified',
    underlyingPrice: chains[t.ticker]?.underlyingPrice ?? null,
    matched: !!c,
  };
});

const matched = enriched.filter(e => e.notional != null);
const unmatched = enriched.filter(e => e.notional == null);

console.log(`Matched contracts: ${matched.length}/${enriched.length}\n`);

// Sort by notional desc
matched.sort((a, b) => b.notional - a.notional);

const fmt = (n) => n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : `$${(n/1e3).toFixed(0)}k`;

// Group by theme
const byTheme = {};
for (const e of matched) {
  (byTheme[e.theme] = byTheme[e.theme] || []).push(e);
}

// Theme totals
const themeTotals = Object.entries(byTheme).map(([theme, trades]) => ({
  theme,
  total: trades.reduce((s, t) => s + t.notional, 0),
  count: trades.length,
  trades,
})).sort((a, b) => b.total - a.total);

console.log('═══ TOP 20 TRADES BY $ NOTIONAL ═══');
console.log('rank  ticker  side   strike    exp         contracts    premium    notional     theme');
matched.slice(0, 20).forEach((t, i) => {
  console.log(
    `${String(i+1).padStart(3)}.  ${t.ticker.padEnd(6)} ${t.side.padEnd(5)} ${String(t.strike).padStart(7)}  ${t.exp}  ${String(t.size).padStart(9)}  ${('$' + t.premium.toFixed(2)).padStart(8)}  ${fmt(t.notional).padStart(10)}  ${t.theme}`
  );
});

console.log('\n═══ THEME TOTALS (matched trades only) ═══');
console.log('theme                              count    total $       avg $');
themeTotals.forEach(tt => {
  const avg = tt.total / tt.count;
  console.log(`${tt.theme.padEnd(34)} ${String(tt.count).padStart(5)}   ${fmt(tt.total).padStart(8)}   ${fmt(avg).padStart(8)}`);
});

const grandTotal = matched.reduce((s, t) => s + t.notional, 0);
const meanByDollar = grandTotal / matched.length;
console.log(`\nGrand total notional: ${fmt(grandTotal)}`);
console.log(`Mean $ per trade:     ${fmt(meanByDollar)}`);

console.log('\n═══ DETAILED BY THEME ═══');
themeTotals.forEach(tt => {
  console.log(`\n── ${tt.theme} (${fmt(tt.total)}, ${tt.count} trades) ──`);
  tt.trades.forEach(t => {
    console.log(
      `  ${t.ticker.padEnd(6)} ${t.side.padEnd(5)} ${String(t.strike).padStart(6)} ${t.exp}  ${String(t.size).padStart(6)}c  ×$${t.premium.toFixed(2)} = ${fmt(t.notional).padStart(10)}`
    );
  });
});

if (unmatched.length) {
  console.log(`\n═══ UNMATCHED (${unmatched.length}) ═══`);
  unmatched.forEach(u => {
    console.log(`  ${u.ticker} ${u.side} ${u.strike} ${u.exp} — chain=${u.matched ? 'OK' : 'no chain/strike'}`);
  });
}

fs.writeFileSync('/tmp/bulltard_ranked.json', JSON.stringify({ matched, unmatched, themeTotals, grandTotal, meanByDollar }, null, 2));
console.log('\nSaved: /tmp/bulltard_ranked.json');
