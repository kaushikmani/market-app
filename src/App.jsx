import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PriceHeader } from './components/PriceHeader';
import { IndicatorsSection } from './components/IndicatorsSection';
import { VolatilityMetrics } from './components/VolatilityMetrics';
import { MovingAveragesSection } from './components/MovingAveragesSection';
import { NewsSection } from './components/NewsSection';
import { StockNewsSection } from './components/StockNewsSection';
import { StockOverviewSection } from './components/StockOverviewSection';
import { SimilarStocksSection } from './components/SimilarStocksSection';
import { SectionDivider } from './components/SectionDivider';
import { MarketBriefingSection } from './components/MarketBriefingSection';
import { PreMarketMoversSection } from './components/PreMarketMoversSection';
import { GapScannerSection } from './components/GapScannerSection';
import { TodaysSetupsSection } from './components/TodaysSetupsSection';
import { PreMarketReportSection } from './components/PreMarketReportSection';
import { ThemePerformanceSection } from './components/ThemePerformanceSection';
import { WatchlistSidebar } from './components/WatchlistSidebar';
import { TradingNotesSection } from './components/TradingNotesSection';
import { KeyLevelsSection } from './components/KeyLevelsSection';
import { OptionsSection } from './components/OptionsSection';
import { OutlookSection } from './components/OutlookSection';
import { EarningsPreviewSection } from './components/EarningsPreviewSection';
import { EarningsHistorySection } from './components/EarningsHistorySection';
import { StockNotesSection } from './components/StockNotesSection';
import { StockChart } from './components/StockChart';
import { ChartModal } from './components/ChartModal';
import { EarningsCalendarSection } from './components/EarningsCalendarSection';
import { TradingRulesSection } from './components/TradingRulesSection';
import { MarketNarrativeSection } from './components/MarketNarrativeSection';
import { MarketSentimentSection } from './components/MarketSentimentSection';
import { AlertsPanel } from './components/AlertsPanel';
import { CredentialsStatus } from './components/CredentialsStatus';
import { JournalSection } from './components/JournalSection';
import { RightRail } from './components/RightRail';
import { OverviewHero } from './components/OverviewHero';
import { AlertWatchSection } from './components/AlertWatchSection';
import { EarningsWatchSection } from './components/EarningsWatchSection';
import { TradeLogHero } from './components/TradeLogHero';
import { OutlookHero } from './components/OutlookHero';
import { StockHero } from './components/StockHero';
import { AlertToast } from './components/AlertToast';
import { ApiService } from './services/ApiService';
import { useMarketData } from './hooks/useMarketData';
import { useWatchlistPrices } from './hooks/useWatchlistPrices';
import { Theme } from './models/Theme';
import {
  PriceData,
  TechnicalIndicators,
  RSIIndicator,
  BollingerBandIndicator,
  MACDIndicator,
  VolatilityMetrics as VolatilityMetricsModel,
  MovingAverage,
  MAType,
} from './models/Stock';


const TABS = [
  { key: 'market', label: 'Overview' },
  { key: 'stock', label: 'Stocks' },
  { key: 'trades', label: 'Trade Log' },
  { key: 'journal', label: 'Notes' },
  { key: 'outlook', label: 'Outlook' },
];

const TODAY_STR = new Date()
  .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  .toUpperCase()
  .replace(/,/g, ' ·');

