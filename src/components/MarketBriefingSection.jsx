import React from 'react';
import { Theme } from '../models/Theme';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getMarketStatus() {
  const now = new Date();
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hour = est.getHours();
  const min = est.getMinutes();
  const day = est.getDay();
  const time = hour * 60 + min;

  if (day === 0 || day === 6) return { status: 'Closed', color: Theme.colors.tertiaryText };
  if (time < 570) return { status: 'Pre-Market', color: Theme.colors.accentAmber };
  if (time < 960) return { status: 'Market Open', color: Theme.colors.bullishGreen };
  if (time < 1200) return { status: 'After Hours', color: Theme.colors.accentAmber };
  return { status: 'Closed', color: Theme.colors.tertiaryText };
}

const LoadingSkeleton = () => (
  <div className="card" style={{ padding: '20px' }}>
    <div className="skeleton" style={{ width: '40%', height: '16px', marginBottom: '14px' }} />
    <div className="flex flex-col gap-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i}>
          <div className="skeleton" style={{ width: '90%', height: '12px', marginBottom: '6px' }} />
          <div className="skeleton" style={{ width: '30%', height: '10px' }} />
        </div>
      ))}
    </div>
  </div>
);

const BriefingItem = ({ item }) => {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        padding: '10px 16px',
        borderBottom: `1px solid ${Theme.colors.borderSubtle}`,
        textDecoration: 'none',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.background = Theme.colors.cardBackgroundHover}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        fontSize: '12px',
        fontWeight: 500,
        color: Theme.colors.primaryText,
        lineHeight: '1.5',
        marginBottom: '5px',
      }}>
        {item.title}
      </div>

      <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 600,
          color: Theme.colors.cyan,
        }}>
          {item.source}
        </span>
        {item.time && (
          <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>
            {timeAgo(item.time)}
          </span>
        )}

        {item.metrics && (
          <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>
            {item.metrics.likes && `${item.metrics.likes} likes`}
            {item.metrics.reposts && ` · ${item.metrics.reposts} reposts`}
          </span>
        )}
      </div>
    </a>
  );
};

export const MarketBriefingSection = ({ data, loading, error }) => {
  const market = getMarketStatus();

  if (loading) return <LoadingSkeleton />;

  if (error) return (
    <div className="card flex items-center justify-center" style={{
      height: '80px',
      background: Theme.colors.bearishRedBg,
      borderColor: Theme.colors.bearishRedBorder,
    }}>
      <span style={{ fontSize: '12px', color: Theme.colors.bearishRed }}>{error}</span>
    </div>
  );

  if (!data) return null;

  const tradingItems = (data.trading || []).sort((a, b) => {
    if (a.time && b.time) return new Date(b.time) - new Date(a.time);
    return 0;
  });

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
          <div className="flex items-center gap-2">
            <span style={{
              fontSize: '13px',
              fontWeight: 700,
              color: Theme.colors.primaryText,
              letterSpacing: '0.01em',
            }}>
              Market Chatter
            </span>
            <span style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em',
              padding: '1px 6px', borderRadius: '3px',
              background: 'rgba(29, 161, 242, 0.10)',
              color: '#1da1f2',
              border: '1px solid rgba(29, 161, 242, 0.20)',
            }}>
              X
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: market.color,
              display: 'inline-block',
              boxShadow: `0 0 8px ${market.color}`,
            }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: market.color }}>
              {market.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '11px', color: Theme.colors.tertiaryText }}>
            {dateStr}
          </span>
          {data.fetchedAt && (
            <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>
              Updated {timeAgo(data.fetchedAt)}
            </span>
          )}
        </div>
      </div>

      {/* X / Trade Ideas feed */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', maxHeight: '400px', overflowY: 'auto' }}>
        {tradingItems.length === 0 ? (
          <div className="flex items-center justify-center" style={{ padding: '24px' }}>
            <span style={{ fontSize: '12px', color: Theme.colors.secondaryText }}>No posts available</span>
          </div>
        ) : (
          tradingItems.map((item, i) => (
            <BriefingItem key={`${item.source}-${i}`} item={item} />
          ))
        )}
      </div>
    </div>
  );
};
