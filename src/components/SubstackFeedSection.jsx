import React, { useState, useEffect } from 'react';
import { Theme } from '../models/Theme';
import { ApiService } from '../services/ApiService';

const SENTIMENT_CONFIG = {
  bullish: { color: Theme.colors.bullishGreen, bg: Theme.colors.bullishGreenBg, label: 'BULLISH' },
  bearish: { color: Theme.colors.bearishRed, bg: Theme.colors.bearishRedBg, label: 'BEARISH' },
  neutral: { color: Theme.colors.secondaryText, bg: 'rgba(255,255,255,0.04)', label: 'NEUTRAL' },
  mixed: { color: Theme.colors.accentAmber, bg: Theme.colors.accentAmberDim, label: 'MIXED' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function PostCard({ post, onTickerClick }) {
  const sentiment = post.sentiment ? SENTIMENT_CONFIG[post.sentiment] : null;

  return (
    <div style={{
      padding: '16px',
      background: Theme.colors.cardBackground,
      border: `1px solid ${Theme.colors.cardBorder}`,
      borderRadius: Theme.radius.md,
      transition: 'border-color 0.2s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{
          fontSize: '9px',
          fontWeight: 700,
          color: post.sourceColor,
          background: `${post.sourceColor}18`,
          padding: '2px 7px',
          borderRadius: Theme.radius.full,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          {post.source}
        </span>
        {sentiment && (
          <span style={{
            fontSize: '9px',
            fontWeight: 700,
            color: sentiment.color,
            background: sentiment.bg,
            padding: '2px 7px',
            borderRadius: Theme.radius.full,
            letterSpacing: '0.5px',
          }}>
            {sentiment.label}
          </span>
        )}
        <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText, marginLeft: 'auto' }}>
          {timeAgo(post.date)}
        </span>
      </div>

      {/* Title — clickable link */}
      <a
        href={post.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: Theme.colors.primaryText,
          lineHeight: 1.4,
          textDecoration: 'none',
          display: 'block',
          marginBottom: '8px',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = Theme.colors.accentBlue; }}
        onMouseLeave={e => { e.currentTarget.style.color = Theme.colors.primaryText; }}
      >
        {post.title}
      </a>

      {/* Summary */}
      {post.summary && (
        <div style={{
          fontSize: '11.5px',
          color: Theme.colors.secondaryText,
          lineHeight: 1.6,
          marginBottom: '10px',
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: Theme.radius.sm,
          borderLeft: `2px solid ${post.sourceColor}40`,
        }}>
          {post.summary}
        </div>
      )}

      {/* Watch For */}
      {post.watchFor && post.watchFor.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{
            fontSize: '9px',
            fontWeight: 700,
            color: Theme.colors.accentAmber,
            letterSpacing: '0.5px',
            marginBottom: '6px',
            textTransform: 'uppercase',
          }}>
            What to Watch
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {post.watchFor.map((item, i) => (
              <div key={i} style={{
                fontSize: '11px',
                color: Theme.colors.primaryText,
                lineHeight: 1.5,
                paddingLeft: '10px',
                borderLeft: `1px solid ${Theme.colors.accentAmber}40`,
              }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tickers */}
      {post.tickers && post.tickers.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {post.tickers.map(ticker => (
            <span
              key={ticker}
              onClick={(e) => {
                e.stopPropagation();
                onTickerClick?.(ticker);
              }}
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: Theme.colors.accentBlue,
                background: Theme.colors.accentBlueDim,
                padding: '2px 8px',
                borderRadius: Theme.radius.full,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,138,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = Theme.colors.accentBlueDim; }}
            >
              {ticker}
            </span>
          ))}
        </div>
      )}

      {/* No summary fallback */}
      {!post.summary && (
        <div style={{
          fontSize: '11px',
          color: Theme.colors.tertiaryText,
          fontStyle: 'italic',
        }}>
          Summary loading or unavailable
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      padding: '16px',
      background: Theme.colors.cardBackground,
      border: `1px solid ${Theme.colors.cardBorder}`,
      borderRadius: Theme.radius.md,
    }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <div style={{ width: 90, height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ width: 50, height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.03)' }} />
      </div>
      <div style={{ width: '80%', height: 15, borderRadius: 4, background: 'rgba(255,255,255,0.05)', marginBottom: 10 }} />
      <div style={{
        padding: '10px 12px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 6,
        borderLeft: '2px solid rgba(255,255,255,0.06)',
        marginBottom: 10,
      }}>
        <div style={{ width: '95%', height: 11, borderRadius: 4, background: 'rgba(255,255,255,0.04)', marginBottom: 6 }} />
        <div style={{ width: '70%', height: 11, borderRadius: 4, background: 'rgba(255,255,255,0.03)' }} />
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <div style={{ width: 60, height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ width: 60, height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.03)' }} />
      </div>
    </div>
  );
}

export function SubstackFeedSection({ onTickerClick }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    ApiService.getSubstackFeed()
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const sources = data?.sources || [];
  const allPosts = data?.posts || [];
  const filteredPosts = filter === 'all'
    ? allPosts
    : allPosts.filter(p => p.source === filter);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: Theme.colors.primaryText, letterSpacing: '0.5px' }}>
          RESEARCH FEED
        </span>
        {data?.updatedAt && (
          <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>
            Updated {data.updatedAt}
          </span>
        )}
        {loading && (
          <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>
            Scraping & summarizing articles...
          </span>
        )}
      </div>

      {/* Source filter pills */}
      {!loading && !error && sources.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              fontSize: '10px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: Theme.radius.full,
              border: 'none',
              cursor: 'pointer',
              background: filter === 'all' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
              color: filter === 'all' ? Theme.colors.primaryText : Theme.colors.secondaryText,
              transition: 'all 0.15s',
            }}
          >
            All
          </button>
          {sources.map(s => (
            <button
              key={s.name}
              onClick={() => setFilter(s.name)}
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: Theme.radius.full,
                border: 'none',
                cursor: 'pointer',
                background: filter === s.name ? `${s.color}22` : 'rgba(255,255,255,0.04)',
                color: filter === s.name ? s.color : Theme.colors.secondaryText,
                transition: 'all 0.15s',
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Posts */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {error && (
        <div style={{
          padding: '16px',
          background: Theme.colors.bearishRedBg,
          border: `1px solid ${Theme.colors.bearishRedBorder}`,
          borderRadius: Theme.radius.md,
          fontSize: '12px',
          color: Theme.colors.bearishRed,
        }}>
          Failed to load research feed: {error}
        </div>
      )}

      {!loading && !error && filteredPosts.length === 0 && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          fontSize: '12px',
          color: Theme.colors.tertiaryText,
        }}>
          No posts found
        </div>
      )}

      {!loading && !error && filteredPosts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredPosts.map((post, i) => (
            <PostCard key={`${post.link}-${i}`} post={post} onTickerClick={onTickerClick} />
          ))}
        </div>
      )}
    </div>
  );
}