function TickerTape({ items }) {
  if (!items || items.length === 0) return null;
  const doubled = [...items, ...items];
  return (
    <div style={{
      borderBottom: '1px solid var(--border-default)',
      background: 'var(--bg-input)',
      overflow: 'hidden',
      height: 30,
      display: 'flex',
      alignItems: 'center',
    }}>
      <div className="tape-strip">
        {doubled.map((t, i) => {
          const up = (t.changePct ?? t.pct ?? 0) >= 0;
          const sym = t.symbol || t.ticker || t.sym;
          const price = t.price ?? t.last ?? 0;
          const pct = t.changePct ?? t.pct ?? 0;
          return (
            <span key={`${sym}-${i}`} className="mono-tape" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
            }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{sym}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{Number(price).toFixed(2)}</span>
              <span style={{ color: up ? 'var(--green)' : 'var(--red)' }}>
                {up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function parseNum(str) {
  if (!str) return null;
  const cleaned = str.replace(/[%,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function buildStockFromTickerInfo(tickerInfo, smaData) {
  const price = tickerInfo?.price || smaData?.price;
  if (!price) return null;

  const change = typeof tickerInfo?.change === 'number' ? tickerInfo.change : 0;
  const prevClose = price - change;

  const priceData = new PriceData(prevClose, price, Math.min(prevClose, price), Math.max(prevClose, price));

  const rsiVal = smaData?.rsi != null ? smaData.rsi : 50;
  const rsi = new RSIIndicator(rsiVal, 14);

  let sma20pct = null;
  let sma50pct = null;
  if (smaData?.success && smaData.smas) {
    if (smaData.smas[20]) sma20pct = smaData.smas[20].pctFromPrice;
    if (smaData.smas[50]) sma50pct = smaData.smas[50].pctFromPrice;
  }
  const bbValue = sma20pct !== null ? Math.min(100, Math.max(0, 50 + sma20pct * 12.5)) : 50;
  const bb = new BollingerBandIndicator(bbValue);
  const macdHist = (sma20pct || 0) - (sma50pct || 0);
  const macd = new MACDIndicator(macdHist, 0, macdHist);
  const indicators = new TechnicalIndicators(rsi, bb, macd);

  const pctFrom50 = sma50pct || 0;
  const adr = smaData?.adr ?? 0;
  const atrFromFifty = smaData?.atrFromFifty ?? 0;
  const volatility = new VolatilityMetricsModel(adr, atrFromFifty, pctFrom50);

  const movingAverages = [];
  if (smaData?.success && smaData.smas) {
    for (const p of [8, 10, 21, 50, 100, 200]) {
      const sma = smaData.smas[p];
      if (sma) movingAverages.push(new MovingAverage(MAType.SMA, p, sma.value, sma.pctFromPrice));
    }
  }

  return { priceData, indicators, volatility, movingAverages };
}

function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const stored = localStorage.getItem('activeTab') || 'market';
    if (stored === 'notes') return 'journal';
    if (stored === 'journal') return 'trades';
    return stored;
  });
  const [ticker, setTicker] = useState(() => localStorage.getItem('lastTicker') || 'AAPL');
  const [tickerInput, setTickerInput] = useState(() => localStorage.getItem('lastTicker') || 'AAPL');
  const [chartModalTicker, setChartModalTicker] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [isWide, setIsWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1280);
  const stockZoneRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth >= 1280);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { news, stockNews, tickerInfo, smaData, marketBriefing, watchlistScan, loadingBriefing, loadingScan, loadingMarketNews, loading, loadingNews, errors } = useMarketData(ticker, activeTab === 'stock');
  const { prices: tapePrices } = useWatchlistPrices();
  const tapeItems = useMemo(() => {
    return Object.entries(tapePrices || {})
      .filter(([, v]) => v && typeof v.price === 'number')
      .slice(0, 30)
      .map(([sym, v]) => ({ sym, price: v.price, pct: v.changePct ?? 0 }));
  }, [tapePrices]);

  const stock = useMemo(() => buildStockFromTickerInfo(tickerInfo, smaData), [tickerInfo, smaData]);

  // Merge Polygon news + MarketBriefing news into a single sorted feed
  const combinedNews = useMemo(() => {
    const polygonArticles = news?.articles || [];
    const briefingNews = (marketBriefing?.news || []).map(item => ({
      title: item.title,
      url: item.url,
      source: item.source,
      publishedAt: item.time,
    }));
    const merged = [...polygonArticles, ...briefingNews].sort((a, b) => {
      const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return tb - ta;
    });
    return { articles: merged };
  }, [news, marketBriefing]);

  // Earnings preview — fetch when earnings are within 30 days
  const [earningsPreview, setEarningsPreview] = useState(null);
  const [earningsPreviewLoading, setEarningsPreviewLoading] = useState(false);
  const [earningsPreviewError, setEarningsPreviewError] = useState(null);

  const earningsDaysAway = null;

  useEffect(() => {
    if (!ticker || earningsDaysAway === null || earningsDaysAway < 0 || earningsDaysAway > 30) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEarningsPreview(null);
      return;
    }
    setEarningsPreviewLoading(true);
    setEarningsPreviewError(null);
    ApiService.getEarningsPreview(ticker)
      .then(data => setEarningsPreview(data))
      .catch(err => setEarningsPreviewError(err.message))
      .finally(() => setEarningsPreviewLoading(false));
  }, [ticker, earningsDaysAway]);

  // Earnings history — fetch when ticker changes
  const [earningsHistory, setEarningsHistory] = useState(null);
  const [earningsHistoryLoading, setEarningsHistoryLoading] = useState(false);

  useEffect(() => {
    if (!ticker) return;
    setEarningsHistoryLoading(true);
    setEarningsHistory(null);
    ApiService.getEarningsHistory(ticker)
      .then(data => setEarningsHistory(data))
      .catch(() => {})
      .finally(() => setEarningsHistoryLoading(false));
  }, [ticker]);

  // Pre-market report — fetch once on mount
  const [preMarketReport, setPreMarketReport] = useState(null);
  const [preMarketLoading, setPreMarketLoading] = useState(true);
  const [preMarketError, setPreMarketError] = useState(null);

  useEffect(() => {
    ApiService.getPreMarketReport()
      .then(data => setPreMarketReport(data))
      .catch(err => setPreMarketError(err.message))
      .finally(() => setPreMarketLoading(false));
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('activeTab', tab);
  };

  const handleTickerSubmit = (e) => {
    e.preventDefault();
    const val = tickerInput.trim().toUpperCase();
    if (val) { setTicker(val); localStorage.setItem('lastTicker', val); }
  };

  const handleTickerClick = (newTicker) => {
    const val = newTicker.trim().toUpperCase();
    if (val) {
      setTickerInput(val);
      setTicker(val);
      localStorage.setItem('lastTicker', val);
      handleTabChange('stock');
      setTimeout(() => {
        if (stockZoneRef.current) {
          stockZoneRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: Theme.colors.appBackground }}>
      <AlertToast />
      <ChartModal
        ticker={chartModalTicker}
        onClose={() => setChartModalTicker(null)}
        onOpenFull={handleTickerClick}
      />
      {showAlerts && <AlertsPanel onClose={() => setShowAlerts(false)} />}
      <WatchlistSidebar activeTicker={ticker} onTickerClick={handleTickerClick} onChartClick={setChartModalTicker} />

      <div style={{
        flex: 1,
        maxWidth: '740px',
        margin: '0 auto',
        minHeight: '100vh',
        paddingBottom: '60px',
      }}>
        {/* Tape top bar — sticky, flat tabs with underline indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 20px',
          height: 56,
          borderBottom: '1px solid var(--border-default)',
          background: 'var(--bg-app)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="var(--tape-acc)" strokeWidth="1.5"/>
              <path d="M6 15 L10 10 L13 13 L18 7" stroke="var(--tape-acc)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="18" cy="7" r="1.5" fill="var(--tape-acc)"/>
            </svg>
            <span className="serif" style={{ fontSize: 17, fontStyle: 'italic', lineHeight: 1, color: 'var(--text-primary)' }}>
              Tape
            </span>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginLeft: 4 }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  style={{
                    position: 'relative',
                    padding: '0 16px',
                    height: 56,
                    fontSize: 12.5,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    letterSpacing: '-0.005em',
                    background: 'transparent',
                    border: 0,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'color 0.15s var(--tape-e)',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  {tab.label}
                  {isActive && (
                    <span style={{
                      position: 'absolute',
                      left: 12,
                      right: 12,
                      bottom: 0,
                      height: 2,
                      background: 'var(--tape-acc)',
                      borderRadius: 1,
                    }}/>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />

          {/* Date */}
          <div className="mono-tape" style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            {TODAY_STR}
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border-default)' }} />

          {/* ⌘K */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid var(--border-default)', borderRadius: 6, background: 'var(--bg-card)' }} title="Command palette (coming soon)">
            <kbd className="tape-kbd" style={{ border: 0, padding: 0, background: 'transparent' }}>⌘</kbd>
            <kbd className="tape-kbd" style={{ border: 0, padding: 0, background: 'transparent' }}>K</kbd>
          </div>

          {/* API Live status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', border: '1px solid var(--border-default)', borderRadius: 6, background: 'var(--bg-card)' }}>
            <span className="tape-dot up tape-pulse" />
            <span style={{ fontSize: 11, color: 'var(--text-primary)' }}>API · Live</span>
          </div>

          <CredentialsStatus />
        </div>

        {/* Ticker tape */}
        <TickerTape items={tapeItems} />

        {/* ═══════════════════════════════════ */}
        {/* MARKET TAB                          */}
        {/* ═══════════════════════════════════ */}
        {activeTab === 'market' && (
          <div style={{ padding: '0 20px' }}>

            {/* ── Tape editorial hero ── */}
            <OverviewHero onPick={handleTickerClick} />

            {/* ── Alert watch — live distance to SMA for every active alert ── */}
            <AlertWatchSection onTickerClick={handleTickerClick} />

            {/* ── Earnings watch — next earnings date per alert ticker ── */}
            <EarningsWatchSection onTickerClick={handleTickerClick} />

            {/* ── 0. Trading Rules — read every morning ── */}
            <div style={{ paddingTop: '20px' }}>
              <TradingRulesSection />
            </div>

            {/* ── 1. Theme Performance — sector rotation context ── */}
            <div style={{ marginTop: '20px' }}>
              <ThemePerformanceSection onTickerClick={handleTickerClick} onChartClick={setChartModalTicker} />
            </div>

            {/* ── 2. Sentiment (Fear & Greed) ── */}
            <div style={{ marginTop: '24px' }}>
              <SectionDivider title="Sentiment" />
            </div>
            <div style={{ marginTop: '8px' }}>
              <MarketSentimentSection />
            </div>

            {/* ── 2b. AI Market Narrative ── */}
            <div style={{ marginTop: '16px' }}>
              <MarketNarrativeSection />
            </div>

            {/* ── 3. Twitter / X Feed ── */}
            <div style={{ paddingTop: '20px' }}>
              <MarketBriefingSection data={marketBriefing} loading={loadingBriefing} error={errors.marketBriefing} />
            </div>

            {/* ── 4. Pre-Market Macro Report ── */}
            <div style={{ marginTop: '24px' }}>
              <PreMarketReportSection
                data={preMarketReport}
                loading={preMarketLoading}
                error={preMarketError}
                onTickerClick={handleTickerClick}
              />
            </div>

            {/* ── 5. Live Gap Scanner + Alerts button ── */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <SectionDivider title="Gappers" />
                <button
                  onClick={() => setShowAlerts(true)}
                  style={{
                    padding: '5px 12px', fontSize: '10px', fontWeight: 700,
                    fontFamily: 'monospace', letterSpacing: '0.05em', cursor: 'pointer',
                    background: 'transparent', border: `1px solid ${Theme.colors.cardBorder}`,
                    borderRadius: '4px', color: Theme.colors.secondaryText,
                    display: 'flex', alignItems: 'center', gap: '5px',
                    flexShrink: 0, marginBottom: '4px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = Theme.colors.accentBlueBorder; e.currentTarget.style.color = Theme.colors.accentBlue; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = Theme.colors.cardBorder; e.currentTarget.style.color = Theme.colors.secondaryText; }}
                >
                  🔔 Alerts
                </button>
              </div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <GapScannerSection onTickerClick={handleTickerClick} onChartClick={setChartModalTicker} />
            </div>

            {/* ── 6. Setups ── */}
            <div style={{ marginTop: '24px' }}>
              <SectionDivider title="Setups" subtitle={loadingScan ? 'Scanning...' : ''} />
            </div>
            <div style={{ marginTop: '8px' }}>
              <TodaysSetupsSection data={watchlistScan} loading={loadingScan} error={errors.watchlistScan} onTickerClick={handleTickerClick} />
            </div>

            {/* ── 7. Earnings Calendar — upcoming catalysts ── */}
            <div style={{ marginTop: '24px' }}>
              <EarningsCalendarSection onTickerClick={handleTickerClick} />
            </div>

            {/* ── 8. News (Polygon + X) ── */}
            <div style={{ marginTop: '24px' }}>
              <SectionDivider title="News" subtitle={loadingMarketNews || loadingBriefing ? 'Loading...' : ''} />
            </div>
            <div style={{ marginTop: '8px' }}>
              <NewsSection data={combinedNews} loading={loadingMarketNews && loadingBriefing} error={errors.news} />
            </div>

          </div>
        )}

        {/* ═══════════════════════════════════ */}
        {/* STOCK TAB                           */}
        {/* ═══════════════════════════════════ */}
        {activeTab === 'stock' && (
          <div ref={stockZoneRef} style={{ padding: '0 20px', marginTop: '12px' }}>
            {/* Stock search bar */}
            <div style={{ padding: '12px 0 16px' }}>
              <form onSubmit={handleTickerSubmit} className="flex items-center gap-3">
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={tickerInput}
                    onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    placeholder="TICKER"
                    style={{
                      background: Theme.colors.inputBackground,
                      border: `1px solid ${inputFocused ? Theme.colors.borderActive : Theme.colors.cardBorder}`,
                      borderRadius: Theme.radius.md,
                      color: Theme.colors.primaryText,
                      padding: '10px 14px',
                      fontSize: '20px',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      width: '160px',
                      outline: 'none',
                      letterSpacing: '0.06em',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                      boxShadow: inputFocused ? '0 0 0 3px rgba(108, 138, 255, 0.12)' : 'none',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    background: Theme.colors.accentBlue,
                    border: 'none',
                    borderRadius: Theme.radius.md,
                    color: '#fff',
                    padding: '11px 22px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    transition: 'all 0.15s ease',
                    boxShadow: Theme.shadows.sm,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#7d97ff';
                    e.currentTarget.style.boxShadow = Theme.shadows.md;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = Theme.colors.accentBlue;
                    e.currentTarget.style.boxShadow = Theme.shadows.sm;
                  }}
                >
                  Search
                </button>
                {loading && (
                  <div className="flex items-center gap-2" style={{ marginLeft: '4px' }}>
                    <div style={{
                      width: '14px',
                      height: '14px',
                      border: `2px solid ${Theme.colors.cardBorder}`,
                      borderTop: `2px solid ${Theme.colors.accentBlue}`,
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    <span style={{ fontSize: '11px', color: Theme.colors.secondaryText, fontWeight: 500 }}>Loading...</span>
                  </div>
                )}
              </form>
            </div>

            {/* Tape editorial hero */}
            <StockHero ticker={ticker} tickerInfo={tickerInfo} smaData={smaData} />

            {/* Stock content */}
            <div className="flex flex-col gap-5">
              <StockOverviewSection data={tickerInfo} loading={loading} error={errors.tickerInfo} />

              {/* Interactive Chart */}
              <StockChart smaData={smaData} ticker={ticker} loading={loading} />

              {/* Earnings History chart */}
              <EarningsHistorySection
                data={earningsHistory}
                loading={earningsHistoryLoading}
              />

              {/* Earnings Preview — only shown when earnings within 30 days */}
              {(earningsPreviewLoading || earningsPreview) && (
                <EarningsPreviewSection
                  data={earningsPreview}
                  loading={earningsPreviewLoading}
                  error={earningsPreviewError}
                />
              )}

              <SectionDivider title="Technicals" />
              {loading && !stock ? (
                <div className="flex flex-col gap-3">
                  <div className="card" style={{ padding: '20px' }}>
                    <div className="skeleton" style={{ width: '100%', height: '60px' }} />
                  </div>
                  <div className="flex gap-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="card" style={{ flex: 1, padding: '20px', textAlign: 'center' }}>
                        <div className="skeleton" style={{ width: '60px', height: '10px', margin: '0 auto 10px' }} />
                        <div className="skeleton" style={{ width: '40px', height: '24px', margin: '0 auto' }} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : stock ? (
                <div className="flex flex-col gap-4">
                  <PriceHeader priceData={stock.priceData} />
                  <IndicatorsSection indicators={stock.indicators} />
                  <VolatilityMetrics metrics={stock.volatility} />
                  {stock.movingAverages.length > 0 && (
                    <MovingAveragesSection movingAverages={stock.movingAverages} />
                  )}
                </div>
              ) : (
                <div className="card flex items-center justify-center" style={{ height: '100px' }}>
                  <span style={{ fontSize: '12px', color: Theme.colors.secondaryText }}>Search a ticker to see technical data</span>
                </div>
              )}

              <KeyLevelsSection smaData={smaData} ticker={ticker} />

              {ticker && <OptionsSection ticker={ticker} />}

              <SectionDivider title="Peers" />
              <SimilarStocksSection
                data={null}
                loading={false}
                error={null}
                onTickerClick={handleTickerClick}
              />

              {ticker && (
                <>
                  <SectionDivider title="Journal" />
                  <StockNotesSection
                    ticker={ticker}
                    onOpenJournal={() => handleTabChange('journal')}
                  />
                </>
              )}

              <SectionDivider title="Headlines" subtitle={loadingNews ? 'Loading...' : ''} />
              <StockNewsSection data={stockNews} loading={loadingNews} error={errors.stockNews} />

            </div>
          </div>
        )}

        {/* ═══════════════════════════════════ */}
        {/* TRADE LOG TAB                       */}
        {/* ═══════════════════════════════════ */}
        {activeTab === 'trades' && (
          <div style={{ padding: '0 20px' }}>
            <TradeLogHero />
            <JournalSection />
          </div>
        )}

        {/* ═══════════════════════════════════ */}
        {/* JOURNAL TAB                         */}
        {/* ═══════════════════════════════════ */}
        {activeTab === 'journal' && (
          <div style={{ padding: '20px 20px 0' }}>
            <TradingNotesSection onTickerClick={handleTickerClick} />
          </div>
        )}

        {/* ═══════════════════════════════════ */}
        {/* OUTLOOK TAB                         */}
        {/* ═══════════════════════════════════ */}
        {activeTab === 'outlook' && (
          <div style={{ padding: '0 20px' }}>
            <OutlookHero />
            <OutlookSection onTickerClick={handleTickerClick} />
          </div>
        )}
      </div>

      {isWide && <RightRail onPick={handleTickerClick} />}
    </div>
  );
}

export default App;
