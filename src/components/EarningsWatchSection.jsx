import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiService } from '../services/ApiService';

const TIME_LABEL = { BMO: 'Pre', AMC: 'Post', TNS: 'TBD' };

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T12:00:00').setHours(0, 0, 0, 0);
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}

function proximityColor(days) {
  if (days == null) return 'var(--text-tertiary)';
  if (days <= 2) return 'var(--tape-acc)';       // imminent
  if (days <= 7) return 'var(--text-primary)';   // this week
  if (days <= 30) return 'var(--text-secondary)';
  return 'var(--text-tertiary)';
}

function daysLabel(days) {
  if (days == null) return '';
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days}d`;
}

export function EarningsWatchSection({ onTickerClick }) {
  const [alertTickers, setAlertTickers] = useState(null);
  const [lookahead, setLookahead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const alerts = await ApiService.getAlerts();
      const tickers = [...new Set(
        (alerts?.alerts || []).filter(a => a.enabled).map(a => a.ticker)
      )];
      setAlertTickers(tickers);
      if (tickers.length === 0) {
        setLookahead({ data: {}, missing: [] });
      } else {
        const resp = await ApiService.getEarningsLookahead(tickers, 8);
        setLookahead(resp);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { refresh(true); }, [refresh]);

  const rows = useMemo(() => {
    if (!lookahead?.data) return [];
    return Object.entries(lookahead.data)
      .map(([ticker, v]) => ({ ticker, ...v, days: daysUntil(v.date) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [lookahead]);

  const imminent = rows.filter(r => r.days != null && r.days <= 7).length;
  const missingCount = lookahead?.missing?.length ?? 0;
  const alertCount = alertTickers?.length ?? 0;

  if (loading && rows.length === 0) {
    return (
      <div style={{ marginTop: 24 }}>
        <div className="kicker">
          <span className="num">·</span>
          <h2 className="title">Earnings watch</h2>
          <span style={{
            marginLeft: 'auto', fontFamily: 'var(--font-geist-mono)',
            fontSize: 10.5, color: 'var(--text-tertiary)',
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            loading…
          </span>
        </div>
      </div>
    );
  }

  if (alertCount === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div className="kicker">
        <span className="num">·</span>
        <h2 className="title">Earnings watch</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontFamily: 'var(--font-geist-mono)', fontSize: 10.5,
            color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            {rows.length} scheduled · {imminent} this week{missingCount > 0 ? ` · ${missingCount} beyond 8w` : ''}
          </span>
          <button
            onClick={() => refresh(false)}
            disabled={refreshing}
            title="Refresh earnings lookahead"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', fontSize: 11, fontWeight: 500,
              border: '1px solid var(--border-default)', borderRadius: 6,
              background: 'var(--bg-card)', color: 'var(--text-secondary)',
              cursor: refreshing ? 'default' : 'pointer',
              opacity: refreshing ? 0.5 : 1,
              fontFamily: 'inherit',
            }}
          >
            <span style={{
              display: 'inline-block',
              animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
            }}>↻</span>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 8,
          background: 'var(--red-dim)', border: '1px solid var(--red-border)',
          color: 'var(--red)', fontSize: 12,
        }}>
          {error}
        </div>
      )}

      {rows.length === 0 && !error ? (
        <div style={{
          padding: 16, border: '1px solid var(--border-default)', borderRadius: 12,
          background: 'var(--bg-card)', fontSize: 12, color: 'var(--text-tertiary)',
        }}>
          No earnings scheduled in the next 8 weeks for your alert tickers.
        </div>
      ) : (
        <div style={{
          border: '1px solid var(--border-default)', borderRadius: 12,
          overflow: 'hidden', background: 'var(--bg-card)',
        }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '70px 140px 110px 70px 90px 1fr',
            gap: 12, padding: '8px 16px',
            background: 'var(--bg-input)',
            borderBottom: '1px solid var(--border-default)',
          }}>
            <span className="label-tape">Ticker</span>
            <span className="label-tape">Date</span>
            <span className="label-tape">When</span>
            <span className="label-tape">Time</span>
            <span className="label-tape" style={{ textAlign: 'right' }}>EPS est</span>
            <span className="label-tape">Company</span>
          </div>
          {rows.map((r, i) => {
            const imminent = r.days != null && r.days <= 2;
            const color = proximityColor(r.days);
            return (
              <div
                key={r.ticker}
                onClick={() => onTickerClick?.(r.ticker)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 140px 110px 70px 90px 1fr',
                  gap: 12, padding: '10px 16px',
                  borderBottom: i < rows.length - 1 ? '1px solid var(--border-subtle)' : 0,
                  cursor: 'pointer', alignItems: 'center',
                  background: imminent ? 'var(--tape-acc-dim)' : 'transparent',
                  transition: 'background 0.15s var(--tape-e)',
                }}
                onMouseEnter={e => {
                  if (!imminent) e.currentTarget.style.background = 'var(--bg-card-hover)';
                }}
                onMouseLeave={e => {
                  if (!imminent) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span className="mono-tape" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {r.ticker}
                </span>
                <span className="mono-tape" style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                  {formatDate(r.date)}
                </span>
                <span className="mono-tape" style={{ fontSize: 12, color, fontWeight: imminent ? 700 : 500 }}>
                  {daysLabel(r.days)}
                </span>
                <span className="mono-tape" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {TIME_LABEL[r.time] || r.time}
                </span>
                <span className="mono-tape" style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right' }}>
                  {r.epsEstimate != null ? `$${Number(r.epsEstimate).toFixed(2)}` : '—'}
                </span>
                <span style={{
                  fontSize: 11, color: 'var(--text-tertiary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {r.company}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
