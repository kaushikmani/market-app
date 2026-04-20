import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/ApiService';

function ratingFromScore(score) {
  if (score == null) return 'Neutral';
  if (score >= 75) return 'Extreme Greed';
  if (score >= 55) return 'Greed';
  if (score >= 45) return 'Neutral';
  if (score >= 25) return 'Fear';
  return 'Extreme Fear';
}

function dayAbbr(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}

function dayNum(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T12:00:00').getDate();
}

function FearGreed({ data }) {
  const score = data?.score ?? null;
  const rating = data?.rating || ratingFromScore(score);
  const pct = score != null ? Math.max(2, Math.min(98, score)) : 50;

  return (
    <div style={{
      padding: 14,
      border: '1px solid var(--border-default)',
      borderRadius: 10,
      background: 'var(--bg-card)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span className="label-tape">Fear · Greed</span>
        <span className="mono-tape" style={{ fontSize: 11, color: 'var(--tape-acc)' }}>
          {(rating || 'NEUTRAL').toUpperCase()}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <div className="mono-tape" style={{ fontSize: 38, fontWeight: 500, letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
          {score != null ? Math.round(score) : '—'}
        </div>
        <div className="mono-tape" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>/ 100</div>
      </div>
      <div style={{ position: 'relative', height: 6, background: 'var(--bg-input)', borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, var(--red) 0%, var(--tape-acc) 50%, var(--green) 100%)',
          opacity: 0.7,
        }} />
        <div style={{
          position: 'absolute', left: `${pct}%`, top: -3,
          width: 2, height: 12, background: 'var(--text-primary)',
          transform: 'translateX(-1px)',
        }} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginTop: 6,
        fontSize: 9.5, fontFamily: 'var(--font-geist-mono)', color: 'var(--text-tertiary)', letterSpacing: '0.05em',
      }}>
        <span>FEAR</span><span>NEUTRAL</span><span>GREED</span>
      </div>
    </div>
  );
}

function EarningsThisWeek({ days, onPick }) {
  if (!days || days.length === 0) return null;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span className="label-tape">Earnings · this week</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {days.slice(0, 5).map((d, i) => {
          const tickers = (d.earnings || []).slice(0, 4).map(e => e.ticker);
          const overflow = Math.max(0, (d.earnings?.length || 0) - 4);
          return (
            <div key={d.date || i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 0',
              borderBottom: i < days.slice(0, 5).length - 1 ? '1px solid var(--border-subtle)' : 0,
            }}>
              <div style={{ width: 28, flexShrink: 0 }}>
                <div className="mono-tape" style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-primary)' }}>{dayAbbr(d.date)}</div>
                <div className="mono-tape" style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{dayNum(d.date)}</div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {tickers.map(t => (
                  <span
                    key={t}
                    onClick={() => onPick?.(t)}
                    className="mono-tape"
                    style={{
                      fontSize: 10, padding: '1px 5px',
                      border: '1px solid var(--border-default)', borderRadius: 4,
                      color: 'var(--text-secondary)', cursor: 'pointer',
                    }}
                  >
                    {t}
                  </span>
                ))}
                {overflow > 0 && (
                  <span className="mono-tape" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    +{overflow}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LiveAlerts({ alerts }) {
  const list = (alerts || []).slice(0, 4);
  return (
    <div>
      <div className="label-tape" style={{ marginBottom: 10 }}>
        Alerts · {list.length} live
      </div>
      {list.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', padding: '6px 0' }}>
          No active alerts
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((a, i) => {
            const text = a.message || `${a.ticker || ''}`.trim();
            const lc = (text || '').toLowerCase();
            const dotClass = lc.includes('above') || lc.includes('crossed') || lc.includes('+') ? 'up'
              : lc.includes('below') || lc.includes('-') ? 'down' : 'acc';
            const stamp = a.ts || a.triggeredAt;
            return (
              <div key={a.id || i} style={{
                display: 'flex', gap: 8, padding: '8px 10px',
                borderRadius: 8, background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
              }}>
                <span className={`tape-dot ${dotClass}`} style={{ marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 11, color: 'var(--text-primary)' }}>{text}</div>
                {stamp && (
                  <span className="mono-tape" style={{ fontSize: 10, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                    {timeAgo(stamp)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function timeAgo(stamp) {
  if (!stamp) return '';
  const ms = typeof stamp === 'number' ? stamp : new Date(stamp).getTime();
  if (Number.isNaN(ms)) return '';
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function RightRail({ onPick }) {
  const [sentiment, setSentiment] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    let mounted = true;
    ApiService.getMarketSentiment()
      .then(d => { if (mounted) setSentiment(d?.fearGreed || d); })
      .catch(() => {});
    ApiService.getEarningsCalendar()
      .then(d => { if (mounted) setEarnings(d?.thisWeek || []); })
      .catch(() => {});
    const loadAlerts = () =>
      ApiService.getTriggeredAlerts()
        .then(d => {
          if (!mounted) return;
          const list = Array.isArray(d) ? d : (d?.triggers || d?.alerts || []);
          setAlerts(list);
        })
        .catch(() => {});

    loadAlerts();
    const t = setInterval(loadAlerts, 60000);

    return () => { mounted = false; clearInterval(t); };
  }, []);

  return (
    <aside style={{
      width: 280,
      flexShrink: 0,
      borderLeft: '1px solid var(--border-default)',
      background: 'var(--bg-input)',
      padding: '20px 18px',
      position: 'sticky',
      top: 56,
      height: 'calc(100vh - 56px)',
      overflowY: 'auto',
    }}>
      <div className="label-tape" style={{ marginBottom: 12 }}>Session brief</div>
      <div className="serif" style={{
        fontStyle: 'italic',
        fontSize: 17,
        lineHeight: 1.35,
        letterSpacing: '-0.01em',
        color: 'var(--text-primary)',
        marginBottom: 20,
      }}>
        "Trade the tape, not the narrative.
        <span style={{ color: 'var(--text-secondary)' }}> Levels respect price, price respects no one."</span>
      </div>

      <FearGreed data={sentiment} />

      <div style={{ marginTop: 18 }}>
        <EarningsThisWeek days={earnings} onPick={onPick} />
      </div>

      <div style={{ marginTop: 18 }}>
        <LiveAlerts alerts={alerts} />
      </div>
    </aside>
  );
}
