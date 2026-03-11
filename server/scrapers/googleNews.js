const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function scrapeGoogleNews(ticker) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(ticker)}+stock&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    const xml = await res.text();

    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')?.trim() || '';
      const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || '';
      const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || '';
      const sourceName = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')?.trim() || '';

      // Extract source from title if not in source tag (Google News format: "Title - Source")
      const source = sourceName || (title.includes(' - ') ? title.split(' - ').pop().trim() : 'Google News');
      const cleanTitle = sourceName ? title : (title.includes(' - ') ? title.split(' - ').slice(0, -1).join(' - ').trim() : title);

      if (cleanTitle) {
        items.push({
          title: cleanTitle,
          url: link,
          source,
          time: pubDate ? new Date(pubDate).toISOString() : null,
          provider: 'google',
        });
      }
    }

    return { news: items.slice(0, 15), success: true };
  } catch (error) {
    return { news: [], success: false, error: error.message };
  }
}
