import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function scrapeFinvizPeers(tickers) {
  const tickerList = tickers.split(',').map(t => t.trim()).filter(Boolean);
  if (tickerList.length === 0) return { peers: [], success: true };

  try {
    const tickerParam = tickerList.join(',');
    const url = `https://finviz.com/screener.ashx?v=111&t=${tickerParam}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Finviz returned ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    const peers = [];

    // Each result row has class "styled-row" (or alternating) inside the screener table
    $('table#screener-views-table tr, table.screener-table tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 10) return;

      // Column layout: 0=No, 1=Ticker, 2=Company, 3=Sector, 4=Industry,
      //                5=Country, 6=MktCap, 7=P/E, 8=Price, 9=Change, 10=Volume
      const ticker = cells.eq(1).find('a').first().text().trim();
      if (!ticker || !/^[A-Z]{1,6}$/.test(ticker)) return;

      peers.push({
        ticker,
        company:   cells.eq(2).text().trim(),
        sector:    cells.eq(3).text().trim(),
        industry:  cells.eq(4).text().trim(),
        country:   cells.eq(5).text().trim(),
        marketCap: cells.eq(6).text().trim(),
        pe:        cells.eq(7).text().trim(),
        price:     cells.eq(8).find('a').first().text().trim() || cells.eq(8).text().trim(),
        change:    cells.eq(9).text().trim(),
        volume:    cells.eq(10).text().trim(),
      });
    });

    return { peers: peers.slice(0, 15), success: true };
  } catch (error) {
    return { peers: [], success: false, error: error.message };
  }
}
