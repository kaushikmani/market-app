import React, { useEffect, useState } from 'react';

const API = '/api/journal';

function fmtMoney(n) {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return Math.round(n).toLocaleString();
}

export function TradeLogHero() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(`${API}/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (alive) setStats(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const s = stats?.summary || {};
  const totalPnl = s.totalPnl ?? null;
  const wins = s.wins ?? 0;
  const losses = s.losses ?? 0;
  const winRate = s.winRate ?? null;
  const profitFactor = s.profitFactor ?? null;
  const largestWin = s.largestWin ?? null;
  const largestLoss = s.largestLoss ?? null;
  const up = (totalPnl ?? 0) >= 0;

  return (
    <div style={{ paddingTop: 28 }}>
      <div className="label-tape">Realized · all-time</div>
      <h1 className="serif" style={{
        fontSize: 40, lineHeight: 1.05, marginTop: 8, fontWeight: 400, letterSpacing: '-0.01em',
        color: 'var(--text-primary)',
        display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 12,
      }}>
        <span>Net</span>
        <span style={{ fontStyle: 'italic', color: up ? 'var(--green)' : 'var(--red)' }}>
          {totalPnl != null ? `${up ? '+' : '-'}$${fmtMoney(Math.abs(totalPnl))}` : '—'}
        </span>
        <span className="mono-tape" style={{
          fontSize: 18, color: 'var(--text-tertiary)', fontStyle: 'normal', letterSpacing: '0.02em',
        }}>
          · {wins}W {losses}L
        </span>
      </h1>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
        border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden',
        marginTop: 20, background: 'var(--bg-card)',
      }}>
        {[
          { l: 'Win rate', v: winRate != null ? `${winRate.toFixed(0)}%` : '—', c: (winRate ?? 0) >= 50 ? 'var(--green)' : 'var(--red)' },
          { l: 'Profit factor', v: profitFactor != null ? Number(profitFactor).toFixed(2) : '—', c: (profitFactor ?? 0) >= 1 ? 'var(--green)' : 'var(--red)' },
          { l: 'Best', v: largestWin != null ? `+$${fmtMoney(largestWin)}` : '—', c: 'var(--green)' },
          { l: 'Worst', v: largestLoss != null ? `-$${fmtMoney(Math.abs(largestLoss))}` : '—', c: 'var(--red)' },
        ].map((m, i) => (
          <div key={i} style={{ padding: '16px 20px', borderRight: i < 3 ? '1px solid var(--border-default)' : 0 }}>
            <div className="label-tape">{m.l}</div>
            <div className="mono-tape" style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.03em', marginTop: 6, color: m.c }}>
              {m.v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
