import { execSync } from 'child_process';

// Nasdaq earnings calendar API — returns JSON directly
function fetchNasdaqEarnings(date) {
  try {
    const raw = execSync(
      `curl -sL -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' -H 'Accept: application/json' 'https://api.nasdaq.com/api/calendar/earnings?date=${date}'`,
      { timeout: 15000, maxBuffer: 5 * 1024 * 1024, encoding: 'utf-8' }
    );

    const json = JSON.parse(raw);
    const rows = json?.data?.rows || [];

    return rows.map(row => ({
      ticker:       row.symbol,
      company:      row.name || '',
      date,
      time:         row.time === 'time-pre-market' ? 'BMO' : row.time === 'time-after-hours' ? 'AMC' : 'TNS',
      epsEstimate:  row.epsForecast ? parseFloat(row.epsForecast.replace('$', '')) : null,
      epsActual:    null,  // not available pre-earnings
      marketCap:    row.marketCap || null,
      noOfEsts:     row.noOfEsts ? parseInt(row.noOfEsts) : null,
    })).filter(r => r.ticker);
  } catch {
    return [];
  }
}

function getWeekDates(offsetWeeks = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offsetWeeks * 7);

  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().substring(0, 10));
  }
  return dates;
}

let cache = { data: null, expiry: 0 };

// ── Lookahead: scan N weeks forward and find the next earnings date per ticker ─
// Reuses per-date Nasdaq cache; 60-min TTL since earnings dates don't move often
const lookaheadCache = new Map(); // key → { data, expiry }
const LOOKAHEAD_TTL_MS = 60 * 60 * 1000;
const dayCache = new Map(); // date → { data, expiry }
const DAY_TTL_MS = 60 * 60 * 1000;

function getNextWeekdays(weeks) {
  const dates = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  let added = 0;
  while (added < weeks * 5) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) {
      dates.push(d.toISOString().substring(0, 10));
      added += 1;
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

async function getDayEarnings(date) {
  const hit = dayCache.get(date);
  if (hit && hit.expiry > Date.now()) return hit.data;
  const data = fetchNasdaqEarnings(date);
  dayCache.set(date, { data, expiry: Date.now() + DAY_TTL_MS });
  return data;
}

export async function fetchEarningsLookahead(tickers, weeksAhead = 8) {
  const wanted = new Set(tickers.map(t => t.toUpperCase()));
  const cacheKey = [...wanted].sort().join(',') + '|' + weeksAhead;
  const hit = lookaheadCache.get(cacheKey);
  if (hit && hit.expiry > Date.now()) return hit.data;

  const dates = getNextWeekdays(weeksAhead);
  const found = {}; // TICKER → { date, time, epsEstimate, company }

  // Scan date-by-date, short-circuit when all tickers are located
  for (const date of dates) {
    if (Object.keys(found).length === wanted.size) break;
    const items = await getDayEarnings(date);
    for (const item of items) {
      const sym = item.ticker?.toUpperCase();
      if (wanted.has(sym) && !found[sym]) {
        found[sym] = {
          date: item.date,
          time: item.time,
          epsEstimate: item.epsEstimate,
          company: item.company,
        };
      }
    }
  }

  const data = {
    success: true,
    data: found,
    missing: [...wanted].filter(t => !found[t]),
    weeksAhead,
    updatedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  };
  lookaheadCache.set(cacheKey, { data, expiry: Date.now() + LOOKAHEAD_TTL_MS });
  return data;
}

export async function fetchEarningsCalendar() {
  const now = Date.now();
  if (cache.data && now < cache.expiry) return cache.data;

  const thisWeek = getWeekDates(0);
  const nextWeek = getWeekDates(1);

  const allDates = [...thisWeek, ...nextWeek];
  const byDate = {};

  await Promise.all(allDates.map(async date => {
    const items = fetchNasdaqEarnings(date);
    if (items.length > 0) byDate[date] = items;
  }));

  const data = {
    success: true,
    thisWeek: thisWeek.map(d => ({ date: d, earnings: byDate[d] || [] })).filter(d => d.earnings.length > 0),
    nextWeek: nextWeek.map(d => ({ date: d, earnings: byDate[d] || [] })).filter(d => d.earnings.length > 0),
    updatedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  };

  cache = { data, expiry: now + 30 * 60 * 1000 };
  return data;
}
