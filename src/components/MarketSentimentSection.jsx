import React, { useState, useEffect } from 'react';
import { Theme } from '../models/Theme';
import { ApiService } from '../services/ApiService';

const RATING_CONFIG = {
  'Extreme Fear': { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', pct: 10 },
  'Fear':         { color: '#f97316', bg: 'rgba(249,115,22,0.12)', pct: 30 },
  'Neutral':      { color: '#eab308', bg: 'rgba(234,179,8,0.12)',  pct: 50 },
  'Greed':        { color: '#84cc16', bg: 'rgba(132,204,22,0.12)', pct: 70 },
  'Extreme Greed':{ color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  pct: 90 },
};

function getRatingConfig(rating) {
  return RATING_CONFIG[rating] || { color: '#888', bg: 'rgba(255,255,255,0.05)', pct: 50 };
}

function scoreToPct(score) {
  return Math.max(2, Math.min(98, score));
}

function scoreToRating(score) {
  if (score >= 75) return 'Extreme Greed';
  if (score >= 55) return 'Greed';
  if (score >= 45) return 'Neutral';
  if (score >= 25) return 'Fear';
  return 'Extreme Fear';
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
const Sparkline = ({ history, color }) => {
  if (!history?.length) return null;
  const W = 100, H = 28;
  const vals = history.map(h => h.y);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg width={W} height={H} style={{ overflow: 'visible', display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
};

// ── Fear & Greed Gauge ────────────────────────────────────────────────────────
const FearGreedGauge = ({ score, rating, history }) => {
  const cfg = getRatingConfig(rating);
  const pct = scoreToPct(score);

  return (
    <div style={{ marginBottom: '14px' }}>
      <div className="flex items-end gap-3" style={{ marginBottom: '10px' }}>
        {/* Big score */}
        <span style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1, color: cfg.color, fontFamily: 'var(--font-mono)' }}>
          {Math.round(score)}
        </span>
        <div className="flex flex-col" style={{ marginBottom: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: cfg.color }}>{rating}</span>
          <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>Fear & Greed Index</span>
        </div>
        {/* Sparkline — 30 day trend */}
        {history?.length > 1 && (
          <div style={{ marginLeft: 'auto', marginBottom: '4px' }}>
            <div style={{ fontSize: '8px', color: Theme.colors.tertiaryText, marginBottom: '2px', textAlign: 'right' }}>30d</div>
            <Sparkline history={history} color={cfg.color} />
          </div>
        )}
      </div>

      {/* Gradient bar */}
      <div style={{ position: 'relative', marginBottom: '6px' }}>
        <div style={{
          height: '8px', borderRadius: '4px',
          background: 'linear-gradient(to right, #ef4444 0%, #f97316 25%, #eab308 50%, #84cc16 75%, #22c55e 100%)',
        }} />
        <div style={{
          position: 'absolute', top: '-3px',
          left: `calc(${pct}% - 7px)`,
          width: '14px', height: '14px', borderRadius: '50%',
          background: cfg.color, border: '2px solid #fff',
          boxShadow: `0 0 6px ${cfg.color}80`,
          transition: 'left 0.5s ease',
        }} />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between">
        {['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'].map(label => (
          <span key={label} style={{
            fontSize: '8px',
            fontWeight: label === rating ? 700 : 400,
            color: label === rating ? cfg.color : Theme.colors.tertiaryText,
          }}>
            {label.split(' ').pop()}
          </span>
        ))}
      </div>
    </div>
  );
};

// ── Previous periods ──────────────────────────────────────────────────────────
const PrevPeriods = ({ prev }) => {
  const periods = [
    { label: '1D ago', value: prev.prevClose },
    { label: '1W ago', value: prev.prev1Week },
    { label: '1M ago', value: prev.prev1Month },
    { label: '1Y ago', value: prev.prev1Year },
  ];
  const visible = periods.filter(p => p.value);
  if (!visible.length) return null;

  return (
    <div className="flex gap-2" style={{ marginBottom: '12px' }}>
      {visible.map(({ label, value }) => {
        const r = scoreToRating(value);
        const cfg = getRatingConfig(r);
        return (
          <div key={label} style={{
            flex: 1, textAlign: 'center', padding: '6px 4px',
            borderRadius: '6px', background: Theme.colors.cardBackground,
            border: `1px solid ${Theme.colors.cardBorder}`,
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: cfg.color, fontFamily: 'var(--font-mono)' }}>
              {Math.round(value)}
            </div>
            <div style={{ fontSize: '9px', color: Theme.colors.tertiaryText, marginTop: '1px' }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
};

// ── VIX Term Structure ────────────────────────────────────────────────────────
const VixTermCard = ({ vixTerm }) => {
  if (!vixTerm) return null;
  const isInverted = vixTerm.structure === 'inverted';
  const color = isInverted ? '#f97316' : '#22c55e';
  const label = isInverted ? 'Inverted' : 'Contango';
  const hint  = isInverted ? 'Acute fear — watch for reversal' : 'Normal — market calm';

  return (
    <div style={{
      padding: '8px 10px', borderRadius: '8px',
      background: Theme.colors.cardBackground,
      border: `1px solid ${Theme.colors.cardBorder}`,
    }}>
      <div style={{ fontSize: '9px', fontWeight: 600, color: Theme.colors.tertiaryText, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
        VIX Term Structure
      </div>
      <div className="flex items-baseline gap-2" style={{ marginBottom: '4px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: Theme.colors.primaryText, fontFamily: 'var(--font-mono)' }}>
          VIX {vixTerm.vix}
        </span>
        <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>vs</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: Theme.colors.secondaryText, fontFamily: 'var(--font-mono)' }}>
          3M {vixTerm.vix3m}
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: '9px', fontWeight: 700,
          color, background: `${color}18`,
          padding: '1px 6px', borderRadius: '4px',
        }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: '9px', color: Theme.colors.tertiaryText }}>
        Spread {vixTerm.spread > 0 ? '+' : ''}{vixTerm.spread} · {hint}
      </div>
    </div>
  );
};

// ── Breadth Indicators ────────────────────────────────────────────────────────
const BreadthBar = ({ label, value, good }) => {
  if (value == null) return null;
  const color = value >= good ? '#22c55e' : value >= good * 0.6 ? '#eab308' : '#ef4444';
  return (
    <div style={{ marginBottom: '6px' }}>
      <div className="flex justify-between" style={{ marginBottom: '3px' }}>
        <span style={{ fontSize: '9px', color: Theme.colors.secondaryText }}>{label}</span>
        <span style={{ fontSize: '9px', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}%</span>
      </div>
      <div style={{ height: '3px', borderRadius: '2px', background: Theme.colors.cardBorder }}>
        <div style={{ height: '100%', width: `${value}%`, borderRadius: '2px', background: color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
};

const BreadthCard = ({ breadth }) => {
  if (!breadth) return null;

  return (
    <div style={{
      padding: '8px 10px', borderRadius: '8px',
      background: Theme.colors.cardBackground,
      border: `1px solid ${Theme.colors.cardBorder}`,
    }}>
      <div style={{ fontSize: '9px', fontWeight: 600, color: Theme.colors.tertiaryText, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
        Watchlist Breadth <span style={{ fontWeight: 400 }}>({breadth.sampleSize} stocks)</span>
      </div>
      <BreadthBar label="Above 200-day MA" value={breadth.above200d} good={50} />
      <BreadthBar label="Above 50-day MA"  value={breadth.above50d}  good={50} />
      <BreadthBar label="RSI above 50"     value={breadth.rsiAbove50} good={50} />
    </div>
  );
};

// ── Component row ─────────────────────────────────────────────────────────────
const ComponentRow = ({ label, score, rating }) => {
  if (score == null) return null;
  const cfg = getRatingConfig(rating);
  return (
    <div style={{ marginBottom: '8px' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '3px' }}>
        <span style={{ fontSize: '10px', color: Theme.colors.secondaryText, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '10px', fontWeight: 700, color: cfg.color }}>{rating}</span>
      </div>
      <div style={{ height: '3px', borderRadius: '2px', background: Theme.colors.cardBorder }}>
        <div style={{ height: '100%', width: `${Math.max(4, Math.min(100, score))}%`, borderRadius: '2px', background: cfg.color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const MarketSentimentSection = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    ApiService.getMarketSentiment()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ padding: '20px' }}>
        <div className="skeleton" style={{ width: '120px', height: '48px', marginBottom: '12px' }} />
        <div className="skeleton" style={{ width: '100%', height: '8px', borderRadius: '4px', marginBottom: '12px' }} />
        <div className="flex gap-2" style={{ marginBottom: '12px' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ flex: 1, height: '44px', borderRadius: '6px' }} />)}
        </div>
        <div className="flex gap-2">
          {[1,2].map(i => <div key={i} className="skeleton" style={{ flex: 1, height: '72px', borderRadius: '8px' }} />)}
        </div>
      </div>
    );
  }

  if (error || !data?.fearGreed) {
    return (
      <div className="card flex items-center justify-center" style={{ height: '80px' }}>
        <span style={{ fontSize: '12px', color: Theme.colors.secondaryText }}>Sentiment unavailable</span>
      </div>
    );
  }

  const { fearGreed, components, vixTerm, breadth } = data;

  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      {/* Updated-at */}
      <div className="flex justify-end" style={{ marginBottom: '10px' }}>
        <span style={{ fontSize: '9px', color: Theme.colors.tertiaryText }}>{data.updatedAt}</span>
      </div>

      {/* Gauge + sparkline */}
      <FearGreedGauge score={fearGreed.score} rating={fearGreed.rating} history={fearGreed.history} />

      {/* Previous periods */}
      <PrevPeriods prev={fearGreed} />

      {/* VIX Term + Breadth side by side */}
      {(vixTerm || breadth) && (
        <div className="flex gap-2" style={{ marginBottom: '12px' }}>
          {vixTerm && <div style={{ flex: 1 }}><VixTermCard vixTerm={vixTerm} /></div>}
          {breadth  && <div style={{ flex: 1 }}><BreadthCard breadth={breadth} /></div>}
        </div>
      )}

      {/* Components toggle */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          fontSize: '10px', fontWeight: 600, color: Theme.colors.accentBlue,
          cursor: 'pointer', marginBottom: expanded ? '12px' : 0,
          display: 'flex', alignItems: 'center', gap: '4px',
        }}
      >
        <span style={{ transform: expanded ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>›</span>
        {expanded ? 'Hide' : 'Show'} components
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${Theme.colors.cardBorder}`, paddingTop: '12px' }}>
          <ComponentRow label="Market Momentum (S&P 500)" score={components.momentum?.score}      rating={components.momentum?.rating} />
          <ComponentRow label="Put/Call Options"           score={components.putCall?.score}       rating={components.putCall?.rating} />
          <ComponentRow label="Market Volatility (VIX)"   score={components.vix?.score}           rating={components.vix?.rating} />
          <ComponentRow label="Stock Price Strength"      score={components.priceStrength?.score} rating={components.priceStrength?.rating} />
          <ComponentRow label="Stock Price Breadth"       score={components.priceBreadth?.score}  rating={components.priceBreadth?.rating} />
          <ComponentRow label="Junk Bond Demand"          score={components.junkBond?.score}      rating={components.junkBond?.rating} />
          <ComponentRow label="Safe Haven Demand"         score={components.safeHaven?.score}     rating={components.safeHaven?.rating} />
        </div>
      )}
    </div>
  );
};
