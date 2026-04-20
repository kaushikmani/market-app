import React from 'react';
import { Sparkline } from './TapePrimitives';
import { useWatchlistPrices } from '../hooks/useWatchlistPrices';

const HERO_TICKERS = [
  { sym: 'SPY', label: 'S&P 500' },
  { sym: 'QQQ', label: 'Nasdaq' },
  { sym: 'IWM', label: 'Russell 2k' },
  { sym: 'DIA', label: 'Dow' },
];

function todayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function OverviewHero({ onPick }) {
  const { prices } = useWatchlistPrices();

  const cells = HERO_TICKERS.map(t => {
    const p = prices?.[t.sym];
    return {
      ...t,
      price: p?.price ?? null,
      changePct: p?.changePct ?? null,
      history: p?.intradayHistory || p?.history || null,
    };
  });

  const upCount = cells.filter(c => (c.changePct ?? 0) > 0).length;
  const verdict = upCount >= 3
    ? { line: 'Risk-on tape,', accent: 'broad participation.' }
    : upCount === 2
    ? { line: 'Mixed tape,', accent: 'rotate or wait.' }
    : { line: 'Risk-off,', accent: 'defense over offense.' };

  return (
    <div style={{ paddingTop: 28, paddingBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="label-tape">{todayLabel()}</div>
          <h1 className="serif" style={{
            fontSize: 44,
            lineHeight: 1.05,
            marginTop: 8,
            maxWidth: 700,
            color: 'var(--text-primary)',
            fontWeight: 400,
            letterSpacing: '-0.01em',
          }}>
            {verdict.line}{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--tape-acc)' }}>
              {verdict.accent}
            </span>
          </h1>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cells.length}, 1fr)`,
        gap: 0,
        border: '1px solid var(--border-default)',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--bg-card)',
      }}>
        {cells.map((c, i) => {
          const up = (c.changePct ?? 0) >= 0;
          const color = up ? 'var(--green)' : 'var(--red)';
          return (
            <div
              key={c.sym}
              onClick={() => onPick?.(c.sym)}
              style={{
                padding: '18px 20px',
                borderRight: i < cells.length - 1 ? '1px solid var(--border-default)' : 0,
                cursor: 'pointer',
                transition: 'background 0.15s var(--tape-e)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div className="label-tape">{c.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
                <div className="mono-tape" style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                  {c.price != null ? c.price.toFixed(2) : '—'}
                </div>
                <div className="mono-tape" style={{ fontSize: 11.5, color }}>
                  {c.changePct != null ? `${up ? '+' : ''}${c.changePct.toFixed(2)}%` : ''}
                </div>
              </div>
              {c.history && c.history.length > 1 && (
                <div style={{ height: 24, marginTop: 6 }}>
                  <Sparkline data={c.history} color={color} w={200} h={24} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
