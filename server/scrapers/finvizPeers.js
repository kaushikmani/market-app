const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function extractCellText(tdHtml) {
  // First try to get text from <a> tag (primary content)
  const anchorMatch = tdHtml.match(/<a[^>]*>(.*?)<\/a>/);
  if (anchorMatch) return anchorMatch[1].replace(/<[^>]+>/g, '').trim();

  // Fall back to the first direct text content, ignoring tooltip attributes
  // Remove data-boxover content and nested tags
  const cleaned = tdHtml
    .replace(/data-boxover="[^"]*"/g, '')
    .replace(/<span[^>]*>.*?<\/span>/gs, '')
    .replace(/<[^>]+>/g, '')
    .trim();
  return cleaned;
}

export async function scrapeFinvizPeers(tickers) {
  const tickerList = tickers.split(',').map(t => t.trim()).filter(Boolean);
  if (tickerList.length === 0) return { peers: [], success: true };

  try {
    const tickerParam = tickerList.join(',');
    const url = `https://finviz.com/screener.ashx?v=111&t=${tickerParam}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const html = await res.text();

    const peers = [];
    // Find data rows (they have valign="top" and the styled-row class)
    const rowRegex = /<tr[^>]*valign="top"[^>]*>([\s\S]*?)<\/tr>/g;
    let m;
    while ((m = rowRegex.exec(html)) !== null) {
      const rawCells = [];
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
      let cm;
      while ((cm = cellRegex.exec(m[1])) !== null) {
        rawCells.push(cm[1]);
      }

      if (rawCells.length < 8) continue;

      // Cell layout: 0=No, 1=Ticker(in <a>), 2=Company, 3=Sector, 4=Industry, 5=Country, 6=MktCap, 7=P/E, 8=Price(in <a>), 9=Change, 10=Volume
      const ticker = extractCellText(rawCells[1]);
      if (!ticker || !/^[A-Z]{1,5}$/.test(ticker)) continue;

      peers.push({
        ticker,
        company: extractCellText(rawCells[2]),
        sector: extractCellText(rawCells[3]),
        industry: extractCellText(rawCells[4]),
        country: extractCellText(rawCells[5]),
        marketCap: extractCellText(rawCells[6]),
        pe: extractCellText(rawCells[7]),
        price: extractCellText(rawCells[8]),
        change: extractCellText(rawCells[9]),
        volume: extractCellText(rawCells[10]),
      });
    }

    return { peers: peers.slice(0, 15), success: true };
  } catch (error) {
    return { peers: [], success: false, error: error.message };
  }
}
