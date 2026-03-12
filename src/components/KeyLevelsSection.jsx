import React, { useMemo } from 'react';
import { Theme } from '../models/Theme';

function calcPctDiff(current, level) {
  if (!current || !level) return null;
  return ((level - current) / current) * 100;
}

function formatPct(pct) {
  if (pct === null || pct === undefined) return '';
  const abs = Math.abs(pct).toFixed(1);
  return pct >= 0 ? `+${abs}% away` : `-${abs}% away`;
}

const LevelRow = ({ label, value, pct, isResistance }) => {
  const color = isResistance ? Theme.colors.bearishRed : Theme.colors.bullishGreen;
  const bg = isResistance ? Theme.colors.bearishRedBg : Theme.colors.bullishGreenBg;
  const border = isResistance ? Theme.colors.bearishRedBorder : Theme.colors.bullishGreenBorder;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '7px 0',
      borderBottom: `1px solid ${Theme.colors.borderSubtle}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: '11px',
          fontWeight: 500,
          color: Theme.colors.secondaryText,
        }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          fontSize: '9px',
          fontWeight: 600,
          padding: '2px 7px',
          borderRadius: Theme.radius.full,
          background: bg,
          color: color,
          border: `1px solid ${border}`,
          fontFamily: 'var(--font-mono)',
        }}>
          {pct !== null ? formatPct(pct) : ''}
        </span>
        <span className="tabular-nums" style={{
          fontSize: '12px',
          fontWeight: 700,
          color: Theme.colors.primaryText,
          minWidth: '60px',
          textAlign: 'right',
        }}>
          ${value?.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

export const KeyLevelsSection = ({ smaData, ticker }) => {
  const levels = useMemo(() => {
    const bars = smaData?.bars;
    if (!bars || bars.length < 20) return null;

    const currentPrice = bars[0]?.close ?? bars[0]?.c;
    if (!currentPrice) return null;

    // 52-week high/low across all bars
    let high52 = -Infinity;
    let low52 = Infinity;
    for (const bar of bars) {
      const h = bar.high ?? bar.h;
      const l = bar.low ?? bar.l;
      if (h > high52) high52 = h;
      if (l < low52) low52 = l;
    }

    // Swing highs/lows within last 60 bars (local maxima/minima)
    const lookback = Math.min(60, bars.length);
    const swingHighs = [];
    const swingLows = [];

    for (let i = 1; i < lookback - 1; i++) {
      const prevH = bars[i - 1].high ?? bars[i - 1].h;
      const currH = bars[i].high ?? bars[i].h;
      const nextH = bars[i + 1].high ?? bars[i + 1].h;

      const prevL = bars[i - 1].low ?? bars[i - 1].l;
      const currL = bars[i].low ?? bars[i].l;
      const nextL = bars[i + 1].low ?? bars[i + 1].l;

      if (currH > prevH && currH > nextH) {
        swingHighs.push(currH);
      }
      if (currL < prevL && currL < nextL) {
        swingLows.push(currL);
      }
    }

    // Top 3 swing highs closest to current price (resistance = above price)
    const topSwingHighs = swingHighs
      .filter(v => v > currentPrice)
      .sort((a, b) => Math.abs(a - currentPrice) - Math.abs(b - currentPrice))
      .slice(0, 3);

    // Top 3 swing lows closest to current price (support = below price)
    const topSwingLows = swingLows
      .filter(v => v < currentPrice)
      .sort((a, b) => Math.abs(a - currentPrice) - Math.abs(b - currentPrice))
      .slice(0, 3);

    return {
      currentPrice,
      high52: high52 === -Infinity ? null : high52,
      low52: low52 === Infinity ? null : low52,
      swingHighs: topSwingHighs,
      swingLows: topSwingLows,
    };
  }, [smaData]);

  const bars = smaData?.bars;
  if (!bars || bars.length < 20) {
    return (
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: Theme.colors.tertiaryText,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '8px',
        }}>
          Key Levels
        </div>
        <div style={{ fontSize: '12px', color: Theme.colors.secondaryText }}>
          Not enough data
        </div>
      </div>
    );
  }

  if (!levels) return null;

  const { currentPrice, high52, low52, swingHighs, swingLows } = levels;

  // Build resistance rows: 52W high first, then swing highs (nearest first)
  const resistanceRows = [];
  if (high52 !== null) {
    resistanceRows.push({
      label: '52W High',
      value: high52,
      pct: calcPctDiff(currentPrice, high52),
    });
  }
  swingHighs.forEach((v, i) => {
    resistanceRows.push({
      label: `Swing High ${i + 1}`,
      value: v,
      pct: calcPctDiff(currentPrice, v),
    });
  });

  // Build support rows: nearest swing lows first, then 52W low
  const supportRows = [];
  swingLows.forEach((v, i) => {
    supportRows.push({
      label: `Swing Low ${i + 1}`,
      value: v,
      pct: calcPctDiff(currentPrice, v),
    });
  });
  if (low52 !== null) {
    supportRows.push({
      label: '52W Low',
      value: low52,
      pct: calcPctDiff(currentPrice, low52),
    });
  }

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: Theme.colors.tertiaryText,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          Key Levels
        </div>
        <div style={{
          fontSize: '10px',
          fontWeight: 600,
          color: Theme.colors.tertiaryText,
          fontFamily: 'var(--font-mono)',
        }}>
          {ticker} @ ${currentPrice?.toFixed(2)}
        </div>
      </div>

      {/* Resistance section */}
      {resistanceRows.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            fontSize: '9px',
            fontWeight: 700,
            color: Theme.colors.bearishRed,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '4px',
            opacity: 0.8,
          }}>
            Resistance (above)
          </div>
          {resistanceRows.map((row, i) => (
            <LevelRow
              key={`r-${i}`}
              label={row.label}
              value={row.value}
              pct={row.pct}
              isResistance={true}
            />
          ))}
        </div>
      )}

      {/* Support section */}
      {supportRows.length > 0 && (
        <div>
          <div style={{
            fontSize: '9px',
            fontWeight: 700,
            color: Theme.colors.bullishGreen,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '4px',
            marginTop: resistanceRows.length > 0 ? '4px' : 0,
            opacity: 0.8,
          }}>
            Support (below)
          </div>
          {supportRows.map((row, i) => (
            <LevelRow
              key={`s-${i}`}
              label={row.label}
              value={row.value}
              pct={row.pct}
              isResistance={false}
            />
          ))}
        </div>
      )}

      {resistanceRows.length === 0 && supportRows.length === 0 && (
        <div style={{ fontSize: '12px', color: Theme.colors.secondaryText }}>
          No swing levels detected in recent data.
        </div>
      )}
    </div>
  );
};
