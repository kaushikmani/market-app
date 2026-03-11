const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function scrapeFinvizNews(ticker) {
  try {
    const url = `https://finviz.com/quote.ashx?t=${encodeURIComponent(ticker)}&p=d`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    const html = await res.text();

    const items = [];

    // Finviz news table: <table id="news-table"> with rows containing date/time and links
    const newsTableMatch = html.match(/<table[^>]*id="news-table"[^>]*>([\s\S]*?)<\/table>/);
    if (!newsTableMatch) return { news: [], success: true };

    const tableHtml = newsTableMatch[1];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    let match;
    let currentDate = '';

    while ((match = rowRegex.exec(tableHtml)) !== null) {
      const rowHtml = match[1];

      // Extract cells
      const cells = [];
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
      let tdMatch;
      while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
        cells.push(tdMatch[1].trim());
      }

      if (cells.length < 2) continue;

      // First cell: date + time or just time
      const timeCell = cells[0].replace(/<[^>]+>/g, '').trim();
      // If it contains a date (e.g., "Feb-14-26"), update currentDate
      if (timeCell.match(/[A-Z][a-z]{2}-\d{2}/)) {
        const parts = timeCell.split(/\s+/);
        if (parts.length >= 2) {
          currentDate = parts[0];
        }
      }

      // Second cell: the link
      const linkMatch = cells[1]?.match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
      if (!linkMatch) continue;

      const articleUrl = linkMatch[1];
      const title = linkMatch[2].replace(/<[^>]+>/g, '').trim();

      // Extract source from span after the link
      const sourceMatch = cells[1].match(/<span[^>]*>([\s\S]*?)<\/span>/);
      const source = sourceMatch ? sourceMatch[1].replace(/<[^>]+>/g, '').replace(/[()]/g, '').trim() : 'Finviz';

      if (title) {
        items.push({
          title,
          url: articleUrl,
          source,
          time: `${currentDate} ${timeCell.split(/\s+/).pop()}`,
          provider: 'finviz',
        });
      }
    }

    return { news: items.slice(0, 15), success: true };
  } catch (error) {
    return { news: [], success: false, error: error.message };
  }
}
