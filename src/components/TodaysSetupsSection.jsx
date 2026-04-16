import React, { useState, useMemo } from 'react';
import { Theme } from '../models/Theme';

const SECTOR_NARRATIVES = {
  'ETFs & Indices': 'Broad market direction & sector rotation',
  'Mega Cap Tech': 'AI infrastructure spending & platform dominance',
  'Cybersecurity': 'Enterprise security spend rising with AI threats',
  'Storage & Memory': 'AI training data demand driving memory cycles',
  'Chip Design & Processors': 'AI capex cycle + US chip reshoring',
  'Semiconductor Equipment': 'Wafer fab equipment demand + capacity expansion',
  'AI & Custom Silicon': 'Custom AI accelerators + next-gen interconnects',
  'Optical/Photonics': 'Switches, routers & fiber for AI data centers',
  'AI Infrastructure & Hardware': 'AI data center buildout + server/power',
  'Software & Cloud': 'AI monetization + cloud migration',
  'Crypto & Blockchain': 'Institutional adoption & Bitcoin cycle',
  'Nuclear & Utilities': 'AI data center power demand',
  'Solar & Clean Energy': 'IRA subsidies + grid modernization',
  'Defense & Aerospace': 'Global rearmament & drone warfare',
  'Space': 'Commercial launch + satellite constellations',
  'Robotics & Automation': 'Labor shortage + humanoid robotics push',
  'Quantum Computing': 'Early commercialization + government funding',
  'Fintech & Insurance': 'AI-driven underwriting & neobank growth',
  'Banks & Payments': 'Rate cycle + digital payments growth',
  'China': 'Stimulus + AI competition + ADR sentiment',
  'EVs & Charging': 'EV adoption curve + charging infrastructure',
  'Air Mobility & Lidar': 'eVTOL certification progress + autonomy',
  'Healthcare & Biotech': 'GLP-1 boom + AI drug discovery',
  'Housing & Real Estate': 'Rate sensitivity + housing shortage',
  'Social & Media': 'Ad spend recovery + creator economy',
  'Consumer & Retail': 'Consumer resilience vs inflation pressure',
  'Restaurants': 'Same-store sales + franchise expansion',
  'Travel & Leisure': 'Post-COVID travel normalization',
  'Oil & Gas': 'OPEC discipline + energy security',
  'Materials & Industrial': 'Infrastructure spending + reshoring',
  'Battery & EV Materials': 'Lithium cycle + solid state batteries',
  'Legacy Tech': 'AI-driven enterprise modernization',
  'Meme & Speculative': 'Retail sentiment & momentum plays',
};

