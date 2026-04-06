import React, { useState } from 'react';
import { Theme } from '../models/Theme';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'google', label: 'News' },
  { key: 'x', label: 'X' },
];

const LoadingSkeleton = () => (
  <div className="card flex flex-col gap-3" style={{ padding: '20px' }}>
    {[1, 2, 3, 4].map(i => (
      <div key={i} style={{ display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: '90%', height: '12px', marginBottom: '6px' }} />
          <div className="skeleton" style={{ width: '40%', height: '10px' }} />
        </div>
      </div>
    ))}
  </div>
);

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

const NewsItem = ({ item }) => {
  const isX = item.provider === 'x';

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        padding: '10px 14px',
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
          color: isX ? Theme.colors.cyan : Theme.colors.accentBlue,
        }}>
          {item.source}
        </span>
        {item.time && (
          <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>
            {timeAgo(item.time)}
          </span>
        )}
        <span style={{
          fontSize: '9px',
          fontWeight: 700,
          padding: '1px 6px',
          borderRadius: Theme.radius.xs,
          background: isX ? 'rgba(34, 211, 238, 0.08)' : 'rgba(255, 255, 255, 0.04)',
          color: isX ? Theme.colors.cyan : Theme.colors.tertiaryText,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          {isX ? 'X' : 'NEWS'}
        </span>

        {isX && item.metrics && (
          <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>
            {item.metrics.likes && `${item.metrics.likes} likes`}
            {item.metrics.reposts && ` · ${item.metrics.reposts} reposts`}
          </span>
        )}
      </div>
    </a>
  );
};

export const StockNewsSection = ({ data, loading, error }) => {
  const [activeTab, setActiveTab] = useState('all');

  if (loading) return <LoadingSkeleton />;

  if (error) return (
    <div className="card flex flex-col items-center justify-center" style={{
      height: '80px',
      background: Theme.colors.bearishRedBg,
      borderColor: Theme.colors.bearishRedBorder,
    }}>
      <span style={{ fontSize: '12px', color: Theme.colors.bearishRed }}>{error}</span>
    </div>
  );

  if (!data) return (
    <div className="card flex items-center justify-center" style={{ height: '80px' }}>
      <span style={{ fontSize: '12px', color: Theme.colors.secondaryText }}>Search a ticker to see news</span>
    </div>
  );

  const allItems = [
    ...(data.google || []),
    ...(data.x || []),
  ].sort((a, b) => {
    if (a.time && b.time) return new Date(b.time) - new Date(a.time);
    return 0;
  });

  const filtered = activeTab === 'all' ? allItems : allItems.filter(i => i.provider === activeTab);

  const counts = {
    all: allItems.length,
    google: (data.google || []).length,
    x: (data.x || []).length,
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Tab bar */}
      <div className="flex items-center gap-1" style={{
        background: Theme.colors.cardBackground,
        borderRadius: Theme.radius.md,
        padding: '3px',
        border: `1px solid ${Theme.colors.cardBorder}`,
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const count = counts[tab.key];
          return (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#fff' : Theme.colors.secondaryText,
                background: isActive ? Theme.colors.accentBlue : 'transparent',
                borderRadius: '8px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                letterSpacing: '0.02em',
              }}
            >
              {tab.label} {count > 0 && <span style={{ opacity: 0.6 }}>({count})</span>}
            </div>
          );
        })}
      </div>

      {/* News list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', maxHeight: '500px', overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center" style={{ padding: '24px' }}>
            <span style={{ fontSize: '12px', color: Theme.colors.secondaryText }}>No news from this source</span>
          </div>
        ) : (
          filtered.map((item, i) => (
            <NewsItem key={`${item.provider}-${i}`} item={item} />
          ))
        )}
      </div>
    </div>
  );
};
