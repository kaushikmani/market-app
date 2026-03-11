import { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { Theme } from '../models/Theme';

function calcSMALine(candles, period) {
  const result = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    result.push({ time: candles[i].time, value: Math.round((sum / period) * 100) / 100 });
  }
  return result;
}

function toWeeklyCandles(candles) {
  const weeks = {};
  for (const c of candles) {
    const date = new Date(c.time * 1000);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const key = Math.floor(monday.getTime() / 1000);
    if (!weeks[key]) {
      weeks[key] = { time: key, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume };
    } else {
      weeks[key].high = Math.max(weeks[key].high, c.high);
      weeks[key].low = Math.min(weeks[key].low, c.low);
      weeks[key].close = c.close;
      weeks[key].volume += c.volume;
    }
  }
  return Object.values(weeks).sort((a, b) => a.time - b.time);
}

const SMA_CONFIG = [
  { period: 8,   color: '#e879f9', label: '8' },
  { period: 10,  color: Theme.colors.cyan, label: '10' },
  { period: 21,  color: Theme.colors.accentBlue, label: '21' },
  { period: 50,  color: Theme.colors.accentAmber, label: '50' },
  { period: 200, color: Theme.colors.bullishGreen, label: '200' },
];

export function StockChart({ smaData, ticker, loading }) {
  const containerRef = useRef(null);
  const [timeframe, setTimeframe] = useState('D');

  useEffect(() => {
    if (!containerRef.current || !smaData?.candles?.length) return;

    const candles = timeframe === 'W'
      ? toWeeklyCandles(smaData.candles)
      : [...smaData.candles];

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 340,
      layout: {
        background: { color: Theme.colors.cardBackground },
        textColor: Theme.colors.secondaryText,
        fontSize: 11,
        fontFamily: 'inherit',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: Theme.colors.cardBorder },
      timeScale: {
        borderColor: Theme.colors.cardBorder,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: Theme.colors.bullishGreen,
      downColor: Theme.colors.bearishRed,
      borderVisible: false,
      wickUpColor: Theme.colors.bullishGreen,
      wickDownColor: Theme.colors.bearishRed,
    });
    candleSeries.setData(candles);

    for (const { period, color } of SMA_CONFIG) {
      if (candles.length < period) continue;
      const lineData = calcSMALine(candles, period);
      const lineSeries = chart.addLineSeries({
        color,
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });
      lineSeries.setData(lineData);
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [smaData, timeframe]);

  const hasData = !loading && smaData?.candles?.length > 0;

  return (
    <div className="card" style={{ padding: '14px' }}>
      {/* Header */}
      <div className="flex items-center gap-2" style={{ marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: Theme.colors.primaryText, flex: 1 }}>
          {ticker} Chart
        </span>

        {/* SMA legend */}
        {hasData && (
          <div className="flex items-center gap-3" style={{ marginRight: '8px' }}>
            {SMA_CONFIG.map(({ period, color, label }) => (
              <div key={period} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '14px', height: '2px', background: color, borderRadius: '1px' }} />
                <span style={{ fontSize: '9px', color: Theme.colors.secondaryText, fontWeight: 500 }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Timeframe tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {['D', 'W'].map(tf => (
            <span
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: Theme.radius.xs,
                cursor: 'pointer',
                background: timeframe === tf ? Theme.colors.accentBlueDim : 'transparent',
                color: timeframe === tf ? Theme.colors.accentBlue : Theme.colors.tertiaryText,
                border: `1px solid ${timeframe === tf ? Theme.colors.accentBlueBorder : 'transparent'}`,
                transition: 'all 0.15s ease',
                userSelect: 'none',
              }}
            >
              {tf === 'D' ? 'Daily' : 'Weekly'}
            </span>
          ))}
        </div>
      </div>

      {/* Chart or skeleton */}
      {loading ? (
        <div className="skeleton" style={{ width: '100%', height: '340px', borderRadius: Theme.radius.sm }} />
      ) : !hasData ? (
        <div style={{
          width: '100%',
          height: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: Theme.colors.secondaryText,
          fontSize: '12px',
          border: `1px solid ${Theme.colors.cardBorder}`,
          borderRadius: Theme.radius.sm,
        }}>
          No chart data available
        </div>
      ) : (
        <div
          ref={containerRef}
          style={{ borderRadius: Theme.radius.sm, overflow: 'hidden' }}
        />
      )}
    </div>
  );
}
