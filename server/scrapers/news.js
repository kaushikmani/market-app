import { polygonGet } from '../services/polygon.js';

// Fetch latest market news from Polygon — no browser required
export async function scrapeNews() {
  try {
    const data = await polygonGet('/v2/reference/news', {
      limit: 50,
      order: 'desc',
      sort: 'published_utc',
    });

    const articles = (data.results || []).map(item => ({
      ticker:    item.tickers?.[0] || null,
      tickers:   item.tickers || [],
      company:   item.tickers?.[0] || null,
      summary:   item.description || item.title,
      title:     item.title,
      url:       item.article_url,
      source:    item.publisher?.name || null,
      imageUrl:  item.image_url || null,
      sentiment: null,          // Polygon free tier doesn't include sentiment
      publishedAt: item.published_utc,
    }));

    return { articles, success: true };
  } catch (error) {
    return { articles: [], success: false, error: error.message };
  }
}