const SETUP_CONFIG = {
  multi_inside_day: {
    color: '#ff9500',
    bg: 'rgba(255, 149, 0, 0.08)',
    border: 'rgba(255, 149, 0, 0.18)',
    icon: '◆◆',
    category: 'compression',
  },
  inside_day: {
    color: Theme.colors.accentAmber,
    bg: 'rgba(245, 166, 35, 0.06)',
    border: 'rgba(245, 166, 35, 0.15)',
    icon: '◆',
    category: 'compression',
  },
  sma_reclaim: {
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.06)',
    border: 'rgba(52, 211, 153, 0.15)',
    icon: '↑',
    category: 'bullish',
  },
  ema_pullback: {
    color: Theme.colors.accentBlue,
    bg: 'rgba(108, 138, 255, 0.06)',
    border: 'rgba(108, 138, 255, 0.15)',
    icon: '↩',
    category: 'bullish',
  },
  stage2_breakout: {
    color: Theme.colors.bullishGreen,
    bg: 'rgba(0, 214, 143, 0.06)',
    border: 'rgba(0, 214, 143, 0.15)',
    icon: '▲',
    category: 'bullish',
  },
  overextended: {
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.06)',
    border: 'rgba(249, 115, 22, 0.15)',
    icon: '⚠',
    category: 'caution',
  },
  breakout_retest: {
    color: Theme.colors.cyan,
    bg: 'rgba(34, 211, 238, 0.06)',
    border: 'rgba(34, 211, 238, 0.15)',
    icon: '↺',
    category: 'bullish',
  },
  downtrend_break: {
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.06)',
    border: 'rgba(34, 197, 94, 0.15)',
    icon: '↗',
    category: 'bullish',
  },
  uptrend_break: {
    color: Theme.colors.bearishRed,
    bg: 'rgba(255, 92, 92, 0.06)',
    border: 'rgba(255, 92, 92, 0.12)',
    icon: '↘',
    category: 'bearish',
  },
  breakdown: {
    color: Theme.colors.bearishRed,
    bg: 'rgba(255, 92, 92, 0.06)',
    border: 'rgba(255, 92, 92, 0.12)',
    icon: '▼',
    category: 'bearish',
  },
  volume_surge: {
    color: Theme.colors.accentPurple,
    bg: 'rgba(167, 139, 250, 0.06)',
    border: 'rgba(167, 139, 250, 0.15)',
    icon: '⚡',
    category: 'momentum',
  },
  tight_range: {
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.06)',
    border: 'rgba(148, 163, 184, 0.15)',
    icon: '≡',
    category: 'compression',
  },
  near_21d_buy: {
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.06)',
    border: 'rgba(52, 211, 153, 0.15)',
    icon: '⑳',
    category: 'buy',
  },
  leader_8_10d_buy: {
    color: Theme.colors.bullishGreen,
    bg: 'rgba(0, 214, 143, 0.08)',
    border: 'rgba(0, 214, 143, 0.18)',
    icon: '★',
    category: 'buy',
  },
  near_21d_sell: {
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.06)',
    border: 'rgba(249, 115, 22, 0.15)',
    icon: '⑳',
    category: 'sell',
  },
  leader_8_10d_sell: {
    color: Theme.colors.bearishRed,
    bg: 'rgba(255, 92, 92, 0.08)',
    border: 'rgba(255, 92, 92, 0.15)',
    icon: '★',
    category: 'sell',
  },
  rsi_oversold: {
    color: '#22d3ee',
    bg: 'rgba(34, 211, 238, 0.08)',
    border: 'rgba(34, 211, 238, 0.18)',
    icon: '↓',
    category: 'buy',
  },
  rsi_overbought: {
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.06)',
    border: 'rgba(249, 115, 22, 0.15)',
    icon: '↑',
    category: 'sell',
  },
  notes_long: {
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.10)',
    border: 'rgba(16, 185, 129, 0.25)',
    icon: '🎙',
    category: 'buy',
  },
  notes_short: {
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.10)',
    border: 'rgba(239, 68, 68, 0.25)',
    icon: '🎙',
    category: 'sell',
  },
  notes_watch: {
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.10)',
    border: 'rgba(167, 139, 250, 0.25)',
    icon: '🎙',
    category: 'bullish',
  },
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'buy', label: 'Buy' },
  { key: 'sell', label: 'Sell' },
  { key: 'compression', label: 'Compression' },
  { key: 'bullish', label: 'Bullish' },
  { key: 'bearish', label: 'Bearish' },
  { key: 'caution', label: 'Caution' },
  { key: 'momentum', label: 'Momentum' },
];

function SetupTag({ setup }) {
  const config = SETUP_CONFIG[setup.type];
  if (!config) return null;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      padding: '2px 7px',
      borderRadius: Theme.radius.xs,
      fontSize: '9px',
      fontWeight: 700,
      color: config.color,
      background: config.bg,
      border: `1px solid ${config.border}`,
      letterSpacing: '0.03em',
      lineHeight: '16px',
      whiteSpace: 'nowrap',
      textTransform: 'uppercase',
    }}>
      {config.icon} {setup.label}
    </span>
  );
}

const PATTERN_BADGE_COLORS = {
  'Inside Day': { color: '#6c8aff', bg: 'rgba(108, 138, 255, 0.12)' },
  'VDU': { color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)' },
  'Tight Coil': { color: '#22d3ee', bg: 'rgba(34, 211, 238, 0.12)' },
  'Bounce SMA': { color: '#f5a623', bg: 'rgba(245, 166, 35, 0.12)' },
  'Bull Flag': { color: '#00d68f', bg: 'rgba(0, 214, 143, 0.12)' },
  'Vol Surge': { color: '#ff9f43', bg: 'rgba(255, 159, 67, 0.12)' },
};

