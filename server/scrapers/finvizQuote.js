import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function scrapeFinvizQuote(ticker) {
  try {
    const url = `https://finviz.com/quote.ashx?t=${encodeURIComponent(ticker)}&p=d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Finviz returned ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    // Company name
    const companyName = $('[class*="quote-header_ticker-wrapper_company"]').first().text().trim();

    // Sector / industry from breadcrumb links
    let sector = '';
    let industry = '';
    $('a[href*="sec_"]').each((_, el) => { if (!sector) sector = $(el).text().trim(); });
    $('a[href*="ind_"]').each((_, el) => { if (!industry) industry = $(el).text().trim(); });

    // Price block — look for the right-side header price elements
    let price = '', change = '', changePct = '';
    const priceEl = $('[class*="quote-header_right"] [class*="quote-header_price"]').first();
    if (priceEl.length) {
      price = priceEl.text().trim();
    } else {
      // Fallback: grab first large number from header right
      const headerText = $('[class*="quote-header_right"]').text();
      const nums = headerText.match(/[\d,]+\.\d+/g);
      if (nums) price = nums.find(n => parseFloat(n.replace(',', '')) > 1) || '';
    }

    // Change values from header right spans
    const changeEls = $('[class*="quote-header_right"] [class*="change"]');
    if (changeEls.length >= 2) {
      change = changeEls.eq(0).text().trim().replace(/[()]/g, '');
      changePct = changeEls.eq(1).text().trim().replace(/[()]/g, '') + '%';
    } else if (changeEls.length === 1) {
      const parts = changeEls.eq(0).text().trim().split(/\s+/);
      if (parts.length >= 2) { change = parts[0]; changePct = parts[1].replace(/[()]/g, '') + '%'; }
    }

    // Company description
    const description = $('[class*="quote_profile-bio"]').first()
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    // Analyst rating from Recom row
    let analystRating = '';
    $('td').each((_, el) => {
      const text = $(el).text().trim();
      if (text === 'Recom') {
        const val = parseFloat($(el).next().find('b').text().trim());
        if (!isNaN(val)) {
          if (val <= 1.5) analystRating = 'Strong Buy';
          else if (val <= 2.5) analystRating = 'Buy';
          else if (val <= 3.5) analystRating = 'Hold';
          else if (val <= 4.5) analystRating = 'Sell';
          else analystRating = 'Strong Sell';
        }
        return false; // break
      }
    });

    // Peer tickers from the Peers tab link
    let peerTickers = [];
    $('a.tab-link').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      if (text === 'Peers' && href.includes('screener.ashx')) {
        const m = href.match(/[?&]t=([A-Z,]+)/);
        if (m) peerTickers = m[1].split(',').filter(Boolean);
        return false;
      }
    });

    // Fundamentals table — key/value pairs
    const fundamentals = {};
    const tdEls = $('table[class*="snapshot-table2"] td').toArray();
    for (let i = 0; i < tdEls.length - 1; i += 2) {
      const labelEl = $(tdEls[i]);
      const valueEl = $(tdEls[i + 1]);

      // Label: strip tooltips (inner spans), get text
      const label = labelEl.clone().find('span').remove().end().text().trim();
      // Value: get text of <b> if present, otherwise text
      let value = valueEl.find('b').first().text().trim() || valueEl.text().trim();

      // Clean up tooltip artifacts from value
      value = value.replace(/[^]*?>\s*/, '').trim();

      if (label && value) fundamentals[label] = value;
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
