import React from 'react';
import { Theme } from '../models/Theme';

const BADGE_COLORS = {
  'EARNINGS':      { bg: 'rgba(0, 214, 143, 0.12)', color: '#00d68f', border: 'rgba(0, 214, 143, 0.25)' },
  'FDA':           { bg: 'rgba(0, 214, 143, 0.12)', color: '#00d68f', border: 'rgba(0, 214, 143, 0.25)' },
  'BLA ACCEPTED':  { bg: 'rgba(0, 214, 143, 0.12)', color: '#00d68f', border: 'rgba(0, 214, 143, 0.25)' },
  'PH3 DATA':      { bg: 'rgba(0, 214, 143, 0.12)', color: '#00d68f', border: 'rgba(0, 214, 143, 0.25)' },
  'UPGRADE':       { bg: 'rgba(0, 214, 143, 0.12)', color: '#00d68f', border: 'rgba(0, 214, 143, 0.25)' },
  'GUIDANCE':      { bg: 'rgba(108, 138, 255, 0.12)', color: '#6c8aff', border: 'rgba(108, 138, 255, 0.25)' },
  'EU FILING':     { bg: 'rgba(108, 138, 255, 0.12)', color: '#6c8aff', border: 'rgba(108, 138, 255, 0.25)' },
  'FILING':        { bg: 'rgba(108, 138, 255, 0.12)', color: '#6c8aff', border: 'rgba(108, 138, 255, 0.25)' },
  'M&A':           { bg: 'rgba(108, 138, 255, 0.12)', color: '#6c8aff', border: 'rgba(108, 138, 255, 0.25)' },
  'NDA FILED':     { bg: 'rgba(34, 211, 238, 0.12)', color: '#22d3ee', border: 'rgba(34, 211, 238, 0.25)' },
  'DATA':          { bg: 'rgba(34, 211, 238, 0.12)', color: '#22d3ee', border: 'rgba(34, 211, 238, 0.25)' },
  'DOWNGRADE':     { bg: 'rgba(255, 92, 92, 0.12)', color: '#ff5c5c', border: 'rgba(255, 92, 92, 0.25)' },
  'ACTIVIST':      { bg: 'rgba(245, 166, 35, 0.12)', color: '#f5a623', border: 'rgba(245, 166, 35, 0.25)' },
  'OFFERING':      { bg: 'rgba(245, 166, 35, 0.12)', color: '#f5a623', border: 'rgba(245, 166, 35, 0.25)' },
};

const DEFAULT_BADGE = { bg: 'rgba(255,255,255,0.06)', color: Theme.colors.secondaryText, border: 'rgba(255,255,255,0.10)' };

function getBadgeStyle(type) {
  return BADGE_COLORS[type] || DEFAULT_BADGE;
}

function colorizeNumber(text) {
  if (!text) return text;
  return text.replace(/([+-]?\d+\.?\d*%?)/g, (match) => {
    const num = parseFloat(match);
    if (isNaN(num)) return match;
    if (num > 0) return `<span style="color:#00d68f;font-weight:600">${match}</span>`;
    if (num < 0) return `<span style="color:#ff5c5c;font-weight:600">${match}</span>`;
    return match;
  });
}

const LoadingSkeleton = () => (
  <div className="flex flex-col gap-4">
    {[1, 2, 3].map(i => (
      <div key={i} className="card" style={{ padding: '20px' }}>
        <div className="skeleton" style={{ width: '50%', height: '14px', marginBottom: '14px' }} />
        <div className="skeleton" style={{ width: '100%', height: '10px', marginBottom: '8px' }} />
        <div className="skeleton" style={{ width: '85%', height: '10px', marginBottom: '8px' }} />
        <div className="skeleton" style={{ width: '60%', height: '10px' }} />
      </div>
    ))}
  </div>
);

