import React from 'react';
import { Theme } from '../models/Theme';

const LoadingSkeleton = () => (
  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} style={{ padding: '10px 12px', borderBottom: `1px solid ${Theme.colors.borderSubtle}` }}>
        <div className="skeleton" style={{ width: '100%', height: '12px' }} />
      </div>
    ))}
  </div>
);

const COLUMNS = [
  { key: 'ticker', label: 'Ticker', width: '60px' },
  { key: 'company', label: 'Company', flex: 1 },
  { key: 'marketCap', label: 'Mkt Cap', width: '70px', align: 'right' },
  { key: 'pe', label: 'P/E', width: '55px', align: 'right' },
  { key: 'price', label: 'Price', width: '65px', align: 'right' },
  { key: 'change', label: 'Change', width: '65px', align: 'right' },
];

const PeerRow = ({ peer, isLast, onTickerClick }) => {
  const changeStr = peer.change || '';
  const isPositive = changeStr.includes('+') || (!changeStr.startsWith('-') && parseFloat(changeStr) > 0);
  const isNegative = changeStr.startsWith('-');
  const changeColor = isPositive ? Theme.colors.bullishGreen : isNegative ? Theme.colors.bearishRed : Theme.colors.secondaryText;

  return (
    <div className="flex items-center" style={{
      padding: '8px 12px',
      borderBottom: isLast ? 'none' : `1px solid ${Theme.colors.borderSubtle}`,
      fontSize: '12px',
      transition: 'background 0.15s ease',
      cursor: onTickerClick ? 'pointer' : 'default',
    }}
    onClick={() => onTickerClick && peer.ticker && onTickerClick(peer.ticker)}
    onMouseEnter={e => e.currentTarget.style.background = Theme.colors.cardBackgroundHover}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: '60px',
        fontWeight: 700,
        color: Theme.colors.accentBlue,
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        textDecoration: 'underline',
        textDecorationColor: Theme.colors.accentBlueBorder,
        textUnderlineOffset: '2px',
      }}>
        {peer.ticker}
      </div>
      <div style={{ flex: 1, color: Theme.colors.primaryText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px', fontSize: '11px' }}>
        {peer.company}
      </div>
      <div className="tabular-nums" style={{ width: '70px', textAlign: 'right', color: Theme.colors.tertiaryText, fontSize: '11px' }}>
        {peer.marketCap}
      </div>
      <div className="tabular-nums" style={{ width: '55px', textAlign: 'right', color: Theme.colors.tertiaryText, fontSize: '11px' }}>
        {peer.pe}
      </div>
      <div className="tabular-nums" style={{ width: '65px', textAlign: 'right', color: Theme.colors.primaryText, fontWeight: 600, fontSize: '11px' }}>
        {peer.price}
      </div>
      <div className="tabular-nums" style={{ width: '65px', textAlign: 'right', color: changeColor, fontWeight: 600, fontSize: '11px' }}>
        {peer.change}
      </div>
    </div>
  );
};

export const SimilarStocksSection = ({ data, loading, error, industry, onTickerClick }) => {
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

  if (!data || !data.peers || data.peers.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center" style={{ height: '80px' }}>
        <span style={{ fontSize: '12px', color: Theme.colors.secondaryText }}>No peer data available</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {industry && (
        <div className="flex items-center gap-2">
          <span className="pill pill-gray">{industry}</span>
          <span style={{ fontSize: '11px', color: Theme.colors.tertiaryText }}>{data.peers.length} peers</span>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div className="flex items-center" style={{
          padding: '8px 12px',
          background: Theme.colors.surfaceSubtle,
          borderBottom: `1px solid ${Theme.colors.cardBorder}`,
        }}>
          {COLUMNS.map(col => (
            <div key={col.key} style={{
              width: col.width,
              flex: col.flex,
              fontSize: '9px',
              fontWeight: 700,
              color: Theme.colors.tertiaryText,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textAlign: col.align || 'left',
            }}>
              {col.label}
            </div>
          ))}
        </div>

        {data.peers.map((peer, i) => (
          <PeerRow key={peer.ticker || i} peer={peer} isLast={i === data.peers.length - 1} onTickerClick={onTickerClick} />
        ))}
      </div>
    </div>
  );
};
