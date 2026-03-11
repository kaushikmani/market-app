import React, { useState, useEffect } from 'react';
import { Theme } from '../models/Theme';
import { ApiService } from '../services/ApiService';

function SkeletonTable() {
  return (
    <div className="card" style={{ padding: '16px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="skeleton" style={{ width: '100%', height: '28px' }} />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton" style={{ width: '100%', height: '24px' }} />
        ))}
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const mins = Math.floor((Date.now() - timestamp) / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return '1 hr ago';
  return `${hrs} hrs ago`;
}

const cellStyle = {
  padding: '6px 8px',
  fontSize: '11px',
  fontFamily: 'var(--font-mono)',
  whiteSpace: 'nowrap',
  borderBottom: `1px solid ${Theme.colors.borderSubtle}`,
};

const headerStyle = {
  ...cellStyle,
  fontSize: '9px',
  fontWeight: 700,
  color: Theme.colors.tertiaryText,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderBottom: `1px solid ${Theme.colors.cardBorder}`,
  position: 'sticky',
  top: 0,
  background: Theme.colors.cardBackground,
};

export function PreMarketMoversSection({ onTickerClick }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const result = await ApiService.getPreMarketMovers();
        if (mounted) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 10 * 60 * 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (loading) return <SkeletonTable />;

  if (error) {
    return (
      <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
        <span style={{ fontSize: '12px', color: Theme.colors.bearishRed }}>
          Failed to load pre-market movers: {error}
        </span>
      </div>
    );
  }

  const movers = data?.movers || [];

  if (movers.length === 0) {
    return (
      <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
        <span style={{ fontSize: '12px', color: Theme.colors.secondaryText }}>
          No pre-market movers available
        </span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>
          {movers.length} stocks{data?.source === 'mock' ? ' (sample data)' : ''}
        </span>
        <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>
          Updated: {formatTimeAgo(data?.timestamp)}
        </span>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr>
                <th style={{ ...headerStyle, textAlign: 'left' }}>Ticker</th>
                <th style={{ ...headerStyle, textAlign: 'left' }}>Company</th>
                <th style={{ ...headerStyle, textAlign: 'right' }}>Mkt Cap</th>
                <th style={{ ...headerStyle, textAlign: 'right' }}>Price</th>
                <th style={{ ...headerStyle, textAlign: 'right' }}>PM Price</th>
                <th style={{ ...headerStyle, textAlign: 'right' }}>PM Chg%</th>
                <th style={{ ...headerStyle, textAlign: 'right' }}>PM Vol</th>
                <th style={{ ...headerStyle, textAlign: 'right' }}>Chg%</th>
                <th style={{ ...headerStyle, textAlign: 'right' }}>Avg Vol</th>
                <th style={{ ...headerStyle, textAlign: 'right' }}>Volume</th>
                <th style={{ ...headerStyle, textAlign: 'right' }}>Vol Chg%</th>
              </tr>
            </thead>
            <tbody>
              {movers.map((m) => {
                const pmColor = m.pmChgPct >= 0 ? Theme.colors.bullishGreen : Theme.colors.bearishRed;
                const chgColor = m.chgPct >= 0 ? Theme.colors.bullishGreen : Theme.colors.bearishRed;
                const volChgColor = m.volChgPct >= 0 ? Theme.colors.bullishGreen : Theme.colors.bearishRed;

                return (
                  <tr
                    key={m.ticker}
                    style={{
                      cursor: 'pointer',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = Theme.colors.cardBackgroundHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => onTickerClick?.(m.ticker)}
                  >
                    <td style={{ ...cellStyle, fontWeight: 800, color: Theme.colors.primaryText, letterSpacing: '0.04em' }}>
                      {m.ticker}
                    </td>
                    <td style={{ ...cellStyle, color: Theme.colors.secondaryText, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.company}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right', color: Theme.colors.secondaryText }}>
                      {m.mktCap || '-'}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right', color: Theme.colors.primaryText }}>
                      {typeof m.price === 'number' ? m.price.toFixed(2) : m.price}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right', color: Theme.colors.primaryText }}>
                      {m.pmPrice != null ? (typeof m.pmPrice === 'number' ? m.pmPrice.toFixed(2) : m.pmPrice) : '-'}
                    </td>
                    <td style={{
                      ...cellStyle,
                      textAlign: 'right',
                      fontWeight: 700,
                      color: pmColor,
                      background: m.pmChgPct >= 0 ? Theme.colors.bullishGreenBg : Theme.colors.bearishRedBg,
                    }}>
                      {m.pmChgPct >= 0 ? '+' : ''}{typeof m.pmChgPct === 'number' ? m.pmChgPct.toFixed(2) : m.pmChgPct}%
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right', color: Theme.colors.secondaryText }}>
                      {m.pmVol || '-'}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right', color: chgColor }}>
                      {m.chgPct >= 0 ? '+' : ''}{typeof m.chgPct === 'number' ? m.chgPct.toFixed(2) : m.chgPct}%
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right', color: Theme.colors.secondaryText }}>
                      {m.avgVol || '-'}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right', color: Theme.colors.secondaryText }}>
                      {m.volume || '-'}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right', color: volChgColor }}>
                      {m.volChgPct !== 0 ? `${m.volChgPct >= 0 ? '+' : ''}${typeof m.volChgPct === 'number' ? m.volChgPct.toFixed(1) : m.volChgPct}%` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
