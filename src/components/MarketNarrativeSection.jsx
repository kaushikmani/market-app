import React, { useState, useCallback } from 'react';
import { Theme } from '../models/Theme';
import { ApiService } from '../services/ApiService';

export const MarketNarrativeSection = () => {
  const [narrative, setNarrative] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiService.getMarketNarrative(force);
      setNarrative(data.narrative || null);
      setLoaded(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!loaded && !loading) {
    return (
      <div className="card" style={{ padding: '14px 16px', borderLeft: `3px solid ${Theme.colors.bullishGreen}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: Theme.colors.bullishGreen, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              AI Market Narrative
            </span>
            <div style={{ fontSize: '10px', color: Theme.colors.tertiaryText, marginTop: '2px' }}>
              Gemini summary of today's market tone and key movers
            </div>
          </div>
          <button
            onClick={() => load(false)}
            style={{
              background: Theme.colors.bullishGreenBg,
              border: `1px solid ${Theme.colors.bullishGreenBorder}`,
              borderRadius: '4px',
              color: Theme.colors.bullishGreen,
              fontSize: '10px',
              fontWeight: 700,
              padding: '4px 12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Generate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '14px 16px', borderLeft: `3px solid ${Theme.colors.bullishGreen}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: narrative ? '12px' : 0 }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: Theme.colors.bullishGreen, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          AI Market Narrative
        </span>
        <button
          onClick={() => load(true)}
          disabled={loading}
          style={{
            background: 'transparent',
            border: `1px solid ${Theme.colors.cardBorder}`,
            borderRadius: '4px',
            color: loading ? Theme.colors.tertiaryText : Theme.colors.secondaryText,
            fontSize: '10px',
            fontWeight: 600,
            padding: '3px 10px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = Theme.colors.bullishGreen; e.currentTarget.style.color = Theme.colors.bullishGreen; } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = Theme.colors.cardBorder; e.currentTarget.style.color = Theme.colors.secondaryText; }}
        >
          {loading ? 'Generating...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: '11px', color: Theme.colors.bearishRed }}>{error}</div>
      )}

      {loading && !narrative && (
        <div style={{ fontSize: '11px', color: Theme.colors.tertiaryText }}>Analyzing market data...</div>
      )}

      {narrative && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {narrative.split('\n\n').filter(Boolean).map((para, i) => (
            <p key={i} style={{
              fontSize: '12px',
              color: Theme.colors.secondaryText,
              lineHeight: 1.65,
              margin: 0,
            }}>
              {para}
            </p>
          ))}
        </div>
      )}

      {!loading && loaded && !narrative && !error && (
        <div style={{ fontSize: '11px', color: Theme.colors.tertiaryText }}>No market data available yet — check back after the pre-market report loads.</div>
      )}
    </div>
  );
};
