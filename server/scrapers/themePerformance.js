import { getQuotes, getPriceHistory } from '../services/schwab.js';

const THEMES = [
  { name: 'Mag7',                   tickers: ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META'] },
  { name: 'Cybersecurity',          tickers: ['CRWD', 'PANW', 'FTNT', 'ZS', 'OKTA', 'S', 'RBRK'] },
  { name: 'Storage & Memory',       tickers: ['MU', 'WDC', 'STX', 'SNDK', 'PSTG'] },
  { name: 'Chip Design & Processors', tickers: ['AMD', 'INTC', 'ARM', 'AVGO', 'MRVL', 'TXN', 'ADI', 'ON', 'TSM', 'GFS'] },
  { name: 'Semiconductor Equipment',  tickers: ['ASML', 'LRCX', 'KLAC', 'AMAT', 'AMKR', 'ICHR', 'FORM', 'CAMT', 'TER'] },
  { name: 'AI & Custom Silicon',    tickers: ['ALAB', 'CRDO', 'INDI', 'SOLS'] },
  { name: 'Optical/Photonics',      tickers: ['ANET', 'CIEN', 'LITE', 'APH', 'FN', 'POET', 'SKYT', 'AXTI', 'COHR', 'AAOI', 'GLW'] },
  { name: 'AI Infrastructure & Hardware', tickers: ['SMCI', 'VRT', 'DELL', 'HPE', 'CLS', 'SANM', 'FLEX', 'WYFI', 'AEHR', 'PLAB'] },
  { name: 'Software & Cloud',       tickers: ['PLTR', 'ORCL', 'CRM', 'NOW', 'ADBE', 'TEAM', 'WDAY', 'HUBS', 'MDB', 'MNDY', 'SNOW', 'DDOG', 'NET', 'PATH'] },
  { name: 'Crypto & Blockchain',    tickers: ['MSTR', 'COIN', 'HOOD', 'MARA', 'RIOT', 'HUT', 'IREN', 'WULF'] },
  { name: 'Nuclear & Utilities',    tickers: ['VST', 'CEG', 'LEU', 'CCJ', 'UUUU', 'UEC', 'NXE', 'OKLO', 'SMR', 'TLN', 'BWXT', 'NNE', 'GEV'] },
  { name: 'Solar & Clean Energy',   tickers: ['FSLR', 'ENPH', 'BE', 'PLUG', 'EOSE', 'SLDP', 'FLNC'] },
  { name: 'Defense & Aerospace',    tickers: ['LMT', 'RTX', 'NOC', 'GD', 'LHX', 'DRS', 'KTOS', 'BA', 'AVAV', 'RCAT', 'ERJ'] },
  { name: 'Space',                  tickers: ['RKLB', 'ASTS', 'PL', 'BKSY', 'LUNR', 'RDW'] },
  { name: 'Robotics & Automation',  tickers: ['SERV', 'RR', 'SYM', 'ZBRA', 'OUST', 'PDYN'] },
  { name: 'Quantum Computing',      tickers: ['IONQ', 'RGTI', 'QBTS', 'QUBT'] },
  { name: 'Fintech & Insurance',    tickers: ['FI', 'FISV', 'SOFI', 'ALLY', 'DFS', 'LMND'] },
  { name: 'Banks & Payments',       tickers: ['V', 'MA', 'AXP', 'GS', 'JPM', 'BAC', 'C', 'SCHW', 'WFC'] },
  { name: 'China',                  tickers: ['BABA', 'BIDU', 'JD', 'PDD', 'FUTU'] },
  { name: 'EVs & Charging',         tickers: ['LI', 'XPEV', 'RIVN', 'LCID', 'BLNK', 'CHPT'] },
  { name: 'Healthcare & Biotech',   tickers: ['UNH', 'ABBV', 'JNJ', 'MRK', 'LLY', 'NVO', 'AMGN', 'MRNA', 'CRSP'] },
  { name: 'Housing & Real Estate',  tickers: ['DHI', 'LEN', 'PHM', 'TOL', 'RKT', 'CBRE', 'DLR', 'EQIX'] },
  { name: 'Social & Media',         tickers: ['RDDT', 'SNAP', 'PINS', 'SPOT', 'TTD', 'APP', 'DIS', 'NFLX'] },
  { name: 'Consumer & Retail',      tickers: ['HD', 'WMT', 'NKE', 'KO', 'PG', 'CAVA'] },
  { name: 'Restaurants',            tickers: ['CMG', 'COCO', 'EAT', 'SHAK', 'WING'] },
  { name: 'Travel & Leisure',       tickers: ['ABNB', 'BKNG', 'EXPE', 'CCL', 'RCL', 'NCLH', 'DAL'] },
  { name: 'Oil & Gas',              tickers: ['XOM', 'BP', 'SHEL', 'CVX', 'DVN', 'OXY'] },
  { name: 'Materials & Industrial', tickers: ['DOW', 'CAT', 'HON', 'SCCO', 'FCX', 'ALB'] },
  { name: 'Battery & EV Materials', tickers: ['ABAT', 'AMPX', 'ENVX', 'MVST', 'QS'] },
  { name: 'Meme & Speculative',     tickers: ['AMC', 'GME', 'PTON'] },
];

function tradingDaysAgo(n) {
  const d = new Date();
  let count = 0;
  while (count < n) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) count++;
  }
  return d;
}

