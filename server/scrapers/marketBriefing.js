import { getXFeed } from './xNews.js';
import { NEWS_ACCOUNTS, TRADING_ACCOUNTS } from '../data/xWhitelist.js';

// X feed from whitelisted profiles (last 24h)
async function fetchMarketXPosts() {
  try {
    const feed = await getXFeed();
    return feed;
  } catch (e) {
    console.log('[MarketBriefing] X feed error:', e.message);
    return [];
  }
}

export async function scrapeMarketBriefing() {
  try {
    const feed = await fetchMarketXPosts();

    // Split by account category — source is "@handle"
    const news = [];
    const trading = [];
    for (const item of feed) {
      const handle = (item.source || '').replace(/^@/, '');
      if (NEWS_ACCOUNTS.has(handle)) {
        news.push(item);
      } else {
        trading.push(item);
      }
    }

    return {
      news,
      trading,
      success: true,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return { news: [], trading: [], success: false, error: error.message };
  }
}
