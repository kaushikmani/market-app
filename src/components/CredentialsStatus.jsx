import React, { useState, useEffect } from 'react';

const API_BASE = '/api';

function formatTimeLeft(msLeft) {
  if (msLeft === null || msLeft === undefined) return 'unknown';
  if (msLeft <= 0) return 'expired';
  const hours = Math.floor(msLeft / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  const mins = Math.floor(msLeft / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
}

const LEVEL_COLOR = {
  ok:      '#34d399',
  caution: '#fbbf24',
  warning: '#f97316',
  expired: '#ef4444',
  missing: '#ef4444',
  unknown: '#6b7280',
};

function Dot({ level }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: LEVEL_COLOR[level] || '#6b7280',
      flexShrink: 0,
    }} />
  );
}

export function CredentialsStatus() {
  const [status, setStatus] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/credentials/status`)
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status) return null;

  const { schwab, gemini } = status;

  // Determine overall level
  const levels = [
    schwab.accessToken.level,
    schwab.refreshToken.level,
    gemini.level,
  ];
  const overallLevel =
    levels.includes('expired') || levels.includes('missing') ? 'expired' :
    levels.includes('warning') ? 'warning' :
    levels.includes('caution') ? 'caution' :
    levels.includes('unknown') ? 'unknown' : 'ok';

  // Only show badge if something needs attention
  const needsAttention = overallLevel !== 'ok';
  if (!needsAttention && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 6px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          opacity: 0.4,
        }}
        title="Credentials OK"
      >
        <Dot level="ok" />
        <span style={{ fontSize: 10, color: '#6b7280' }}>creds</span>
      </button>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          background: needsAttention ? 'rgba(239,68,68,0.1)' : 'none',
          border: needsAttention ? '1px solid rgba(239,68,68,0.3)' : 'none',
          borderRadius: 6,
          cursor: 'pointer',
          padding: '3px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
        title="API credentials status"
      >
        <Dot level={overallLevel} />
        <span style={{ fontSize: 10, color: LEVEL_COLOR[overallLevel], fontWeight: 600 }}>
          {needsAttention ? 'Credentials' : 'creds'}
        </span>
      </button>

      {expanded && (
        <div
          style={{
            position: 'absolute',
            top: 28,
            right: 0,
            background: '#1a1a2e',
            border: '1px solid #2d2d4e',
            borderRadius: 8,
            padding: '12px 14px',
            minWidth: 240,
            zIndex: 1000,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            API Credentials
          </div>

          {/* Schwab Access Token */}
          <Row
            label="Schwab Access Token"
            level={schwab.accessToken.level}
            detail={
              schwab.accessToken.msLeft !== null
                ? schwab.accessToken.level === 'expired'
                  ? 'Expired — restart server'
                  : `Expires in ${formatTimeLeft(schwab.accessToken.msLeft)} (auto-refreshed)`
                : 'Not set'
            }
          />

          {/* Schwab Refresh Token */}
          <Row
            label="Schwab Refresh Token"
            level={schwab.refreshToken.level}
            detail={
              schwab.refreshToken.msLeft !== null
                ? schwab.refreshToken.level === 'expired'
                  ? 'Expired — run node schwab-auth.js'
                  : `Expires in ${formatTimeLeft(schwab.refreshToken.msLeft)}`
                : schwab.refreshToken.set
                  ? 'Set (expiry unknown — run schwab-auth.js once to track)'
                  : 'Not set — run node schwab-auth.js'
            }
          />

          {/* Gemini */}
          <Row
            label="Gemini API Key"
            level={gemini.level}
            detail={gemini.set ? 'Set' : 'Not set — add GEMINI_API_KEY to .env'}
          />

          <div
            onClick={() => setExpanded(false)}
            style={{ marginTop: 10, fontSize: 10, color: '#6b7280', cursor: 'pointer', textAlign: 'right' }}
          >
            close
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, level, detail }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
      <Dot level={level} />
      <div>
        <div style={{ fontSize: 11, color: '#e5e7eb', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{detail}</div>
      </div>
    </div>
  );
}
