const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const MOCK_DATA = [
  { ticker: 'NVDA', company: 'NVIDIA Corporation', mktCap: '3.2T', price: 875.30, pmPrice: 891.20, pmChgPct: 1.82, pmVol: '2.1M', chgPct: 0.45, avgVol: '45.2M', volume: '38.1M', volChgPct: -15.7 },
  { ticker: 'TSLA', company: 'Tesla, Inc.', mktCap: '780B', price: 245.10, pmPrice: 249.80, pmChgPct: 1.92, pmVol: '1.8M', chgPct: -0.32, avgVol: '98.5M', volume: '82.3M', volChgPct: -16.4 },
  { ticker: 'AAPL', company: 'Apple Inc.', mktCap: '3.5T', price: 228.50, pmPrice: 230.10, pmChgPct: 0.70, pmVol: '890K', chgPct: 0.12, avgVol: '52.1M', volume: '48.7M', volChgPct: -6.5 },
  { ticker: 'META', company: 'Meta Platforms, Inc.', mktCap: '1.5T', price: 585.20, pmPrice: 589.90, pmChgPct: 0.80, pmVol: '650K', chgPct: 1.10, avgVol: '18.3M', volume: '15.2M', volChgPct: -16.9 },
  { ticker: 'AMZN', company: 'Amazon.com, Inc.', mktCap: '2.1T', price: 198.70, pmPrice: 200.30, pmChgPct: 0.81, pmVol: '720K', chgPct: 0.55, avgVol: '42.8M', volume: '36.5M', volChgPct: -14.7 },
];

function parseNumber(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/,/g, '').replace('%', '')) || 0;
}

export async function scrapePreMarketMovers() {
  try {
    const url = 'https://finviz.com/screener.ashx?v=152&s=ta_topgainers&o=-premarket';
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const html = await res.text();

    // Parse the screener table rows
    const movers = [];

    // Find the main data table - Finviz uses table with id="screener-views-table" or class="screener_table"
    // Each data row has class="screener-link-primary" cells or similar patterns
    // The v=152 view shows: No., Ticker, Company, Sector, Industry, Country, Market Cap, P/E, Price, Change, Volume
    // We need to extract what we can and supplement

    // Match all table rows that contain ticker data
    const rowRegex = /<tr[^>]*class="[^"]*styled-row[^"]*"[^>]*>(.*?)<\/tr>/gs;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const row = rowMatch[1];
      const cells = [];
      const cellRegex = /<td[^>]*>(.*?)<\/td>/gs;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        // Strip HTML tags from cell content
        const text = cellMatch[1].replace(/<[^>]+>/g, '').trim();
        cells.push(text);
      }

      if (cells.length >= 10) {
        // v=152 columns: No, Ticker, Company, Sector, Industry, Country, Market Cap, P/E, Price, Change, Volume
        const ticker = cells[1];
        const company = cells[2];
        const mktCap = cells[6];
        const price = parseNumber(cells[8]);
        const chgPct = parseNumber(cells[9]);
        const volume = cells[10] || '';

        if (ticker && price > 0) {
          movers.push({
            ticker,
            company,
            mktCap,
            price,
            pmPrice: null,
            pmChgPct: chgPct,
            pmVol: '',
            chgPct,
            avgVol: '',
            volume,
            volChgPct: 0,
          });
        }
      }
    }

    // If standard row parsing didn't work, try alternative pattern
    if (movers.length === 0) {
      // Try matching table rows without the styled-row class
      const altRowRegex = /<tr[^>]*>((?:<td[^>]*>(?:(?!<\/tr>).)*<\/td>\s*){8,})<\/tr>/gs;
      let altMatch;
      while ((altMatch = altRowRegex.exec(html)) !== null) {
        const row = altMatch[1];
        const cells = [];
        const cellRegex = /<td[^>]*>(.*?)<\/td>/gs;
        let cellMatch;
        while ((cellMatch = cellRegex.exec(row)) !== null) {
          const text = cellMatch[1].replace(/<[^>]+>/g, '').trim();
          cells.push(text);
        }

        // Look for a cell that looks like a ticker (all uppercase, 1-5 chars)
        const tickerIdx = cells.findIndex(c => /^[A-Z]{1,5}$/.test(c));
        if (tickerIdx >= 0 && cells.length > tickerIdx + 5) {
          const ticker = cells[tickerIdx];
          const company = cells[tickerIdx + 1] || '';
          // Find price-like value (number with decimal)
          const priceIdx = cells.findIndex((c, i) => i > tickerIdx && /^\d+\.\d{2}$/.test(c.replace(/,/g, '')));
          const price = priceIdx >= 0 ? parseNumber(cells[priceIdx]) : 0;
          // Find change percentage
          const chgIdx = cells.findIndex((c, i) => i > tickerIdx && /^[+-]?\d+\.\d+%$/.test(c));
          const chgPct = chgIdx >= 0 ? parseNumber(cells[chgIdx]) : 0;

          if (ticker && price > 0) {
            movers.push({
              ticker,
              company,
              mktCap: '',
              price,
              pmPrice: null,
              pmChgPct: chgPct,
              pmVol: '',
              chgPct,
              avgVol: '',
              volume: '',
              volChgPct: 0,
            });
          }
        }
      }
    }

    if (movers.length > 0) {
      // Sort by pmChgPct descending, filter >= 0.5%
      const filtered = movers
        .filter(m => m.pmChgPct >= 0.5)
        .sort((a, b) => b.pmChgPct - a.pmChgPct);

      return {
        success: true,
        movers: filtered.length > 0 ? filtered : movers.sort((a, b) => b.pmChgPct - a.pmChgPct).slice(0, 25),
        timestamp: Date.now(),
        source: 'finviz',
      };
    }

    // Fallback to mock data
    console.log('[PreMarketMovers] No data parsed from Finviz, using mock data');
    return {
      success: true,
      movers: MOCK_DATA,
      timestamp: Date.now(),
      source: 'mock',
    };
  } catch (error) {
    console.error('[PreMarketMovers] Scrape failed:', error.message);
    return {
      success: true,
      movers: MOCK_DATA,
      timestamp: Date.now(),
      source: 'mock',
    };
  }
}