function FuturesBar({ futures }) {
  if (!futures) return null;

  const items = [
    { label: 'S&P 500', data: futures.sp500 },
    { label: 'NASDAQ', data: futures.nasdaq },
    { label: 'DOW', data: futures.dow },
    { label: 'VIX', data: futures.vix },
  ].filter(i => i.data);

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-2" style={{
      padding: '10px 14px',
      background: Theme.colors.cardBackground,
      borderRadius: Theme.radius.md,
      border: `1px solid ${Theme.colors.cardBorder}`,
      overflowX: 'auto',
    }}>
      {items.map((item, i) => {
        const pct = item.data.changePct;
        const isUp = pct >= 0;
        const color = item.label === 'VIX'
          ? (pct >= 0 ? '#ff5c5c' : '#00d68f')  // VIX up = bearish
          : (isUp ? '#00d68f' : '#ff5c5c');

        return (
          <React.Fragment key={item.label}>
            {i > 0 && <span style={{ color: Theme.colors.borderSubtle, fontSize: '14px' }}>|</span>}
            <div className="flex items-center gap-2" style={{ whiteSpace: 'nowrap' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: Theme.colors.tertiaryText,
                letterSpacing: '0.06em',
              }}>
                {item.label}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: Theme.colors.secondaryText,
                fontFamily: 'var(--font-mono)',
              }}>
                {item.data.price?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color,
                fontFamily: 'var(--font-mono)',
              }}>
                {isUp ? '+' : ''}{pct?.toFixed(2)}%
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function MacroNarrativeCard({ data }) {
  if (!data) return null;
  return (
    <div className="card" style={{ padding: '18px 20px', overflow: 'hidden' }}>
      <div className="flex items-center gap-2" style={{ marginBottom: '14px' }}>
        <span style={{ fontSize: '14px' }}>🌐</span>
        <span style={{
          fontSize: '12px',
          fontWeight: 700,
          color: Theme.colors.primaryText,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          Macro Narrative & Overnight Summary
        </span>
      </div>

      <p style={{
        fontSize: '12px',
        lineHeight: '1.7',
        color: Theme.colors.primaryText,
        margin: '0 0 14px 0',
        fontFamily: 'var(--font-mono)',
      }}>
        {data.summary}
      </p>

      {data.geopoliticalAlert && (
        <div style={{
          padding: '10px 14px',
          marginBottom: '14px',
          borderRadius: Theme.radius.sm,
          background: 'rgba(255, 92, 92, 0.06)',
          border: '1px solid rgba(255, 92, 92, 0.20)',
          borderLeft: '3px solid #ff5c5c',
        }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '4px' }}>
            <span style={{ fontSize: '11px' }}>⚠️</span>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#ff5c5c',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              Geopolitical Alert
            </span>
          </div>
          <span style={{
            fontSize: '11px',
            color: Theme.colors.primaryText,
            lineHeight: '1.5',
          }}>
            {data.geopoliticalAlert}
          </span>
        </div>
      )}

      {data.keyEarnings && (
        <div style={{ marginBottom: '12px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            color: Theme.colors.accentAmber,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '4px',
          }}>
            Key Earnings Read
          </span>
          <span style={{
            fontSize: '11px',
            color: Theme.colors.primaryText,
            lineHeight: '1.6',
          }}
            dangerouslySetInnerHTML={{ __html: colorizeNumber(data.keyEarnings) }}
          />
        </div>
      )}

      <div className="flex flex-col gap-2" style={{
        paddingTop: '10px',
        borderTop: `1px solid ${Theme.colors.borderSubtle}`,
      }}>
        {data.asia && (
          <div>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: Theme.colors.accentBlue,
              letterSpacing: '0.06em',
              marginRight: '8px',
            }}>
              ASIA
            </span>
            <span style={{ fontSize: '11px', color: Theme.colors.secondaryText, lineHeight: '1.5' }}
              dangerouslySetInnerHTML={{ __html: colorizeNumber(data.asia) }}
            />
          </div>
        )}
        {data.europe && (
          <div>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: Theme.colors.accentBlue,
              letterSpacing: '0.06em',
              marginRight: '8px',
            }}>
              EUROPE
            </span>
            <span style={{ fontSize: '11px', color: Theme.colors.secondaryText, lineHeight: '1.5' }}
              dangerouslySetInnerHTML={{ __html: colorizeNumber(data.europe) }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function GapPill({ item, isUp, onTickerClick }) {
  const color = isUp ? '#00d68f' : '#ff5c5c';
  const bg = isUp ? 'rgba(0, 214, 143, 0.10)' : 'rgba(255, 92, 92, 0.10)';
  const border = isUp ? 'rgba(0, 214, 143, 0.20)' : 'rgba(255, 92, 92, 0.20)';

  return (
    <span
      onClick={() => onTickerClick(item.ticker)}
      title={item.reason || `${item.ticker} ${item.change}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: Theme.radius.xs,
        background: bg,
        border: `1px solid ${border}`,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = isUp ? 'rgba(0, 214, 143, 0.18)' : 'rgba(255, 92, 92, 0.18)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = bg;
      }}
    >
      <span style={{
        fontSize: '11px',
        fontWeight: 700,
        color,
        fontFamily: 'var(--font-mono)',
      }}>
        {item.ticker}
      </span>
      <span style={{
        fontSize: '10px',
        fontWeight: 600,
        color,
        opacity: 0.8,
      }}>
        {item.change}
      </span>
    </span>
  );
}

function GapScannerCard({ data, onTickerClick }) {
  if (!data) return null;

  const hasUp = data.gappingUp?.length > 0;
  const hasDown = data.gappingDown?.length > 0;
  if (!hasUp && !hasDown) return null;

  return (
    <div className="card" style={{ padding: '18px 20px', overflow: 'hidden' }}>
      <div className="flex items-center gap-2" style={{ marginBottom: '16px' }}>
        <span style={{ fontSize: '14px' }}>📊</span>
        <span style={{
          fontSize: '12px',
          fontWeight: 700,
          color: Theme.colors.primaryText,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          Gap Scanner
        </span>
        <span style={{
          fontSize: '9px',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: Theme.radius.xs,
          background: 'rgba(0, 214, 143, 0.08)',
          color: '#00d68f',
          border: '1px solid rgba(0, 214, 143, 0.15)',
          letterSpacing: '0.04em',
        }}>
          LIVE
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {hasUp && (
          <div>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: Theme.colors.tertiaryText,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '8px',
            }}>
              Gapping Up
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {data.gappingUp.map((item, i) => (
                <GapPill key={`up-${item.ticker}-${i}`} item={item} isUp={true} onTickerClick={onTickerClick} />
              ))}
            </div>
          </div>
        )}
        {hasDown && (
          <div>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: Theme.colors.tertiaryText,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '8px',
            }}>
              Gapping Down
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {data.gappingDown.map((item, i) => (
                <GapPill key={`down-${item.ticker}-${i}`} item={item} isUp={false} onTickerClick={onTickerClick} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CatalystsCard({ data, onTickerClick }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="card" style={{ padding: '18px 20px', overflow: 'hidden' }}>
      <div className="flex items-center gap-2" style={{ marginBottom: '16px' }}>
        <span style={{ fontSize: '14px' }}>🧬</span>
        <span style={{
          fontSize: '12px',
          fontWeight: 700,
          color: Theme.colors.primaryText,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          Catalysts
        </span>
      </div>

      <div className="flex items-center" style={{
        padding: '0 0 8px 0',
        borderBottom: `1px solid ${Theme.colors.borderSubtle}`,
        marginBottom: '4px',
      }}>
        <span style={{ width: '70px', fontSize: '9px', fontWeight: 700, color: Theme.colors.tertiaryText, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Ticker
        </span>
        <span style={{ width: '110px', fontSize: '9px', fontWeight: 700, color: Theme.colors.tertiaryText, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Catalyst
        </span>
        <span style={{ flex: 1, fontSize: '9px', fontWeight: 700, color: Theme.colors.tertiaryText, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Description
        </span>
      </div>

      {data.map((item, i) => {
        const badge = getBadgeStyle(item.type);
        return (
          <div
            key={`${item.ticker}-${i}`}
            className="flex items-start"
            style={{
              padding: '10px 0',
              borderBottom: i < data.length - 1 ? `1px solid ${Theme.colors.borderSubtle}` : 'none',
            }}
          >
            <span
              onClick={() => onTickerClick(item.ticker)}
              style={{
                width: '70px',
                fontSize: '12px',
                fontWeight: 700,
                color: Theme.colors.primaryText,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.color = Theme.colors.accentBlue}
              onMouseLeave={e => e.currentTarget.style.color = Theme.colors.primaryText}
            >
              {item.ticker}
            </span>
            <span style={{ width: '110px', flexShrink: 0 }}>
              <span style={{
                fontSize: '9px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: Theme.radius.xs,
                background: badge.bg,
                color: badge.color,
                border: `1px solid ${badge.border}`,
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}>
                {item.type}
              </span>
            </span>
            <span style={{
              flex: 1,
              fontSize: '11px',
              color: Theme.colors.secondaryText,
              lineHeight: '1.5',
            }}>
              {item.description}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const PreMarketReportSection = ({ data, loading, error, onTickerClick }) => {
  if (loading) return <LoadingSkeleton />;

  if (error) return (
    <div className="card flex items-center justify-center" style={{
      height: '60px',
      background: Theme.colors.bearishRedBg,
      borderColor: Theme.colors.bearishRedBorder,
    }}>
      <span style={{ fontSize: '11px', color: Theme.colors.bearishRed }}>Pre-market report unavailable</span>
    </div>
  );

  if (!data) return null;

  const genTime = data.generatedAt
    ? new Date(data.generatedAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/New_York',
      }) + ' ET'
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{
            fontSize: '13px',
            fontWeight: 700,
            color: Theme.colors.primaryText,
            letterSpacing: '-0.01em',
          }}>
            Pre-Market Report
          </span>
          <span style={{
            fontSize: '9px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: Theme.radius.full,
            background: Theme.colors.accentBlueDim,
            color: Theme.colors.accentBlue,
            border: `1px solid ${Theme.colors.accentBlueBorder}`,
            letterSpacing: '0.04em',
          }}>
            LIVE
          </span>
        </div>
        {genTime && (
          <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>
            Updated {genTime}
          </span>
        )}
      </div>

      <FuturesBar futures={data.futures} />
      <MacroNarrativeCard data={data.macroNarrative} />
      <CatalystsCard data={data.catalysts} onTickerClick={onTickerClick} />
    </div>
  );
};
