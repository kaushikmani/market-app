const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function scrapeFinvizQuote(ticker) {
  try {
    const url = `https://finviz.com/quote.ashx?t=${encodeURIComponent(ticker)}&p=d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const html = await res.text();

    // Company name from quote-header_ticker-wrapper_company
    const companyMatch = html.match(/quote-header_ticker-wrapper_company[^>]*>(.*?)<\/a>/s);
    const companyName = companyMatch ? companyMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // Sector and industry from quote-links
    let sector = '';
    let industry = '';
    const sectorMatch = html.match(/<a[^>]*href="[^"]*sec_[^"]*"[^>]*>(.*?)<\/a>/);
    if (sectorMatch) sector = sectorMatch[1].replace(/<[^>]+>/g, '').trim();
    const industryMatch = html.match(/<a[^>]*href="[^"]*ind_[^"]*"[^>]*>(.*?)<\/a>/);
    if (industryMatch) industry = industryMatch[1].replace(/<[^>]+>/g, '').trim();

    // Price, change from quote-header_right block
    let price = '';
    let change = '';
    let changePct = '';
    const priceBlock = html.match(/quote-header_right.*?<\/div><\/div><\/div>/s);
    if (priceBlock) {
      const nums = priceBlock[0].replace(/<[^>]+>/g, ' ').match(/[+-]?\d+\.\d+/g);
      if (nums && nums.length >= 3) {
        // Format: date parts... price dollarChange pctChange
        // Find the price (largest number that looks like a stock price)
        price = nums.find(n => parseFloat(n) > 10 && !n.startsWith('+') && !n.startsWith('-')) || '';
        const priceIdx = nums.indexOf(price);
        if (priceIdx >= 0 && priceIdx + 2 < nums.length) {
          change = nums[priceIdx + 1];
          changePct = nums[priceIdx + 2] + '%';
        }
      }
    }

    // Company description/bio
    let description = '';
    const bioMatch = html.match(/quote_profile-bio">(.*?)<\/div>/s);
    if (bioMatch) {
      description = bioMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#\d+;/g, '')
        .trim();
    }

    // Analyst ratings/target from the page
    let analystRating = '';
    const ratingMatch = html.match(/Recom.*?<b>(.*?)<\/b>/s);
    if (ratingMatch) {
      const val = parseFloat(ratingMatch[1]);
      if (!isNaN(val)) {
        if (val <= 1.5) analystRating = 'Strong Buy';
        else if (val <= 2.5) analystRating = 'Buy';
        else if (val <= 3.5) analystRating = 'Hold';
        else if (val <= 4.5) analystRating = 'Sell';
        else analystRating = 'Strong Sell';
      }
    }

    // Peer tickers from tab-link with "Peers" text
    let peerTickers = [];
    const peersMatch = html.match(/<a[^>]*class="[^"]*tab-link[^"]*"[^>]*href="screener\.ashx\?[^"]*t=([A-Z,]+)"[^>]*>\s*Peers\s*<\/a>/);
    if (peersMatch) {
      peerTickers = peersMatch[1].split(',');
    }

    // Fundamentals from snapshot-table2
    const fundamentals = {};
    const tableMatch = html.match(/snapshot-table2.*?<\/table>/s);
    if (tableMatch) {
      const cells = [];
      const cellRegex = /<td[^>]*>(.*?)<\/td>/gs;
      let m;
      while ((m = cellRegex.exec(tableMatch[0])) !== null) {
        // Strip HTML — handle Finviz tooltip spans that have unescaped > in attributes
        let cellText = m[1]
          .replace(/<span[^]*?<\/span>/gs, '')  // remove full span elements (tooltips)
          .replace(/<[^>]*>/g, '')              // remove remaining tags
          .trim();
        // If tooltip artifacts leaked through (e.g. 'BMO = ...delay=[300]">Earnings'),
        // extract just the text after the last "> or ]">
        const tooltipLeak = cellText.match(/(?:delay=\[\d+\])?"\s*>\s*(.+)$/s);
        if (tooltipLeak) {
          cellText = tooltipLeak[1].trim();
        }
        cells.push(cellText);
      }
      for (let i = 0; i < cells.length - 1; i += 2) {
        if (cells[i] && cells[i + 1]) {
          fundamentals[cells[i]] = cells[i + 1];
        }
      }
    }

    return {
      companyName,
      description,
      analystRating,
      sector,
      industry,
      price,
      change,
      changePct,
      peerTickers,
      fundamentals,
      ticker: ticker.toUpperCase(),
      success: true,
    };
  } catch (error) {
    return { ticker: ticker.toUpperCase(), success: false, error: error.message };
  }
}
