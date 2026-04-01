import React, { useState, useEffect, useCallback } from 'react';
import { Theme } from '../models/Theme';

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{
      flex: 1,
      background: Theme.colors.cardBackground,
      border: `1px solid ${Theme.colors.cardBorder}`,
      borderRadius: Theme.radius.sm,
      padding: '10px 12px',
    }}>
      <div style={{ fontSize: '9px', fontWeight: 700, color: Theme.colors.tertiaryText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '16px', fontWeight: 700, color: color || Theme.colors.primaryText, fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '10px', color: Theme.colors.secondaryText, marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

function OIBar({ callOI, putOI }) {
  const total = callOI + putOI;
  if (!total) return null;
  const callPct = Math.round((callOI / total) * 100);
  const putPct = 100 - callPct;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '10px' }}>
        <span style={{ color: Theme.colors.bullishGreen, fontWeight: 600 }}>CALL {callPct}%</span>
        <span style={{ color: Theme.colors.bearishRed, fontWeight: 600 }}>PUT {putPct}%</span>
      </div>
      <div style={{ display: 'flex', height: '6px', borderRadius: Theme.radius.full, overflow: 'hidden', gap: '1px' }}>
        <div style={{ flex: callPct, background: Theme.colors.bullishGreen, opacity: 0.8 }} />
        <div style={{ flex: putPct, background: Theme.colors.bearishRed, opacity: 0.8 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', fontSize: '9px', color: Theme.colors.tertiaryText, fontFamily: 'var(--font-mono)' }}>
        <span>{callOI.toLocaleString()}</span>
        <span>{putOI.toLocaleString()}</span>
      </div>
    </div>
  );
}

export function OptionsSection({ ticker }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/options-data?ticker=${encodeURIComponent(ticker)}`);
      const json = await res.json();
      if (json.success === false) {
        setError(json.error || 'Options data unavailable');
        setData(null);
      } else {
        setData(json);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pcColor = (ratio) => {
    if (ratio === null) return Theme.colors.primaryText;
    if (ratio > 1.2) return Theme.colors.bearishRed;
    if (ratio < 0.8) return Theme.colors.bullishGreen;
    return Theme.colors.accentAmber;
  };

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: Theme.colors.tertiaryText, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Options
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            background: 'transparent',
            border: `1px solid ${Theme.colors.cardBorder}`,
            borderRadius: Theme.radius.xs,
            color: Theme.colors.secondaryText,
            fontSize: '9px',
            fontWeight: 600,
            padding: '2px 8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '0.04em',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? 'LOADING...' : 'REFRESH'}
        </button>
      </div>

      {loading && !data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2].map(i => (
            <div key={i} className="skeleton" style={{ height: '52px', borderRadius: Theme.radius.sm }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <div style={{ fontSize: '12px', color: Theme.colors.secondaryText }}>
          {error}
        </div>
      )}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Stat row */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <StatBox
              label="IV (30d)"
              value={data.iv != null ? `${data.iv}%` : '—'}
              sub="implied volatility"
              color={data.iv != null ? (data.iv > 50 ? Theme.colors.bearishRed : data.iv > 30 ? Theme.colors.accentAmber : Theme.colors.bullishGreen) : undefined}
            />
            <StatBox
              label="P/C Ratio"
              value={data.putCallRatio != null ? data.putCallRatio.toFixed(2) : '—'}
              sub={data.putCallRatio != null ? (data.putCallRatio > 1.2 ? 'bearish lean' : data.putCallRatio < 0.8 ? 'bullish lean' : 'neutral') : undefined}
              color={pcColor(data.putCallRatio)}
            />
            <StatBox
              label="Total OI"
              value={data.totalOI != null ? (data.totalOI >= 1_000_000 ? `${(data.totalOI / 1_000_000).toFixed(1)}M` : data.totalOI >= 1_000 ? `${(data.totalOI / 1_000).toFixed(0)}K` : String(data.totalOI)) : '—'}
              sub="open interest"
            />
          </div>

          {/* Call vs Put OI bar */}
          {data.callOI != null && data.putOI != null && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${Theme.colors.cardBorder}`, borderRadius: Theme.radius.sm, padding: '10px 12px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: Theme.colors.tertiaryText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Call / Put Open Interest
              </div>
              <OIBar callOI={data.callOI} putOI={data.putOI} />
            </div>
          )}

          {/* Volume row */}
          {(data.callVolume != null || data.putVolume != null) && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, fontSize: '11px', color: Theme.colors.secondaryText }}>
                <span style={{ color: Theme.colors.bullishGreen, fontWeight: 600 }}>
                  {(data.callVolume || 0).toLocaleString()}
                </span>
                {' '}call vol
              </div>
              <div style={{ flex: 1, fontSize: '11px', color: Theme.colors.secondaryText }}>
                <span style={{ color: Theme.colors.bearishRed, fontWeight: 600 }}>
                  {(data.putVolume || 0).toLocaleString()}
                </span>
                {' '}put vol
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
