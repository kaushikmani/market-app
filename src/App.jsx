import React, { useState, useMemo, useRef, useEffect, Suspense, lazy } from 'react';
// ── Eagerly imported (Overview tab — the default) ──────────────────────────
import { NewsSection } from './components/NewsSection';
import { SectionDivider } from './components/SectionDivider';
import { MarketBriefingSection } from './components/MarketBriefingSection';
import { GapScannerSection } from './components/GapScannerSection';
import { TodaysSetupsSection } from './components/TodaysSetupsSection';
import { PreMarketReportSection } from './components/PreMarketReportSection';
import { ThemePerformanceSection } from './components/ThemePerformanceSection';
import { WatchlistSidebar } from './components/WatchlistSidebar';
import { EarningsCalendarSection } from './components/EarningsCalendarSection';
import { TradingRulesSection } from './components/TradingRulesSection';
import { MarketNarrativeSection } from './components/MarketNarrativeSection';
import { MarketSentimentSection } from './components/MarketSentimentSection';
import { CredentialsStatus } from './components/CredentialsStatus';
import { RightRail } from './components/RightRail';
import { OverviewHero } from './components/OverviewHero';
import { AlertWatchSection } from './components/AlertWatchSection';
import { EarningsWatchSection } from './components/EarningsWatchSection';
import { AlertToast } from './components/AlertToast';

// ── Lazy: only loaded when the user opens the Stocks tab ───────────────────
const PriceHeader            = lazy(() => import('./components/PriceHeader').then(m => ({ default: m.PriceHeader })));
const IndicatorsSection      = lazy(() => import('./components/IndicatorsSection').then(m => ({ default: m.IndicatorsSection })));
const VolatilityMetrics      = lazy(() => import('./components/VolatilityMetrics').then(m => ({ default: m.VolatilityMetrics })));
const MovingAveragesSection  = lazy(() => import('./components/MovingAveragesSection').then(m => ({ default: m.MovingAveragesSection })));
const StockNewsSection       = lazy(() => import('./components/StockNewsSection').then(m => ({ default: m.StockNewsSection })));
const StockOverviewSection   = lazy(() => import('./components/StockOverviewSection').then(m => ({ default: m.StockOverviewSection })));
const SimilarStocksSection   = lazy(() => import('./components/SimilarStocksSection').then(m => ({ default: m.SimilarStocksSection })));
const KeyLevelsSection       = lazy(() => import('./components/KeyLevelsSection').then(m => ({ default: m.KeyLevelsSection })));
const OptionsSection         = lazy(() => import('./components/OptionsSection').then(m => ({ default: m.OptionsSection })));
const EarningsPreviewSection = lazy(() => import('./components/EarningsPreviewSection').then(m => ({ default: m.EarningsPreviewSection })));
const EarningsHistorySection = lazy(() => import('./components/EarningsHistorySection').then(m => ({ default: m.EarningsHistorySection })));
const StockNotesSection      = lazy(() => import('./components/StockNotesSection').then(m => ({ default: m.StockNotesSection })));
const StockChart             = lazy(() => import('./components/StockChart').then(m => ({ default: m.StockChart })));
const StockHero              = lazy(() => import('./components/StockHero').then(m => ({ default: m.StockHero })));

// ── Lazy: Trade Log / Notes / Outlook tabs ─────────────────────────────
const TradingNotesSection = lazy(() => import('./components/TradingNotesSection').then(m => ({ default: m.TradingNotesSection })));
const OutlookSection      = lazy(() => import('./components/OutlookSection').then(m => ({ default: m.OutlookSection })));
const JournalSection      = lazy(() => import('./components/JournalSection').then(m => ({ default: m.JournalSection })));
const TradeLogHero        = lazy(() => import('./components/TradeLogHero').then(m => ({ default: m.TradeLogHero })));
const OutlookHero         = lazy(() => import('./components/OutlookHero').then(m => ({ default: m.OutlookHero })));

// ── Lazy: dialogs/panels (only when triggered) ─────────────────────────────
const ChartModal  = lazy(() => import('./components/ChartModal').then(m => ({ default: m.ChartModal })));
const AlertsPanel = lazy(() => import('./components/AlertsPanel').then(m => ({ default: m.AlertsPanel })));
import { ApiService } from './services/ApiService';
import { useMarketData } from './hooks/useMarketData';
import { useWatchlistPrices } from './hooks/useWatchlistPrices';
import { buildWatchlistPeerData } from './data/watchlist';
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

const TickerTape = React.memo(function TickerTape({ items }) {
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
});

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
