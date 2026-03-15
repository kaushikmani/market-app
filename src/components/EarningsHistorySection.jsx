import React from 'react';
import { Theme } from '../models/Theme';

const LoadingSkeleton = () => (
  <div className="card" style={{ padding: '14px 16px' }}>
    <div className="skeleton" style={{ width: '140px', height: '13px', marginBottom: '16px' }} />
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px' }}>
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className="skeleton" style={{ flex: 1, height: `${20 + i * 7}px`, borderRadius: '3px 3px 0 0' }} />
      ))}
    </div>
  </div>
);

export const EarningsHistorySection = ({ data, loading, error }) => {
  if (loading) return <LoadingSkeleton />;
  if (error) return null;
  if (!data || !data.history?.length) return null;

  const history = data.history;
  const maxAbsMove = Math.max(...history.map(h => Math.abs(h.movePct)), 1);
  const barHeight = 90; // px — total chart height

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          color: Theme.colors.tertiaryText,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          Earnings Day Moves
        </span>
        {data.expectedMove != null && (
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: Theme.radius.full,
            background: 'rgba(139, 92, 246, 0.12)',
            color: '#a78bfa',
            border: '1px solid rgba(139, 92, 246, 0.25)',
          }}>
            ~±{data.expectedMove}% avg move
          </span>
        )}
      </div>

      {/* Bar chart */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '4px',
        height: `${barHeight * 2 + 24}px`, // up + down + axis
        position: 'relative',
      }}>
        {/* Zero axis line */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${barHeight}px`,
          height: '1px',
          background: Theme.colors.cardBorder,
          zIndex: 1,
        }} />

        {history.map((h, i) => {
          const isUp = h.movePct >= 0;
          const color = isUp ? Theme.colors.bullishGreen : Theme.colors.bearishRed;
          const bg = isUp ? Theme.colors.bullishGreenBg : Theme.colors.bearishRedBg;
          const heightPx = Math.max(3, Math.abs(h.movePct) / maxAbsMove * barHeight);

          return (
            <div
              key={i}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', position: 'relative' }}
              title={`${h.quarter || h.date}\nMove: ${h.movePct > 0 ? '+' : ''}${h.movePct}%${h.epsActual != null ? `\nEPS: $${h.epsActual}` : ''}${h.epsEstimate != null ? ` vs est $${h.epsEstimate}` : ''}`}
            >
              {/* Up bar — pinned to axis from top */}
              <div style={{
                position: 'absolute',
                top: isUp ? `${barHeight - heightPx}px` : `${barHeight}px`,
                width: '100%',
                height: `${heightPx}px`,
                background: isUp ? color : 'transparent',
                borderRadius: isUp ? '3px 3px 0 0' : '0',
                opacity: 0.85,
                transition: 'opacity 0.15s',
              }} />
              {/* Down bar */}
              {!isUp && (
                <div style={{
                  position: 'absolute',
                  top: `${barHeight}px`,
                  width: '100%',
                  height: `${heightPx}px`,
                  background: color,
                  borderRadius: '0 0 3px 3px',
                  opacity: 0.85,
                }} />
              )}

              {/* EPS beat/miss dot */}
              {h.epsActual != null && h.epsEstimate != null && (
                <div style={{
                  position: 'absolute',
                  top: isUp ? `${barHeight - heightPx - 10}px` : `${barHeight + heightPx + 3}px`,
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: h.epsActual >= h.epsEstimate ? Theme.colors.bullishGreen : Theme.colors.bearishRed,
                  border: `1px solid ${Theme.colors.cardBackground}`,
                  zIndex: 2,
                }} />
              )}

              {/* Move % label */}
              <div style={{
                position: 'absolute',
                top: isUp ? `${barHeight - heightPx - 22}px` : `${barHeight + heightPx + 16}px`,
                fontSize: '9px',
                fontWeight: 700,
                color,
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                width: '100%',
              }}>
                {h.movePct > 0 ? '+' : ''}{h.movePct}%
              </div>

              {/* Quarter label */}
              <div style={{
                position: 'absolute',
                bottom: '0',
                fontSize: '8px',
                color: Theme.colors.tertiaryText,
                fontWeight: 600,
                textAlign: 'center',
                width: '100%',
                lineHeight: '1.2',
              }}>
                {h.quarter
                  ? (() => {
                      // "3Q2024" → "Q3'24"
                      const m = h.quarter.match(/(\d)Q(\d{4})/);
                      return m ? `Q${m[1]}'${m[2].slice(2)}` : h.quarter;
                    })()
                  : h.date?.slice(2, 7)?.replace('-', '/')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4" style={{ marginTop: '8px' }}>
        <div className="flex items-center gap-1">
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: Theme.colors.bullishGreen }} />
          <span style={{ fontSize: '9px', color: Theme.colors.tertiaryText }}>EPS Beat</span>
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: Theme.colors.bearishRed }} />
          <span style={{ fontSize: '9px', color: Theme.colors.tertiaryText }}>EPS Miss</span>
        </div>
        <span style={{ fontSize: '9px', color: Theme.colors.tertiaryText, marginLeft: 'auto' }}>
          Last {history.length} quarters
        </span>
      </div>
    </div>
  );
};
