import React from 'react';

function pct(n) {
  if (n == null || isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function StockHero({ ticker, tickerInfo, smaData }) {
  const price = tickerInfo?.price ?? smaData?.price ?? null;
  const change = tickerInfo?.change ?? null;
  const changePct = tickerInfo?.changePct ?? (change != null && price ? (change / (price - change)) * 100 : null);
  const company = tickerInfo?.name || tickerInfo?.companyName || tickerInfo?.description || '';
  const up = (changePct ?? 0) >= 0;
  const color = up ? 'var(--green)' : 'var(--red)';

  return (
    <div style={{ paddingTop: 12, paddingBottom: 16 }}>
      <div className="label-tape">{company || 'Ticker'}</div>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 8, flexWrap: 'wrap',
      }}>
        <h1 className="serif" style={{
          fontSize: 56, lineHeight: 1, fontWeight: 400, letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
        }}>
          {ticker}
        </h1>
        <div className="mono-tape" style={{
          fontSize: 38, fontWeight: 500, letterSpacing: '-0.04em', color: 'var(--text-primary)',
        }}>
          {price != null ? Number(price).toFixed(2) : '—'}
        </div>
        {changePct != null && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span className="mono-tape" style={{ fontSize: 16, color, fontWeight: 500 }}>
              {up ? '▲' : '▼'} {pct(Math.abs(changePct))}
            </span>
            {change != null && (
              <span className="mono-tape" style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                {up ? '+' : ''}{change.toFixed(2)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
