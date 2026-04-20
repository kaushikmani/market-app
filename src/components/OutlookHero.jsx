import React from 'react';

export function OutlookHero() {
  const week = `Week of ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
  return (
    <div style={{ paddingTop: 28, paddingBottom: 8 }}>
      <div className="label-tape">{week}</div>
      <h1 className="serif" style={{
        fontSize: 44, lineHeight: 1.1, marginTop: 10, fontWeight: 400,
        fontStyle: 'italic', letterSpacing: '-0.01em', color: 'var(--text-primary)',
        maxWidth: 720,
      }}>
        The coaching log,{' '}
        <span style={{ color: 'var(--tape-acc)' }}>session by session.</span>
      </h1>
      <div style={{
        fontSize: 15, lineHeight: 1.7, color: 'var(--text-secondary)',
        marginTop: 16, maxWidth: 680,
      }}>
        Replay every IC Insiders coaching session — three-timeframe charts, setup checklists, and David Prince's running notes on what's working in the tape this week.
      </div>
    </div>
  );
}
