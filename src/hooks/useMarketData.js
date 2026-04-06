import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiService } from '../services/ApiService';

export function useMarketData(ticker, enabled = false) {
  const [news, setNews] = useState(null);
  const [stockNews, setStockNews] = useState(null);
  const [tickerInfo, setTickerInfo] = useState(null);
  const [smaData, setSmaData] = useState(null);
  const [marketBriefing, setMarketBriefing] = useState(null);
  const [watchlistScan, setWatchlistScan] = useState(null);
  const [loadingBriefing, setLoadingBriefing] = useState(true);
  const [loadingScan, setLoadingScan] = useState(true);
  const [loadingMarketNews, setLoadingMarketNews] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [errors, setErrors] = useState({});

  // Track in-flight abort controllers to cancel stale requests
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchAll = useCallback(async () => {
    if (!ticker) return;

    // Cancel any previous in-flight stock fetch
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!mountedRef.current) return;
    setLoading(true);
    setErrors({});

    const results = await Promise.allSettled([
      ApiService.getTickerInfo(ticker),
      ApiService.getSMAs(ticker),
    ]);

    // Bail if this request was superseded or component unmounted
    if (controller.signal.aborted || !mountedRef.current) return;

    const [tickerInfoRes, smaRes] = results;

    if (tickerInfoRes.status === 'fulfilled') {
      setTickerInfo(tickerInfoRes.value);
    } else {
      setErrors(e => ({ ...e, tickerInfo: tickerInfoRes.reason.message }));
    }

    if (smaRes.status === 'fulfilled') setSmaData(smaRes.value);
    else setErrors(e => ({ ...e, sma: smaRes.reason.message }));

    setLoading(false);

    // Background: stock news
    setLoadingNews(true);
    ApiService.getStockNews(ticker)
      .then(data => { if (mountedRef.current && !controller.signal.aborted) setStockNews(data); })
      .catch(err => { if (mountedRef.current && !controller.signal.aborted) setErrors(e => ({ ...e, stockNews: err.message })); })
      .finally(() => { if (mountedRef.current && !controller.signal.aborted) setLoadingNews(false); });
  }, [ticker]);

  useEffect(() => {
    if (enabled) fetchAll();
  }, [fetchAll, enabled]);

  // Fetch market news + AI sentiment on mount — never re-runs
  useEffect(() => {
    setLoadingMarketNews(true);
    ApiService.getNews()
      .then(newsData => {
        if (!mountedRef.current) return;
        setNews(newsData);
        if (newsData?.articles?.length > 0) {
          const headlines = newsData.articles.map(a => a.summary || a.title).filter(Boolean);
          ApiService.getNewsSentiment(headlines)
            .then(({ scores }) => {
              if (!mountedRef.current || !scores?.length) return;
              setNews({ ...newsData, articles: newsData.articles.map((a, i) => {
                const s = scores.find(sc => sc.index === i);
                return s ? { ...a, sentiment: s.sentiment, sentimentScore: s.score } : a;
              })});
            })
            .catch(() => {});
        }
      })
      .catch(err => { if (mountedRef.current) setErrors(e => ({ ...e, news: err.message })); })
      .finally(() => { if (mountedRef.current) setLoadingMarketNews(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoadingBriefing(true);
    ApiService.getMarketBriefing()
      .then(data => { if (mountedRef.current) setMarketBriefing(data); })
      .catch(err => { if (mountedRef.current) setErrors(e => ({ ...e, marketBriefing: err.message })); })
      .finally(() => { if (mountedRef.current) setLoadingBriefing(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoadingScan(true);
    ApiService.getWatchlistScan()
      .then(data => { if (mountedRef.current) setWatchlistScan(data); })
      .catch(err => { if (mountedRef.current) setErrors(e => ({ ...e, watchlistScan: err.message })); })
      .finally(() => { if (mountedRef.current) setLoadingScan(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    news,
    stockNews,
    tickerInfo,
    smaData,
    marketBriefing,
    watchlistScan,
    loadingBriefing,
    loadingScan,
    loadingMarketNews,
    loading,
    loadingNews,
    errors,
    refetch: fetchAll,
  };
}
