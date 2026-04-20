import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiService } from '../services/ApiService';

const REFRESH_INTERVAL_MS = 60_000; // auto-refresh every 60s

function distanceColor(absPct, threshold) {
  if (absPct == null) return 'var(--text-tertiary)';
  if (absPct <= threshold) return 'var(--tape-acc)';        // in trigger zone
  if (absPct <= threshold * 2) return 'var(--text-primary)'; // close
  return 'var(--text-tertiary)';                              // far
}

function formatAge(ts) {
  if (!ts) return '';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export function AlertWatchSection({ onTickerClick }) {
  const [alerts, setAlerts] = useState(null);
  const [smas, setSmas] = useState({}); // { TICKER: { price (daily close), smas: {8: x, 50: y} } }
  const [quotes, setQuotes] = useState({}); // { TICKER: { price (live), changePct } }
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const [, forceRender] = useState(0); // tick the "Xs ago" label
  const aliveRef = useRef(true);

  const refresh = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true); else setRefreshing(true);
    try {
      const d = await ApiService.getAlerts();
      if (!aliveRef.current) return;
      const list = (d?.alerts || []).filter(a => a.enabled);
      setAlerts(list);

      const tickers = [...new Set(list.map(a => a.ticker))];
      if (tickers.length > 0) {
        // Live quotes (Schwab) + daily SMAs (Yahoo, cached 60s) in parallel
        const [smaResp, quoteResp] = await Promise.all([
          ApiService.getSMAsBatch(tickers).catch(() => null),
          ApiService.getQuotes(tickers).catch(() => null),
        ]);
        if (!aliveRef.current) return;

        const smaData = smaResp?.data || {};
        setSmas(prev => {
          const next = { ...prev };
          for (const [t, r] of Object.entries(smaData)) {
            if (r && !r.error) next[t] = r;
          }
          return next;
        });

        const quoteData = quoteResp?.quotes || {};
        setQuotes(prev => {
          const next = { ...prev };
          for (const [t, q] of Object.entries(quoteData)) {
            if (q && typeof q.price === 'number') next[t] = q;
          }
          return next;
        });
      }
      setLastFetched(Date.now());
    } finally {
      if (aliveRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    refresh(true);
    const interval = setInterval(() => refresh(false), REFRESH_INTERVAL_MS);
    return () => {
      aliveRef.current = false;
      clearInterval(interval);
    };
  }, [refresh]);

  // Tick the "Xs ago" label every 10s so it stays fresh
  useEffect(() => {
    const t = setInterval(() => forceRender(n => n + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  const rows = useMemo(() => {
    if (!alerts) return [];
    return alerts.map(a => {
      const smaData = smas[a.ticker];
      const liveQuote = quotes[a.ticker];
      // Prefer Schwab live price, fall back to Yahoo daily close
      const price = liveQuote?.price ?? smaData?.price ?? null;
      const isLive = liveQuote?.price != null;
      const smaObj = smaData?.smas?.[a.period];
      const smaValue = typeof smaObj === 'object' ? smaObj.value : smaObj;
      const distancePct = (price != null && smaValue != null)
        ? ((price - smaValue) / smaValue) * 100
        : null;
      return {
        ...a,
        price,
        isLive,
        smaValue,
        distancePct,
        absDistance: distancePct != null ? Math.abs(distancePct) : null,
      };
    }).sort((x, y) => {
      if (x.absDistance == null) return 1;
      if (y.absDistance == null) return -1;
      return x.absDistance - y.absDistance;
    });
  }, [alerts, smas, quotes]);

  if (loading && rows.length === 0) {
    return (
      <div style={{ marginTop: 24 }}>
        <div className="kicker">
          <span className="num">·</span>
          <h2 className="title">Alert watch</h2>
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

  if (rows.length === 0) {
    return null;
  }

  const inZone = rows.filter(r => r.absDistance != null && r.absDistance <= r.threshold).length;

  return (
    <div style={{ marginTop: 24 }}>
      <div className="kicker">
        <span className="num">·</span>
        <h2 className="title">Alert watch</h2>
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: 10.5, color: 'var(--text-tertiary)',
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            {rows.length} watching · {inZone} in zone
          </span>
          <span style={{
            fontFamily: 'var(--font-geist-mono)', fontSize: 10,
            color: 'var(--text-tertiary)',
          }}>
            {refreshing ? 'refreshing…' : `updated ${formatAge(lastFetched)}`}
          </span>
          <button
            onClick={() => refresh(false)}
            disabled={refreshing}
            title="Refresh prices + SMAs"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', fontSize: 11, fontWeight: 500,
              border: '1px solid var(--border-default)', borderRadius: 6,
              background: 'var(--bg-card)', color: 'var(--text-secondary)',
              cursor: refreshing ? 'default' : 'pointer',
              opacity: refreshing ? 0.5 : 1,
              transition: 'border-color 0.15s var(--tape-e), color 0.15s var(--tape-e)',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              if (!refreshing) {
                e.currentTarget.style.borderColor = 'var(--tape-acc-line)';
                e.currentTarget.style.color = 'var(--tape-acc)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.color = 'var(--text-secondary)';
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

      <div style={{
        border: '1px solid var(--border-default)',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--bg-card)',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '70px 80px 90px 90px 110px 1fr',
          gap: 12,
          padding: '8px 16px',
          background: 'var(--bg-input)',
          borderBottom: '1px solid var(--border-default)',
        }}>
          <span className="label-tape">Ticker</span>
          <span className="label-tape">Cond</span>
          <span className="label-tape" style={{ textAlign: 'right' }}>Price</span>
          <span className="label-tape" style={{ textAlign: 'right' }}>SMA</span>
          <span className="label-tape" style={{ textAlign: 'right' }}>From SMA</span>
          <span className="label-tape">Trigger</span>
        </div>

        {/* Rows */}
        {rows.map((r, i) => {
          const color = distanceColor(r.absDistance, r.threshold);
          const inZ = r.absDistance != null && r.absDistance <= r.threshold;
          return (
            <div
              key={r.id}
              onClick={() => onTickerClick?.(r.ticker)}
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 80px 90px 90px 110px 1fr',
                gap: 12,
                padding: '10px 16px',
                borderBottom: i < rows.length - 1 ? '1px solid var(--border-subtle)' : 0,
                cursor: 'pointer',
                alignItems: 'center',
                transition: 'background 0.15s var(--tape-e)',
                background: inZ ? 'var(--tape-acc-dim)' : 'transparent',
              }}
              onMouseEnter={e => {
                if (!inZ) e.currentTarget.style.background = 'var(--bg-card-hover)';
              }}
              onMouseLeave={e => {
                if (!inZ) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span className="mono-tape" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {r.ticker}
              </span>
              <span className="mono-tape" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {r.period}MA
              </span>
              <span className="mono-tape" style={{
                fontSize: 12, textAlign: 'right', color: 'var(--text-primary)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5,
              }}>
                {r.isLive && (
                  <span className="tape-dot up tape-pulse" style={{ width: 4, height: 4 }} title="Live quote" />
                )}
                {r.price != null ? r.price.toFixed(2) : '—'}
              </span>
              <span className="mono-tape" style={{ fontSize: 12, textAlign: 'right', color: 'var(--text-secondary)' }}>
                {r.smaValue != null ? r.smaValue.toFixed(2) : '—'}
              </span>
              <span className="mono-tape" style={{
                fontSize: 12, textAlign: 'right', color, fontWeight: inZ ? 700 : 500,
              }}>
                {r.distancePct != null
                  ? `${r.distancePct >= 0 ? '+' : ''}${r.distancePct.toFixed(2)}%`
                  : '—'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {inZ ? (
                  <span style={{ color: 'var(--tape-acc)', fontWeight: 600 }}>● in zone</span>
                ) : (
                  <>±{r.threshold}% of {r.period} SMA</>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
