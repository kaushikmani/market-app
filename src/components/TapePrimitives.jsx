import React, { useId } from 'react';

export function Sparkline({ data, color = 'var(--text-secondary)', w = 80, h = 24, fill = true }) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / rng) * h;
    return [x, y];
  });
  const path = 'M ' + pts.map(p => p.join(',')).join(' L ');
  const areaPath = `${path} L ${w},${h} L 0,${h} Z`;
  const id = useId();

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '100%' }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${id})`} />
        </>
      )}
      <path d={path} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Kicker({ num, title, meta }) {
  return (
    <div className="kicker">
      {num && <span className="num">{num}</span>}
      <h2 className="title">{title}</h2>
      {meta && (
        <span style={{
          marginLeft: 'auto',
          fontFamily: 'var(--font-geist-mono)',
          fontSize: 10.5,
          color: 'var(--text-tertiary)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          {meta}
        </span>
      )}
    </div>
  );
}
