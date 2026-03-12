import React from 'react';
import { Theme } from '../models/Theme';

const getSentimentPill = (sentiment) => {
  if (!sentiment) return null;
  const s = sentiment.toLowerCase();
  if (s.includes('bullish') || s.includes('positive')) return { text: 'Bullish', class: 'pill pill-green' };
  if (s.includes('bearish') || s.includes('negative')) return { text: 'Bearish', class: 'pill pill-red' };
  return { text: 'Neutral', class: 'pill pill-gray' };
};

const getScoreStyle = (score, sentiment) => {
  if (!score) return null;
  const s = (sentiment || '').toLowerCase();
  const isBullish = s.includes('bullish');
  const isBearish = s.includes('bearish');
  return {
    fontSize: '9px', fontWeight: 700, padding: '1px 5px',
    borderRadius: '3px', color: isBullish ? '#22c55e' : isBearish ? '#ef4444' : '#888',
    background: isBullish ? 'rgba(34,197,94,0.1)' : isBearish ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
  };
};

const LoadingSkeleton = () => (
  <div className="flex flex-col gap-3">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="card" style={{ padding: '16px' }}>
        <div className="flex gap-2 items-center" style={{ marginBottom: '10px' }}>
          <div className="skeleton" style={{ width: '48px', height: '18px' }} />
          <div className="skeleton" style={{ width: '60px', height: '18px' }} />
        </div>
        <div className="skeleton" style={{ width: '100%', height: '12px', marginBottom: '6px' }} />
        <div className="skeleton" style={{ width: '80%', height: '12px' }} />
      </div>
    ))}
  </div>
);

function fmtAge(publishedAt) {
  if (!publishedAt) return null;
  const s = Math.floor((Date.now() - new Date(publishedAt)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const NewsCard = ({ article }) => {
  const pill = getSentimentPill(article.sentiment);
  const scoreStyle = getScoreStyle(article.sentimentScore, article.sentiment);
  const age = fmtAge(article.publishedAt);
  const tickers = article.tickers?.slice(0, 3) || (article.ticker ? [article.ticker] : []);

  const handleClick = () => {
    if (article.url) window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="card"
      onClick={handleClick}
      style={{ padding: '14px 16px', cursor: article.url ? 'pointer' : 'default' }}
      onMouseEnter={e => { if (article.url) e.currentTarget.style.borderColor = Theme.colors.accentBlue; }}
      onMouseLeave={e => e.currentTarget.style.borderColor = Theme.colors.cardBorder}
    >
      <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
        {tickers.map(t => (
          <span key={t} className="pill pill-blue" style={{ fontFamily: 'var(--font-mono)' }}>{t}</span>
        ))}
        {pill && <span className={pill.class}>{pill.text}</span>}
        {article.sentimentScore && scoreStyle && (
          <span style={scoreStyle}>{article.sentimentScore}/10</span>
        )}
        <span style={{ fontSize: '9px', color: Theme.colors.tertiaryText, marginLeft: 'auto' }}>
          {article.source && <span style={{ fontWeight: 500 }}>{article.source}</span>}
          {article.source && age && ' · '}
          {age}
        </span>
      </div>
      <div style={{ fontSize: '12px', fontWeight: 500, color: Theme.colors.primaryText, lineHeight: '1.5' }}>
        {article.title || article.summary}
      </div>
      {article.title && article.summary && article.summary !== article.title && (
        <div style={{ fontSize: '11px', color: Theme.colors.secondaryText, lineHeight: '1.4', marginTop: '4px' }}>
          {article.summary}
        </div>
      )}
    </div>
  );
};

export const NewsSection = ({ data, loading, error }) => {
  if (loading) return <LoadingSkeleton />;

  if (error) return (
    <div className="card flex flex-col items-center justify-center" style={{
      height: '140px',
      background: Theme.colors.bearishRedBg,
      borderColor: Theme.colors.bearishRedBorder,
    }}>
      <span style={{ fontSize: '12px', color: Theme.colors.bearishRed }}>{error}</span>
    </div>
  );

  if (!data || !data.articles || data.articles.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center" style={{ height: '140px' }}>
        <span style={{ fontSize: '12px', color: Theme.colors.secondaryText }}>No market news at this time — check back closer to market open</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <span className="pill pill-gray">{data.articles.length} articles</span>
      </div>
      {data.articles.map((article, i) => (
        <NewsCard key={i} article={article} />
      ))}
    </div>
  );
};
