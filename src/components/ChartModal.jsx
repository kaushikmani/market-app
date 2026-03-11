import React, { useEffect, useState, useCallback } from 'react';
import { StockChart } from './StockChart';
import { ApiService } from '../services/ApiService';
import { Theme } from '../models/Theme';

export function ChartModal({ ticker, onClose, onOpenFull }) {
  const [smaData, setSmaData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticker) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setSmaData(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    ApiService.getSMAData(ticker)
      .then(d => setSmaData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ticker]);

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (!ticker) return null;

  const price = smaData?.price;
  const pctFrom50 = smaData?.smas?.[50]?.pctFromPrice;
  const rsi = smaData?.rsi;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '820px',
          background: Theme.colors.appBackground,
          border: `1px solid ${Theme.colors.cardBorder}`,
          borderRadius: Theme.radius.md,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: `1px solid ${Theme.colors.cardBorder}`,
          background: Theme.colors.cardBackground,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontSize: '18px', fontWeight: 800,
              color: Theme.colors.primaryText,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.06em',
            }}>
              {ticker}
            </span>
            {price != null && (
              <span className="tabular-nums" style={{ fontSize: '16px', fontWeight: 700, color: Theme.colors.primaryText }}>
                ${price.toFixed(2)}
              </span>
            )}
            {pctFrom50 != null && (
              <span className="tabular-nums" style={{
                fontSize: '10px', fontWeight: 600,
                color: Theme.colors.tertiaryText,
                background: Theme.colors.cardBackground,
                border: `1px solid ${Theme.colors.cardBorder}`,
                padding: '2px 7px', borderRadius: Theme.radius.xs,
              }}>
                {pctFrom50 > 0 ? '+' : ''}{pctFrom50.toFixed(1)}% vs SMA50
              </span>
            )}
            {rsi != null && (
              <span className="tabular-nums" style={{
                fontSize: '10px', fontWeight: 600,
                color: rsi > 70 ? Theme.colors.bearishRed : rsi < 30 ? Theme.colors.bullishGreen : Theme.colors.tertiaryText,
                background: Theme.colors.cardBackground,
                border: `1px solid ${Theme.colors.cardBorder}`,
                padding: '2px 7px', borderRadius: Theme.radius.xs,
              }}>
                RSI {rsi.toFixed(0)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => { onClose(); onOpenFull(ticker); }}
              style={{
                padding: '5px 12px', fontSize: '10px', fontWeight: 700,
                fontFamily: 'inherit', letterSpacing: '0.04em',
                cursor: 'pointer',
                background: Theme.colors.accentBlueDim,
                border: `1px solid ${Theme.colors.accentBlueBorder}`,
                borderRadius: Theme.radius.sm,
                color: Theme.colors.accentBlue,
              }}
            >
              Full Analysis →
            </button>
            <button
              onClick={onClose}
              style={{
                width: '28px', height: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent',
                border: `1px solid ${Theme.colors.cardBorder}`,
                borderRadius: Theme.radius.sm,
                color: Theme.colors.secondaryText,
                cursor: 'pointer', fontSize: '14px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Chart */}
        <div style={{ padding: '14px' }}>
          <StockChart smaData={smaData} ticker={ticker} loading={loading} />
        </div>

        {/* SMA quick stats */}
        {!loading && smaData?.smas && (
          <div style={{
            display: 'flex', gap: '6px', flexWrap: 'wrap',
            padding: '0 14px 14px',
          }}>
            {[8, 21, 50, 100, 200].map(p => {
              const s = smaData.smas[p];
              if (!s) return null;
              const pos = s.pctFromPrice >= 0;
              return (
                <div key={p} style={{
                  padding: '4px 10px',
                  borderRadius: Theme.radius.xs,
                  background: pos ? 'rgba(0,214,143,0.07)' : 'rgba(255,92,92,0.07)',
                  border: `1px solid ${pos ? 'rgba(0,214,143,0.15)' : 'rgba(255,92,92,0.15)'}`,
                  display: 'flex', gap: '6px', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '9px', color: Theme.colors.tertiaryText, fontWeight: 600 }}>SMA{p}</span>
                  <span className="tabular-nums" style={{ fontSize: '10px', fontWeight: 700, color: Theme.colors.primaryText }}>
                    ${s.value.toFixed(2)}
                  </span>
                  <span className="tabular-nums" style={{ fontSize: '9px', fontWeight: 600, color: pos ? Theme.colors.bullishGreen : Theme.colors.bearishRed }}>
                    {pos ? '+' : ''}{s.pctFromPrice.toFixed(1)}%
  	              </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
