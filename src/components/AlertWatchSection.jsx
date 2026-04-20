import React, { useEffect, useMemo, useState } from 'react';
import { ApiService } from '../services/ApiService';

function distanceColor(absPct, threshold) {
  if (absPct == null) return 'var(--text-tertiary)';
  if (absPct <= threshold) return 'var(--tape-acc)';        // in trigger zone
  if (absPct <= threshold * 2) return 'var(--text-primary)'; // close
  return 'var(--text-tertiary)';                              // far
}

export function AlertWatchSection({ onTickerClick }) {
  const [alerts, setAlerts] = useState(null);
  const [smas, setSmas] = useState({}); // { TICKER: { price, smas: {8: x, 50: y} } }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    ApiService.getAlerts()
      .then(d => {
        if (!alive) return;
        const list = (d?.alerts || []).filter(a => a.enabled);
        setAlerts(list);
        const tickers = [...new Set(list.map(a => a.ticker))];
        return Promise.all(tickers.map(t =>
          ApiService.getSMAs(t).then(r => [t, r]).catch(() => [t, null])
        ));
      })
      .then(rows => {
        if (!alive || !rows) return;
        const map = {};
        for (const [t, r] of rows) if (r) map[t] = r;
        setSmas(map);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const rows = useMemo(() => {
    if (!alerts) return [];
    return alerts.map(a => {
      const data = smas[a.ticker];
      const price = data?.price ?? null;
      const smaObj = data?.smas?.[a.period];
      const smaValue = typeof smaObj === 'object' ? smaObj.value : smaObj;
      const distancePct = (price != null && smaValue != null)
        ? ((price - smaValue) / smaValue) * 100
        : null;
      return {
        ...a,
        price,
        smaValue,
        distancePct,
        absDistance: distancePct != null ? Math.abs(distancePct) : null,
      };
    }).sort((x, y) => {
      // closest-to-trigger first; nulls last
      if (x.absDistance == null) return 1;
      if (y.absDistance == null) return -1;
      return x.absDistance - y.absDistance;
    });
  }, [alerts, smas]);

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
        <span style={{
          marginLeft: 'auto', fontFamily: 'var(--font-geist-mono)',
          fontSize: 10.5, color: 'var(--text-tertiary)',
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          {rows.length} watching · {inZone} in zone
        </span>
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
              <span className="mono-tape" style={{ fontSize: 12, textAlign: 'right', color: 'var(--text-primary)' }}>
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
