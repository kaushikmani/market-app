import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/ApiService';

export function useMarketData(ticker, enabled = false) {
  const [news, setNews] = useState(null);
  const [stockNews, setStockNews] = useState(null);
  const [finvizQuote, setFinvizQuote] = useState(null);
  const [finvizPeers, setFinvizPeers] = useState(null);
  const [smaData, setSmaData] = useState(null);
  const [marketBriefing, setMarketBriefing] = useState(null);
  const [watchlistScan, setWatchlistScan] = useState(null);
  const [loadingBriefing, setLoadingBriefing] = useState(true);
  const [loadingScan, setLoadingScan] = useState(true);
  const [loadingMarketNews, setLoadingMarketNews] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingPeers, setLoadingPeers] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchAll = useCallback(async () => {
    if (!ticker) return;

    setLoading(true);
    setErrors({});
    setFinvizPeers(null);
    setLoadingPeers(false);

    const results = await Promise.allSettled([
      ApiService.getFinvizQuote(ticker),
      ApiService.getSMAs(ticker),
    ]);

    const [finvizRes, smaRes] = results;

    let quoteData = null;
    if (finvizRes.status === 'fulfilled') {
      quoteData = finvizRes.value;
      setFinvizQuote(quoteData);
    } else {
      setErrors(e => ({ ...e, finvizQuote: finvizRes.reason.message }));
    }

    if (smaRes.status === 'fulfilled') setSmaData(smaRes.value);
    else setErrors(e => ({ ...e, sma: smaRes.reason.message }));

    setLoading(false);

    // Fetch stock-specific news (Google News + Finviz News + X posts) in background
    setLoadingNews(true);
    ApiService.getStockNews(ticker)
      .then(data => setStockNews(data))
      .catch(err => setErrors(e => ({ ...e, stockNews: err.message })))
      .finally(() => setLoadingNews(false));

    // After finvizQuote resolves with peer tickers, fetch peers sequentially
    if (quoteData?.peerTickers?.length > 0) {
      setLoadingPeers(true);
      try {
        const peersData = await ApiService.getFinvizPeers(quoteData.peerTickers.join(','));
        setFinvizPeers(peersData);
      } catch (err) {
        setErrors(e => ({ ...e, finvizPeers: err.message }));
      }
      setLoadingPeers(false);
    }
  }, [ticker]);

  useEffect(() => {
    if (enabled) fetchAll();
  }, [fetchAll, enabled]);

  // Fetch market news + AI sentiment on mount
  useEffect(() => {
    setLoadingMarketNews(true);
    ApiService.getNews()
      .then(newsData => {
        setNews(newsData);
        if (newsData?.articles?.length > 0) {
          const headlines = newsData.articles.map(a => a.summary || a.title).filter(Boolean);
          ApiService.getNewsSentiment(headlines)
            .then(({ scores }) => {
              if (!scores?.length) return;
              setNews({ ...newsData, articles: newsData.articles.map((a, i) => {
                const s = scores.find(sc => sc.index === i);
                return s ? { ...a, sentiment: s.sentiment, sentimentScore: s.score } : a;
              })});
            })
            .catch(() => {});
        }
      })
      .catch(err => setErrors(e => ({ ...e, news: err.message })))
      .finally(() => setLoadingMarketNews(false));
  }, []);

  // Fetch market briefing once on mount (not ticker-dependent)
  useEffect(() => {
    setLoadingBriefing(true);
    ApiService.getMarketBriefing()
      .then(data => setMarketBriefing(data))
      .catch(err => setErrors(e => ({ ...e, marketBriefing: err.message })))
      .finally(() => setLoadingBriefing(false));
  }, []);

  // Fetch watchlist scan once on mount
  useEffect(() => {
    setLoadingScan(true);
    ApiService.getWatchlistScan()
      .then(data => setWatchlistScan(data))
      .catch(err => setErrors(e => ({ ...e, watchlistScan: err.message })))
      .finally(() => setLoadingScan(false));
  }, []);

  return {
    news,
    stockNews,
    finvizQuote,
    finvizPeers,
    smaData,
    marketBriefing,
    watchlistScan,
    loadingBriefing,
    loadingScan,
    loadingMarketNews,
    loading,
    loadingPeers,
    loadingNews,
    errors,
    refetch: fetchAll,
  };
}
