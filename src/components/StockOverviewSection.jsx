import React from 'react';
import { Theme } from '../models/Theme';

const LoadingSkeleton = () => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <div className="skeleton" style={{ width: '100px', height: '30px' }} />
      <div className="skeleton" style={{ width: '60px', height: '20px', borderRadius: Theme.radius.full }} />
    </div>
    <div className="card" style={{ padding: '12px 16px' }}>
      <div className="skeleton" style={{ width: '100%', height: '6px', marginBottom: '8px' }} />
      <div className="flex justify-between">
        <div className="skeleton" style={{ width: '60px', height: '12px' }} />
        <div className="skeleton" style={{ width: '60px', height: '12px' }} />
      </div>
    </div>
  </div>
);

export const StockOverviewSection = ({ data, loading, error }) => {
  if (loading) return <LoadingSkeleton />;

  if (error) return (
    <div className="card flex flex-col items-center justify-center" style={{
      height: '100px',
      background: Theme.colors.bearishRedBg,
      borderColor: Theme.colors.bearishRedBorder,
    }}>
      <span style={{ fontSize: '12px', color: Theme.colors.bearishRed }}>{error}</span>
    </div>
  );

  if (!data?.price) return null;

  const isPositive = typeof data.change === 'number' ? data.change >= 0 : !String(data.changePct || '').startsWith('-');
  const changeColor = isPositive ? Theme.colors.bullishGreen : Theme.colors.bearishRed;
  const changeBg = isPositive ? Theme.colors.bullishGreenBg : Theme.colors.bearishRedBg;
  const changeBorder = isPositive ? Theme.colors.bullishGreenBorder : Theme.colors.bearishRedBorder;

  const w52High = typeof data.high52w === 'number' ? data.high52w : null;
  const w52Low = typeof data.low52w === 'number' ? data.low52w : null;
  const currentPrice = typeof data.price === 'number' ? data.price : parseFloat(data.price);

  const w52Position = (w52High && w52Low && currentPrice && w52High > w52Low)
    ? Math.max(0, Math.min(100, ((currentPrice - w52Low) / (w52High - w52Low)) * 100))
    : null;

  const pctFrom52High = (w52High && currentPrice)
    ? ((currentPrice - w52High) / w52High) * 100
    : null;

  const changeDisplay = typeof data.change === 'number'
    ? `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}`
    : data.change;
  const changePctDisplay = typeof data.changePct === 'number'
    ? `${data.changePct >= 0 ? '+' : ''}${data.changePct.toFixed(2)}%`
    : data.changePct;

  return (
    <div className="flex flex-col gap-3">
      {/* Price bar */}
      <div className="flex items-center gap-3">
        <span className="tabular-nums" style={{
          fontSize: '26px',
          fontWeight: 800,
          color: Theme.colors.primaryText,
        }}>
          ${typeof currentPrice === 'number' ? currentPrice.toFixed(2) : currentPrice}
        </span>
        {(changeDisplay || changePctDisplay) && (
          <span className="tabular-nums" style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 10px',
            borderRadius: Theme.radius.full,
            fontSize: '12px',
            fontWeight: 700,
            color: changeColor,
            background: changeBg,
            border: `1px solid ${changeBorder}`,
          }}>
            {changeDisplay} ({changePctDisplay})
          </span>
        )}
        {data.volume && (
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: Theme.colors.tertiaryText,
            marginLeft: 'auto',
          }}>
            Vol: {typeof data.volume === 'number' ? data.volume.toLocaleString() : data.volume}
          </span>
        )}
      </div>

      {/* 52W Range card */}
      {(w52High || w52Low) && (
        <div className="card" style={{ padding: '12px 16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: Theme.colors.tertiaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              52W Range
            </span>
            {pctFrom52High !== null && (
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: Theme.radius.full,
                background: Theme.colors.bearishRedBg,
                color: Theme.colors.bearishRed,
                border: `1px solid ${Theme.colors.bearishRedBorder}`,
                fontFamily: 'var(--font-mono)',
              }}>
                {pctFrom52High.toFixed(1)}% from 52W high
              </span>
            )}
          </div>

          {w52Position !== null && (
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <div style={{
                height: '6px',
                borderRadius: Theme.radius.full,
                background: Theme.colors.cardBorder,
                position: 'relative',
                overflow: 'visible',
              }}>
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${w52Position}%`,
                  borderRadius: Theme.radius.full,
                  background: `linear-gradient(to right, ${Theme.colors.bullishGreen}, ${Theme.colors.accentBlue})`,
                }} />
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${w52Position}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: Theme.colors.primaryText,
                  border: `2px solid ${Theme.colors.cardBackground}`,
                  boxShadow: `0 0 0 1px ${Theme.colors.accentBlue}`,
                  zIndex: 1,
                }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '9px', color: Theme.colors.tertiaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                52W Low
              </span>
              <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: Theme.colors.bullishGreen }}>
                {w52Low ? `$${w52Low.toFixed(2)}` : '-'}
              </span>
            </div>
            {currentPrice && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: Theme.colors.tertiaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Current
                </span>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: Theme.colors.primaryText }}>
                  ${currentPrice.toFixed(2)}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              <span style={{ fontSize: '9px', color: Theme.colors.tertiaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                52W High
              </span>
              <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: Theme.colors.bearishRed }}>
                {w52High ? `$${w52High.toFixed(2)}` : '-'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