function ytdStartDate() {
  const d = new Date(new Date().getFullYear() - 1, 11, 31);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d;
}

const RANGE_TRADING_DAYS = { '2d': 2, '3d': 3, '1w': 5, '1m': 21, '3m': 63, '1y': 252 };

// Cache
const cache     = {};
const cacheTime = {};
const TTL       = { today: 2 * 60_000, historical: 30 * 60_000 };

export async function fetchThemePerformance(range = 'today') {
  const now = Date.now();
  const ttl = range === 'today' ? TTL.today : TTL.historical;
  if (cache[range] && now - (cacheTime[range] || 0) < ttl) return cache[range];

  const allTickers = [...new Set(THEMES.flatMap(t => t.tickers))];

  // Always fetch current quotes in one batch call
  const quotes = await getQuotes(allTickers);

  // For historical ranges, fetch start-date close prices
  let startPriceMap = null;
  if (range !== 'today') {
    const startDate = range === 'ytd' ? ytdStartDate() : tradingDaysAgo(RANGE_TRADING_DAYS[range] ?? 5);
    const startMs   = startDate.getTime();
    const endMs     = startDate.getTime() + 3 * 86400_000; // include a few days forward to handle holidays

    // Batch fetch price history for all tickers (small chunks + delay to avoid 429)
    startPriceMap = {};
    const CHUNK = 8;
    for (let i = 0; i < allTickers.length; i += CHUNK) {
      const chunk = allTickers.slice(i, i + CHUNK);
      await Promise.all(chunk.map(async (ticker) => {
        try {
          const candles = await getPriceHistory(ticker, { days: 1, startDate: startMs, endDate: endMs });
          if (candles.length > 0) startPriceMap[ticker] = candles[0].c;
        } catch { /* skip on error */ }
      }));
      if (i + CHUNK < allTickers.length) await new Promise(r => setTimeout(r, 250));
    }
  }

  const themes = THEMES.map(theme => {
    const stocks = theme.tickers.map(sym => {
      const q = quotes[sym];
      if (!q?.price) return null;

      let changePct;
      if (range === 'today') {
        changePct = q.changePct;
        if (changePct == null) return null;
      } else {
        const startPrice = startPriceMap?.[sym];
        if (!startPrice) return null;
        changePct = ((q.price - startPrice) / startPrice) * 100;
      }

      return { symbol: sym, price: q.price, changePct: Math.round(changePct * 100) / 100 };
    }).filter(Boolean);

    if (stocks.length === 0) return null;
    const avg = stocks.reduce((s, st) => s + st.changePct, 0) / stocks.length;
    return { name: theme.name, changePct: Math.round(avg * 100) / 100, stocks };
  }).filter(Boolean);

  const result = { themes, range, updatedAt: new Date().toLocaleTimeString() };
  cache[range]     = result;
  cacheTime[range] = now;
  return result;
}