function PatternBadge({ name }) {
  const colors = PATTERN_BADGE_COLORS[name];
  if (!colors) return null;
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 6px',
      borderRadius: Theme.radius.full,
      fontSize: '8px',
      fontWeight: 700,
      color: colors.color,
      background: colors.bg,
      letterSpacing: '0.03em',
      lineHeight: '14px',
      whiteSpace: 'nowrap',
    }}>
      {name}
    </span>
  );
}

function SetupCard({ stock, onTickerClick }) {
  const narrative = SECTOR_NARRATIVES[stock.sector] || '';

  return (
    <div
      onClick={() => onTickerClick(stock.ticker)}
      className="card"
      style={{
        padding: '14px 16px',
        cursor: 'pointer',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <span style={{
            fontSize: '15px',
            fontWeight: 800,
            color: Theme.colors.primaryText,
            letterSpacing: '0.04em',
            fontFamily: 'var(--font-mono)',
          }}>
            {stock.ticker}
          </span>
          {stock.hasNoteSetup && (
            <span style={{
              fontSize: '8px',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: Theme.radius.xs,
              background: 'rgba(167, 139, 250, 0.12)',
              border: `1px solid rgba(167, 139, 250, 0.25)`,
              color: '#a78bfa',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              MY NOTES
            </span>
          )}
          {stock.isConnorPick && (
            <span style={{
              fontSize: '8px',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: Theme.radius.xs,
              background: 'rgba(108, 138, 255, 0.10)',
              border: `1px solid rgba(108, 138, 255, 0.20)`,
              color: Theme.colors.accentBlue,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              CB
            </span>
          )}
          <span className="tabular-nums" style={{
            fontSize: '13px',
            fontWeight: 600,
            color: Theme.colors.secondaryText,
          }}>
            {stock.price != null ? `$${stock.price.toFixed(2)}` : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {stock.setups.map((s, i) => <SetupTag key={i} setup={s} />)}
        </div>
      </div>

      {/* Sector + earnings */}
      <div className="flex items-center gap-2" style={{ fontSize: '11px', color: Theme.colors.tertiaryText, marginBottom: '8px' }}>
        <span>
          <span style={{ fontWeight: 600, color: Theme.colors.accentPurple }}>{stock.sector}</span>
          {narrative && <span> — {narrative}</span>}
        </span>
        {stock.earningsDate && (
          <span style={{
            marginLeft: 'auto',
            fontSize: '9px',
            fontWeight: 700,
            padding: '1px 7px',
            borderRadius: Theme.radius.xs,
            background: Theme.colors.accentAmberDim,
            color: Theme.colors.accentAmber,
            letterSpacing: '0.03em',
            flexShrink: 0,
          }}>
            ER: {stock.earningsDate}
          </span>
        )}
      </div>

      {/* Pattern badges */}
      {stock.patterns && stock.patterns.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
          {stock.patterns.map((p, i) => <PatternBadge key={i} name={p} />)}
        </div>
      )}

      {/* Descriptions */}
      {stock.setups.map((s, i) => (
        <div key={i} style={{
          fontSize: '11px',
          color: Theme.colors.secondaryText,
          lineHeight: 1.5,
          marginTop: i > 0 ? '2px' : 0,
        }}>
          {s.description}
        </div>
      ))}

      {/* AI scoring row */}
      {(stock.aiScore || stock.aiEntry || stock.aiNote) && (
        <div style={{
          marginTop: '10px',
          padding: '8px 10px',
          borderRadius: '6px',
          background: 'rgba(108, 138, 255, 0.05)',
          border: '1px solid rgba(108, 138, 255, 0.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: stock.aiNote ? '5px' : 0 }}>
            {stock.aiScore && (
              <span style={{
                fontSize: '9px', fontWeight: 800, fontFamily: 'var(--font-mono)',
                color: stock.aiScore >= 8 ? '#00d68f' : stock.aiScore >= 6 ? '#6c8aff' : '#f97316',
                background: stock.aiScore >= 8 ? 'rgba(0,214,143,0.10)' : stock.aiScore >= 6 ? 'rgba(108,138,255,0.10)' : 'rgba(249,115,22,0.10)',
                padding: '2px 6px', borderRadius: '4px',
              }}>
                AI {stock.aiScore}/10
              </span>
            )}
            {stock.aiEntry && (
              <span style={{ fontSize: '9px', color: Theme.colors.secondaryText, fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: '#00d68f' }}>E</span> ${stock.aiEntry}
                <span style={{ color: Theme.colors.tertiaryText, margin: '0 3px' }}>·</span>
                <span style={{ color: '#ef4444' }}>S</span> ${stock.aiStop}
                <span style={{ color: Theme.colors.tertiaryText, margin: '0 3px' }}>·</span>
                <span style={{ color: '#6c8aff' }}>T</span> ${stock.aiTarget}
                {stock.aiRR && (
                  <span style={{ color: Theme.colors.tertiaryText, marginLeft: '6px' }}>R/R {stock.aiRR}x</span>
                )}
              </span>
            )}
          </div>
          {stock.aiNote && (
            <div style={{ fontSize: '10px', color: Theme.colors.secondaryText, lineHeight: 1.4, fontStyle: 'italic' }}>
              {stock.aiNote}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div className="skeleton" style={{ width: '80px', height: '16px' }} />
        <div className="skeleton" style={{ width: '90px', height: '20px', borderRadius: Theme.radius.sm }} />
      </div>
      <div className="skeleton" style={{ width: '200px', height: '11px', marginBottom: '8px' }} />
      <div className="skeleton" style={{ width: '100%', height: '11px' }} />
    </div>
  );
}

export function TodaysSetupsSection({ data, loading, error, onTickerClick }) {
  const [filter, setFilter] = useState('buy');

  const { counts, filtered } = useMemo(() => {
    const results = data?.results || [];
    const c = { all: results.length, buy: 0, sell: 0, compression: 0, bullish: 0, bearish: 0, caution: 0, momentum: 0 };
    for (const r of results) {
      const cats = new Set();
      for (const s of r.setups) {
        const cfg = SETUP_CONFIG[s.type];
        if (cfg) cats.add(cfg.category);
      }
      for (const cat of cats) {
        if (c[cat] !== undefined) c[cat]++;
      }
    }

    const f = filter === 'all'
      ? results
      : results.filter(r => r.setups.some(s => SETUP_CONFIG[s.type]?.category === filter));

    return { counts: c, filtered: f };
  }, [data, filter]);

  if (error) {
    return (
      <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
        <span style={{ fontSize: '12px', color: Theme.colors.bearishRed }}>
          Failed to load setups: {error}
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      {data && (
        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: Theme.colors.tertiaryText }}>
            {data.scanned} scanned · {data.flagged} flagged{data.noteSetups > 0 ? ` · ${data.noteSetups} from notes` : ''}{data.earningsFiltered > 0 ? ` · ${data.earningsFiltered} hidden (earnings)` : ''}{data.errors > 0 ? ` · ${data.errors} errors` : ''}
          </span>
          {data.scannedAt && (
            <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText, flexShrink: 0 }}>
              Updated {new Date(data.scannedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })} ET
            </span>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          const count = counts[f.key] || 0;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '4px 10px',
                borderRadius: Theme.radius.sm,
                fontSize: '10px',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                border: `1px solid ${active ? Theme.colors.accentBlueBorder : Theme.colors.cardBorder}`,
                background: active ? Theme.colors.accentBlueDim : 'transparent',
                color: active ? Theme.colors.accentBlue : Theme.colors.secondaryText,
                transition: 'all 0.15s ease',
                letterSpacing: '0.02em',
              }}
            >
              {f.label} {!loading && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <div style={{ textAlign: 'center', padding: '8px' }}>
              <span style={{ fontSize: '11px', color: Theme.colors.tertiaryText }}>
                Scanning watchlist... this may take 1-2 minutes
              </span>
            </div>
          </>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', color: Theme.colors.secondaryText }}>
              {filter !== 'all'
                ? `No ${filter} setups detected — try a different filter`
                : 'No setups detected — watchlist stocks are in consolidation or no clear signals today'}
            </span>
          </div>
        ) : (
          filtered.map(stock => (
            <SetupCard
              key={stock.ticker}
              stock={stock}
              onTickerClick={onTickerClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
