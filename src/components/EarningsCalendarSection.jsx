import { useState, useEffect } from 'react';
import { ApiService } from '../services/ApiService';
import { Theme } from '../models/Theme';

const DAY_LABELS = { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri' };

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function TimeTag({ time }) {
  if (!time) return null;
  const label = time === 'BMO' ? 'Pre' : time === 'AMC' ? 'Post' : time === 'TNS' ? 'TBD' : time;
  const color = time === 'BMO' ? Theme.colors.accentBlue : time === 'AMC' ? '#f0a500' : Theme.colors.tertiaryText;
  const bg    = time === 'BMO' ? Theme.colors.accentBlueDim : time === 'AMC' ? 'rgba(240,165,0,0.10)' : 'rgba(255,255,255,0.05)';
  return (
    <span style={{
      fontSize: '8px', fontWeight: 700, padding: '1px 5px',
      borderRadius: '3px', background: bg, color, flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

function EarningsRow({ item, onTickerClick }) {
  const beat = item.epsActual != null && item.epsEstimate != null
    ? item.epsActual > item.epsEstimate ? 'beat'
    : item.epsActual < item.epsEstimate ? 'miss' : 'inline'
    : null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '56px 1fr auto auto',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      borderBottom: `1px solid ${Theme.colors.cardBorder}`,
      cursor: onTickerClick ? 'pointer' : 'default',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      onClick={() => onTickerClick?.(item.ticker)}
    >
      <span style={{
        fontSize: '11px', fontWeight: 800,
        fontFamily: 'var(--font-mono)',
        color: Theme.colors.accentBlue,
        letterSpacing: '0.04em',
      }}>
        {item.ticker}
      </span>

      <span style={{
        fontSize: '10px', color: Theme.colors.secondaryText,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {item.company}
      </span>

      <TimeTag time={item.time} />

      {beat && (
        <span style={{
          fontSize: '8px', fontWeight: 700, padding: '1px 6px', borderRadius: '3px',
          background: beat === 'beat' ? 'rgba(0,214,143,0.12)' : beat === 'miss' ? 'rgba(255,77,77,0.12)' : 'rgba(255,255,255,0.05)',
          color: beat === 'beat' ? '#00d68f' : beat === 'miss' ? '#ff4d4d' : Theme.colors.tertiaryText,
          flexShrink: 0,
        }}>
          {beat === 'beat' ? '▲ Beat' : beat === 'miss' ? '▼ Miss' : '= Inline'}
        </span>
      )}
    </div>
  );
}

function DayBlock({ date, earnings, onTickerClick }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        padding: '5px 12px',
        fontSize: '9px', fontWeight: 700,
        color: Theme.colors.tertiaryText,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        background: 'rgba(255,255,255,0.02)',
        borderBottom: `1px solid ${Theme.colors.cardBorder}`,
      }}>
        {formatDate(date)} · {earnings.length} companies
      </div>
      {earnings.slice(0, 20).map((item, i) => (
        <EarningsRow key={i} item={item} onTickerClick={onTickerClick} />
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto auto', gap: '8px', padding: '7px 12px', borderBottom: `1px solid ${Theme.colors.cardBorder}` }}>
      <div className="skeleton" style={{ height: '12px', width: '40px' }} />
      <div className="skeleton" style={{ height: '10px', width: '70%' }} />
      <div className="skeleton" style={{ height: '10px', width: '28px' }} />
    </div>
  );
}

export function EarningsCalendarSection({ onTickerClick }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [week, setWeek]     = useState('this');

  const load = () => {
    setLoading(true);
    setError(null);
    ApiService.getEarningsCalendar()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  const days = week === 'this' ? data?.thisWeek : data?.nextWeek;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#f0a500', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
            Earnings Calendar
          </div>
          {data?.updatedAt && (
            <div style={{ fontSize: '9px', color: Theme.colors.tertiaryText, marginTop: '2px' }}>
              Updated {data.updatedAt}
            </div>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '4px 12px', fontSize: '9px', fontWeight: 700,
            fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: loading ? 'wait' : 'pointer',
            border: '1px solid #f0a500', borderRadius: '3px',
            background: 'transparent',
            color: loading ? Theme.colors.tertiaryText : '#f0a500',
          }}
        >
          {loading ? '...' : 'REFRESH'}
        </button>
      </div>

      {/* Week toggle */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
        {['this', 'next'].map(w => (
          <button
            key={w}
            onClick={() => setWeek(w)}
            style={{
              padding: '3px 12px', fontSize: '10px', fontWeight: 700,
              fontFamily: 'monospace', cursor: 'pointer',
              border: `1px solid ${week === w ? '#f0a500' : Theme.colors.cardBorder}`,
              borderRadius: '3px',
              background: week === w ? 'rgba(240,165,0,0.12)' : 'transparent',
              color: week === w ? '#f0a500' : Theme.colors.secondaryText,
            }}
          >
            {w === 'this' ? 'This Week' : 'Next Week'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ border: `1px solid ${Theme.colors.cardBorder}`, borderRadius: Theme.radius.sm, overflow: 'hidden', background: Theme.colors.cardBackground }}>
        {error ? (
          <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: Theme.colors.bearishRed }}>
            {error}
          </div>
        ) : loading ? (
          Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} />)
        ) : !days || days.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: Theme.colors.secondaryText }}>
            No earnings scheduled
          </div>
        ) : (
          days.map(({ date, earnings }) => (
            <DayBlock key={date} date={date} earnings={earnings} onTickerClick={onTickerClick} />
          ))
        )}
      </div>
    </div>
  );
}
