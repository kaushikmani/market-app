import { useState, useEffect, useRef } from 'react';
import { ApiService } from '../services/ApiService';
import { Theme } from '../models/Theme';

const REFRESH_MS = 90_000;

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function fmtPct(val) {
  if (val == null) return '—';
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

function StockRow({ stock, onTickerClick }) {
  const isUp = stock.direction === 'up';
  const gapColor = isUp ? Theme.colors.bullishGreen : Theme.colors.bearishRed;
  const gapBg = isUp ? Theme.colors.bullishGreenBg : Theme.colors.bearishRedBg;

  return (
    <tr
      onClick={() => onTickerClick && onTickerClick(stock.ticker)}
      style={{ cursor: 'pointer', borderBottom: `1px solid ${Theme.colors.borderSubtle}` }}
      onMouseEnter={e => e.currentTarget.style.background = Theme.colors.cardBackgroundHover}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Direction arrow */}
      <td style={{ padding: '7px 8px 7px 0', width: '16px', textAlign: 'center' }}>
        <span style={{ fontSize: '11px', color: gapColor }}>{isUp ? '▲' : '▼'}</span>
      </td>

      {/* Ticker */}
      <td style={{ padding: '7px 12px 7px 4px', whiteSpace: 'nowrap' }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          color: Theme.colors.primaryText,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
        }}>
          {stock.ticker}
        </span>
      </td>

      {/* Group */}
      <td style={{ padding: '7px 12px', maxWidth: '180px' }}>
        <span style={{
          fontSize: '10px',
          color: Theme.colors.secondaryText,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'block',
        }}>
          {stock.company}
        </span>
      </td>

      {/* Gap % */}
      <td style={{ padding: '7px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          color: gapColor,
          background: gapBg,
          padding: '2px 6px',
          borderRadius: Theme.radius.xs,
          fontFamily: 'var(--font-mono)',
        }}>
          {fmtPct(stock.gapPct)}
        </span>
      </td>

      {/* Current change % */}
      <td style={{ padding: '7px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 600,
          color: stock.changePct >= 0 ? Theme.colors.bullishGreen : Theme.colors.bearishRed,
          fontFamily: 'var(--font-mono)',
          opacity: 0.8,
        }}>
          {fmtPct(stock.changePct)}
        </span>
      </td>

      {/* Price */}
      <td style={{ padding: '7px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: '10px', color: Theme.colors.secondaryText, fontFamily: 'var(--font-mono)' }}>
          {stock.price > 0 ? `$${stock.price.toFixed(2)}` : '—'}
        </span>
      </td>

      {/* Volume */}
      <td style={{ padding: '7px 0 7px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText, fontFamily: 'var(--font-mono)' }}>
          {stock.volume || '—'}
        </span>
      </td>
    </tr>
  );
}

export function GapScannerSection({ onTickerClick }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('up');
  const [_tick, setTick] = useState(0);
  const intervalRef = useRef(null);

  const fetchData = () => {
    ApiService.getGapScanner()
      .then(d => { setData(d); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(() => {
      fetchData();
      setTick(t => t + 1);
    }, REFRESH_MS);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Tick every second for "X sec ago" display
  useEffect(() => {
    const t = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const gapUps = data?.gapUps || [];
  const gapDowns = data?.gapDowns || [];
  const activeList = activeTab === 'up' ? gapUps : gapDowns;

  return (
    <div className="card" style={{ padding: '14px' }}>
      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>

        {/* LIVE badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: Theme.colors.bullishGreen,
            boxShadow: `0 0 6px ${Theme.colors.bullishGreen}`,
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: '9px', fontWeight: 700, color: Theme.colors.bullishGreen, letterSpacing: '0.08em' }}>
            LIVE
          </span>
        </div>

        {/* Updated timestamp */}
        {data?.timestamp && (
          <span style={{ fontSize: '9px', color: Theme.colors.tertiaryText }}>
            {timeAgo(data.timestamp)}
          </span>
        )}

        <div style={{ flex: 1 }} />

        {/* Up/Down tabs */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { key: 'up', label: `▲ Gap Up (${gapUps.length})`, color: Theme.colors.bullishGreen },
            { key: 'down', label: `▼ Gap Down (${gapDowns.length})`, color: Theme.colors.bearishRed },
          ].map(tab => (
            <span
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: Theme.radius.xs,
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.15s ease',
                background: activeTab === tab.key ? (tab.key === 'up' ? Theme.colors.bullishGreenBg : Theme.colors.bearishRedBg) : 'transparent',
                color: activeTab === tab.key ? tab.color : Theme.colors.tertiaryText,
                border: `1px solid ${activeTab === tab.key ? (tab.key === 'up' ? Theme.colors.bullishGreenBorder : Theme.colors.bearishRedBorder) : 'transparent'}`,
              }}
            >
              {tab.label}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton" style={{ height: '28px', borderRadius: Theme.radius.xs }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ padding: '20px', textAlign: 'center', color: Theme.colors.secondaryText, fontSize: '12px' }}>
          {error}
        </div>
      ) : activeList.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: Theme.colors.secondaryText, fontSize: '12px' }}>
          {activeTab === 'up' ? 'No gap ups ≥ 2% found' : 'No gap downs ≤ -2% found'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${Theme.colors.cardBorder}` }}>
                {['', 'Ticker', 'Group', 'Gap', 'Now', 'Price', 'Volume'].map((h, i) => (
                  <th key={i} style={{
                    padding: '0 8px 8px',
                    textAlign: i >= 3 ? 'right' : 'left',
                    fontSize: '9px',
                    fontWeight: 600,
                    color: Theme.colors.tertiaryText,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeList.map(stock => (
                <StockRow key={stock.ticker} stock={stock} onTickerClick={onTickerClick} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
