import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Theme } from '../models/Theme';
import { ApiService } from '../services/ApiService';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: '2d',    label: '2D' },
  { key: '3d',    label: '3D' },
  { key: '5d',    label: '5D' },
  { key: '1w',    label: '1W' },
  { key: '1m',    label: '1M' },
  { key: '3m',    label: '3M' },
];

// Bar color based on magnitude and direction
function barColor(changePct) {
  if (changePct >= 2)   return '#00d68f';   // strong green
  if (changePct >= 0.5) return '#f0a500';   // orange
  if (changePct >= 0)   return '#f06090';   // pinkish — flat/barely positive
  if (changePct >= -0.5) return '#f06090';  // barely negative
  if (changePct >= -2)  return '#f0a500';   // orange loss
  return '#ff4d4d';                          // red
}

// ── Single theme row ─────────────────────────────────────────────────────────
function ThemeRow({ theme, rank, maxAbsValue, onTickerClick }) {
  const pct      = theme.changePct;
  const positive = pct >= 0;
  const pctColor = positive ? '#00d68f' : '#ff4d4d';
  const barW     = Math.min(Math.abs(pct) / (maxAbsValue || 1) * 100, 100);
  const color    = barColor(pct);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '16px 1fr 140px 52px 72px',
      alignItems: 'center',
      gap: '10px',
      padding: '7px 10px',
      borderBottom: `1px solid ${Theme.colors.cardBorder}`,
      transition: 'background 0.1s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Rank */}
      <span style={{ fontSize: '9px', color: Theme.colors.tertiaryText, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {rank}
      </span>

      {/* Name + movers */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '11px', fontWeight: 700,
          color: Theme.colors.primaryText,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          letterSpacing: '0.01em',
        }}>
          {theme.name}
        </div>
        <div style={{ display: 'flex', gap: '3px', marginTop: '2px', flexWrap: 'nowrap' }}>
          {theme.topWinners?.slice(0, 2).map(s => (
            <span
              key={s.ticker}
              onClick={e => { e.stopPropagation(); onTickerClick(s.ticker); }}
              style={{
                fontSize: '8px', fontWeight: 700,
                color: '#00d68f',
                cursor: 'pointer',
                padding: '0px 3px',
                borderRadius: '2px',
                background: 'rgba(0,214,143,0.08)',
              }}
            >
              {s.ticker}
            </span>
          ))}
          {theme.topLosers?.[0] && (
            <span
              onClick={e => { e.stopPropagation(); onTickerClick(theme.topLosers[0].ticker); }}
              style={{
                fontSize: '8px', fontWeight: 700,
                color: '#ff4d4d',
                cursor: 'pointer',
                padding: '0px 3px',
                borderRadius: '2px',
                background: 'rgba(255,77,77,0.08)',
              }}
            >
              {theme.topLosers[0].ticker}
            </span>
          )}
        </div>
      </div>

      {/* Bar */}
      <div style={{ position: 'relative', height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)' }}>
        <div style={{
          position: 'absolute',
          left: positive ? 0 : `${100 - barW}%`,
          width: `${barW}%`,
          height: '100%',
          borderRadius: '3px',
          background: color,
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* % change */}
      <span className="tabular-nums" style={{
        fontSize: '12px', fontWeight: 800,
        color: pctColor,
        textAlign: 'right',
        letterSpacing: '-0.01em',
      }}>
        {positive ? '+' : ''}{pct.toFixed(2)}%
      </span>

      {/* Breadth badge */}
      <span style={{
        fontSize: '9px', fontWeight: 600,
        color: positive ? '#00d68f' : '#ff4d4d',
        background: positive ? 'rgba(0,214,143,0.10)' : 'rgba(255,77,77,0.10)',
        padding: '2px 6px',
        borderRadius: '4px',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}>
        {positive ? '▲' : '▼'} {theme.breadth}%
      </span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '16px 1fr 140px 52px 72px',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 10px',
      borderBottom: `1px solid ${Theme.colors.cardBorder}`,
    }}>
      <div className="skeleton" style={{ width: '12px', height: '10px' }} />
      <div>
        <div className="skeleton" style={{ width: '60%', height: '11px', marginBottom: '4px' }} />
        <div style={{ display: 'flex', gap: '4px' }}>
          <div className="skeleton" style={{ width: '28px', height: '9px' }} />
          <div className="skeleton" style={{ width: '28px', height: '9px' }} />
        </div>
      </div>
      <div className="skeleton" style={{ width: '100%', height: '5px', borderRadius: '3px' }} />
      <div className="skeleton" style={{ width: '44px', height: '14px', marginLeft: 'auto' }} />
      <div className="skeleton" style={{ width: '56px', height: '18px', borderRadius: '4px' }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ThemePerformanceSection({ onTickerClick }) {
  const [range, setRange]       = useState('today');
  const [filter, setFilter]     = useState('all');   // 'all' | 'gaining' | 'losing'
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = (r) => {
    setLoading(true);
    setError(null);
    ApiService.getThemePerformance(r)
      .then(d => {
        setData(d);
        setUpdatedAt(new Date());
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(range);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (['today', '2d', '3d'].includes(range)) {
      intervalRef.current = setInterval(() => fetchData(range), 2 * 60 * 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [range]);

  const isToday = range === 'today';

  const { displayed, maxAbsValue, gainCount, loseCount } = useMemo(() => {
    if (!data?.themes) return { displayed: [], maxAbsValue: 1, gainCount: 0, loseCount: 0 };

    const sorted = [...data.themes].sort((a, b) => b.changePct - a.changePct);
    const gainCount = sorted.filter(t => t.changePct > 0).length;
    const loseCount = sorted.filter(t => t.changePct <= 0).length;

    let filtered = sorted;
    if (filter === 'gaining') filtered = sorted.filter(t => t.changePct > 0);
    if (filter === 'losing')  filtered = sorted.filter(t => t.changePct <= 0);

    const maxAbs = Math.max(...filtered.map(t => Math.abs(t.changePct)), 1);
    return { displayed: filtered, maxAbsValue: maxAbs, gainCount, loseCount };
  }, [data, filter]);

  const timeStr = updatedAt
    ? updatedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
    : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <div style={{
            fontSize: '13px', fontWeight: 800,
            color: '#00d68f',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
          }}>
            Top Performing Themes
          </div>
          {timeStr && (
            <div style={{ fontSize: '9px', color: Theme.colors.tertiaryText, marginTop: '2px' }}>
              Updated {timeStr} ET
            </div>
          )}
        </div>

        <button
          onClick={() => fetchData(range)}
          disabled={loading}
          style={{
            padding: '4px 12px',
            fontSize: '9px', fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: loading ? 'wait' : 'pointer',
            border: '1px solid #00d68f',
            borderRadius: '3px',
            background: 'transparent',
            color: loading ? Theme.colors.tertiaryText : '#00d68f',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(0,214,143,0.10)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          {loading ? '...' : 'REFRESH'}
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
        {/* Period tabs */}
        <div style={{ display: 'flex', gap: '3px' }}>
          {PERIODS.map(p => {
            const active = range === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setRange(p.key)}
                style={{
                  padding: '3px 9px',
                  borderRadius: '3px',
                  fontSize: '10px', fontWeight: 700,
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  border: `1px solid ${active ? '#00d68f' : Theme.colors.cardBorder}`,
                  background: active ? 'rgba(0,214,143,0.12)' : 'transparent',
                  color: active ? '#00d68f' : Theme.colors.secondaryText,
                  letterSpacing: '0.04em',
                  transition: 'all 0.15s',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Gaining / Losing filters + stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {['all', 'gaining', 'losing'].map(f => {
            const active = filter === f;
            const isGain = f === 'gaining';
            const isLose = f === 'losing';
            const color  = isGain ? '#00d68f' : isLose ? '#ff4d4d' : Theme.colors.secondaryText;
            const activeBg = isGain ? 'rgba(0,214,143,0.12)' : isLose ? 'rgba(255,77,77,0.12)' : 'rgba(255,255,255,0.06)';
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '3px 9px',
                  borderRadius: '3px',
                  fontSize: '10px', fontWeight: 700,
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  border: `1px solid ${active ? color : Theme.colors.cardBorder}`,
                  background: active ? activeBg : 'transparent',
                  color: active ? color : Theme.colors.tertiaryText,
                  letterSpacing: '0.04em',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                {isGain && '▲ '}
                {isLose && '▼ '}
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            );
          })}

          {!loading && data && (
            <span style={{ fontSize: '9px', color: Theme.colors.tertiaryText, marginLeft: '4px', whiteSpace: 'nowrap' }}>
              <span style={{ color: '#00d68f', fontWeight: 700 }}>{gainCount}</span>
              {' gaining · '}
              <span style={{ color: '#ff4d4d', fontWeight: 700 }}>{loseCount}</span>
              {' losing'}
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: Theme.colors.bearishRed }}>
          Failed to load themes: {error}
        </div>
      )}

      {/* Table */}
      <div style={{
        border: `1px solid ${Theme.colors.cardBorder}`,
        borderRadius: Theme.radius.sm,
        overflow: 'hidden',
        background: Theme.colors.cardBackground,
      }}>
        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '16px 1fr 140px 52px 72px',
          gap: '10px',
          padding: '6px 10px',
          borderBottom: `1px solid ${Theme.colors.cardBorder}`,
          background: 'rgba(255,255,255,0.02)',
        }}>
          <span />
          <span style={{ fontSize: '8px', fontWeight: 700, color: Theme.colors.tertiaryText, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Theme
          </span>
          <span style={{ fontSize: '8px', fontWeight: 700, color: Theme.colors.tertiaryText, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Performance
          </span>
          <span style={{ fontSize: '8px', fontWeight: 700, color: Theme.colors.tertiaryText, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'right' }}>
            {isToday ? 'Today' : range.toUpperCase()}
          </span>
          <span style={{ fontSize: '8px', fontWeight: 700, color: Theme.colors.tertiaryText, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>
            Breadth
          </span>
        </div>

        {/* Rows */}
        {loading ? (
          Array.from({ length: 12 }, (_, i) => <SkeletonRow key={i} />)
        ) : displayed.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: Theme.colors.secondaryText }}>
            No themes found
          </div>
        ) : (
          displayed.map((theme, i) => (
            <ThemeRow
              key={theme.name}
              theme={theme}
              rank={i + 1}
              maxAbsValue={maxAbsValue}
              onTickerClick={onTickerClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
