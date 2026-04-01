import React, { useState, useEffect, useCallback } from 'react';
import { Theme } from '../models/Theme';

const API = '/api/journal';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt$(n) {
  if (n === null || n === undefined) return '—';
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n >= 0 ? '+$' : '-$') + abs;
}

function fmtPct(n) {
  if (n === null || n === undefined) return '—';
  return n.toFixed(1) + '%';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getWeekRange(weekKey) {
  const d = new Date(weekKey + 'T12:00:00Z');
  const sun = new Date(d);
  sun.setUTCDate(d.getUTCDate() + 6);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} – ${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
}

const GRADE_COLOR = {
  'A+': '#34d399', A: '#6c8aff', B: '#fbbf24', C: '#f97316', '': '#6b7280',
};

const RESULT_COLOR = {
  win: Theme.colors.bullishGreen, loss: Theme.colors.bearishRed,
  breakeven: Theme.colors.neutralGray, open: Theme.colors.accentBlue,
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function SubTab({ label, active, onClick, count }) {
  return (
    <button onClick={onClick} style={{
      background: active ? Theme.colors.accentBlueDim : 'transparent',
      border: active ? `1px solid ${Theme.colors.accentBlueBorder}` : '1px solid transparent',
      borderRadius: Theme.radius.sm,
      color: active ? Theme.colors.accentBlue : Theme.colors.secondaryText,
      fontSize: 12,
      fontWeight: active ? 700 : 500,
      padding: '5px 12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 5,
    }}>
      {label}
      {count !== undefined && (
        <span style={{
          background: active ? Theme.colors.accentBlue : Theme.colors.cardBorder,
          color: active ? '#fff' : Theme.colors.secondaryText,
          borderRadius: 99,
          fontSize: 10,
          padding: '1px 6px',
          fontWeight: 700,
        }}>{count}</span>
      )}
    </button>
  );
}

function Badge({ label, color }) {
  return (
    <span style={{
      background: color + '22',
      border: `1px solid ${color}44`,
      color,
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 700,
      padding: '1px 6px',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>{label}</span>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: Theme.colors.cardBackground,
      border: `1px solid ${Theme.colors.cardBorder}`,
      borderRadius: Theme.radius.md,
      padding: '12px 14px',
      flex: 1,
      minWidth: 100,
    }}>
      <div style={{ fontSize: 10, color: Theme.colors.secondaryText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || Theme.colors.primaryText }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: Theme.colors.secondaryText, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  ticker: '', date: today(), side: 'long', type: 'stock',
  setup: '', grade: '', entry: '', shares: '',
  notes: '', tags: '',
  optionType: 'call', strike: '', expiry: '', premium: '', ivAtEntry: '',
};

function TradeForm({ initial, onSubmit, onCancel, submitLabel = 'Open Position' }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const isOptions = form.type === 'options';

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const inputStyle = {
    background: Theme.colors.inputBackground,
    border: `1px solid ${Theme.colors.cardBorder}`,
    borderRadius: Theme.radius.sm,
    color: Theme.colors.primaryText,
    fontSize: 13,
    padding: '7px 10px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = { fontSize: 11, color: Theme.colors.secondaryText, marginBottom: 4, display: 'block' };

  const toggleStyle = (active) => ({
    flex: 1,
    padding: '6px 0',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: Theme.radius.xs,
    background: active ? Theme.colors.accentBlueDim : 'transparent',
    color: active ? Theme.colors.accentBlue : Theme.colors.secondaryText,
    border: active ? `1px solid ${Theme.colors.accentBlueBorder}` : '1px solid transparent',
    transition: 'all 0.15s',
  });

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Ticker + Date */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Ticker *</label>
          <input style={inputStyle} value={form.ticker} onChange={e => set('ticker', e.target.value.toUpperCase())} placeholder="NVDA" required />
        </div>
        <div>
          <label style={labelStyle}>Date *</label>
          <input style={inputStyle} type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
        </div>
      </div>

      {/* Type toggle */}
      <div>
        <label style={labelStyle}>Instrument</label>
        <div style={{ display: 'flex', gap: 4, background: Theme.colors.cardBackground, border: `1px solid ${Theme.colors.cardBorder}`, borderRadius: Theme.radius.sm, padding: 3 }}>
          {['stock', 'options'].map(t => (
            <div key={t} style={toggleStyle(form.type === t)} onClick={() => set('type', t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </div>
          ))}
        </div>
      </div>

      {/* Side toggle */}
      <div>
        <label style={labelStyle}>Side</label>
        <div style={{ display: 'flex', gap: 4, background: Theme.colors.cardBackground, border: `1px solid ${Theme.colors.cardBorder}`, borderRadius: Theme.radius.sm, padding: 3 }}>
          {['long', 'short'].map(s => (
            <div key={s} style={toggleStyle(form.side === s)} onClick={() => set('side', s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
          ))}
        </div>
      </div>

      {/* Options fields */}
      {isOptions && (
        <div style={{ background: Theme.colors.accentBlueDim, border: `1px solid ${Theme.colors.accentBlueBorder}`, borderRadius: Theme.radius.sm, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: Theme.colors.accentBlue, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Options Details</div>

          {/* Call/Put */}
          <div style={{ display: 'flex', gap: 4, background: Theme.colors.cardBackground, border: `1px solid ${Theme.colors.cardBorder}`, borderRadius: Theme.radius.sm, padding: 3 }}>
            {['call', 'put'].map(o => (
              <div key={o} style={toggleStyle(form.optionType === o)} onClick={() => set('optionType', o)}>
                {o.toUpperCase()}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Strike</label>
              <input style={inputStyle} type="number" step="0.5" value={form.strike} onChange={e => set('strike', e.target.value)} placeholder="150" />
            </div>
            <div>
              <label style={labelStyle}>Expiry</label>
              <input style={inputStyle} type="date" value={form.expiry} onChange={e => set('expiry', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>IV at Entry %</label>
              <input style={inputStyle} type="number" step="0.1" value={form.ivAtEntry} onChange={e => set('ivAtEntry', e.target.value)} placeholder="45" />
            </div>
          </div>
        </div>
      )}

      {/* Entry + Shares/Contracts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>{isOptions ? 'Premium (per share)' : 'Entry Price'} *</label>
          <input style={inputStyle} type="number" step="0.01" value={form.entry} onChange={e => set('entry', e.target.value)} placeholder="0.00" required />
        </div>
        <div>
          <label style={labelStyle}>{isOptions ? 'Contracts' : 'Shares'} *</label>
          <input style={inputStyle} type="number" step="1" value={form.shares} onChange={e => set('shares', e.target.value)} placeholder="100" required />
        </div>
      </div>

      {/* Setup + Grade */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Setup</label>
          <input style={inputStyle} value={form.setup} onChange={e => set('setup', e.target.value)} placeholder="Bull flag breakout" />
        </div>
        <div>
          <label style={labelStyle}>Grade</label>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.grade} onChange={e => set('grade', e.target.value)}>
            <option value="">—</option>
            {['A+', 'A', 'B', 'C'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label style={labelStyle}>Notes</label>
        <textarea
          style={{ ...inputStyle, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Why this setup? What's the thesis?"
        />
      </div>

      {/* Tags */}
      <div>
        <label style={labelStyle}>Tags (comma-separated)</label>
        <input style={inputStyle} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="earnings, momentum, sector-rotation" />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{
            background: 'transparent', border: `1px solid ${Theme.colors.cardBorder}`,
            borderRadius: Theme.radius.sm, color: Theme.colors.secondaryText,
            fontSize: 13, padding: '8px 16px', cursor: 'pointer',
          }}>
            Cancel
          </button>
        )}
        <button type="submit" style={{
          background: Theme.colors.accentBlue, border: 'none',
          borderRadius: Theme.radius.sm, color: '#fff',
          fontSize: 13, fontWeight: 700, padding: '8px 20px', cursor: 'pointer',
        }}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

// ── Close Position Form ───────────────────────────────────────────────────────

function CloseForm({ position, onClose, onCancel }) {
  const [exit, setExit]           = useState('');
  const [exitDate, setExitDate]   = useState(today());
  const [notes, setNotes]         = useState('');
  const [sharesToClose, setSharesToClose] = useState(String(position.shares));

  const isOptions   = position.type === 'options';
  const closeShares = parseFloat(sharesToClose) || 0;
  const isPartial   = closeShares > 0 && closeShares < position.shares;

  const previewPnl = exit && closeShares > 0 ? (() => {
    const multiplier = isOptions ? 100 : 1;
    const direction  = position.side === 'short' ? -1 : 1;
    return Math.round(((parseFloat(exit) - position.entry) * closeShares * multiplier * direction) * 100) / 100;
  })() : null;

  const inputStyle = {
    background: Theme.colors.inputBackground,
    border: `1px solid ${Theme.colors.cardBorder}`,
    borderRadius: Theme.radius.sm,
    color: Theme.colors.primaryText,
    fontSize: 13,
    padding: '7px 10px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: Theme.colors.primaryText }}>
        Close {position.ticker} {position.side === 'short' ? 'Short' : 'Long'}
        {isOptions && ` · ${position.optionType?.toUpperCase()} $${position.strike}`}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, color: Theme.colors.secondaryText, marginBottom: 4, display: 'block' }}>
            {isOptions ? 'Exit Premium' : 'Exit Price'} *
          </label>
          <input style={inputStyle} type="number" step="0.01" value={exit} onChange={e => setExit(e.target.value)} placeholder="0.00" autoFocus />
        </div>
        <div>
          <label style={{ fontSize: 11, color: Theme.colors.secondaryText, marginBottom: 4, display: 'block' }}>
            {isOptions ? 'Contracts' : 'Shares'} to Close
          </label>
          <input style={inputStyle} type="number" step="1" min="1" max={position.shares} value={sharesToClose} onChange={e => setSharesToClose(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: Theme.colors.secondaryText, marginBottom: 4, display: 'block' }}>Exit Date</label>
          <input style={inputStyle} type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} />
        </div>
      </div>

      {isPartial && (
        <div style={{ fontSize: 11, color: Theme.colors.accentAmber, background: Theme.colors.accentAmberBg || '#2a1f0a', border: `1px solid ${Theme.colors.accentAmberBorder || '#7a5a1a'}`, borderRadius: Theme.radius.sm, padding: '6px 10px' }}>
          Partial close — {position.shares - closeShares} {isOptions ? 'contracts' : 'shares'} remain open
        </div>
      )}

      {previewPnl !== null && (
        <div style={{
          background: previewPnl >= 0 ? Theme.colors.bullishGreenBg : Theme.colors.bearishRedBg,
          border: `1px solid ${previewPnl >= 0 ? Theme.colors.bullishGreenBorder : Theme.colors.bearishRedBorder}`,
          borderRadius: Theme.radius.sm,
          padding: '8px 12px',
          fontSize: 14,
          fontWeight: 700,
          color: previewPnl >= 0 ? Theme.colors.bullishGreen : Theme.colors.bearishRed,
        }}>
          P&L: {fmt$(previewPnl)}
        </div>
      )}

      <div>
        <label style={{ fontSize: 11, color: Theme.colors.secondaryText, marginBottom: 4, display: 'block' }}>Close Notes</label>
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="What happened? What did you learn?"
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{
          background: 'transparent', border: `1px solid ${Theme.colors.cardBorder}`,
          borderRadius: Theme.radius.sm, color: Theme.colors.secondaryText,
          fontSize: 13, padding: '7px 14px', cursor: 'pointer',
        }}>Cancel</button>
        <button
          disabled={!exit || closeShares <= 0}
          onClick={() => onClose({ exit, exitDate, notes, shares: sharesToClose })}
          style={{
            background: Theme.colors.bullishGreen, border: 'none',
            borderRadius: Theme.radius.sm, color: '#000',
            fontSize: 13, fontWeight: 700, padding: '7px 18px',
            cursor: (exit && closeShares > 0) ? 'pointer' : 'not-allowed',
            opacity: (exit && closeShares > 0) ? 1 : 0.5,
          }}
        >{isPartial ? 'Partial Close' : 'Close Trade'}</button>
      </div>
    </div>
  );
}

// ── Add to Position Form ──────────────────────────────────────────────────────

function AddForm({ position, onAdd, onCancel }) {
  const [price, setPrice]   = useState('');
  const [shares, setShares] = useState('');
  const [date, setDate]     = useState(today());

  const isOptions = position.type === 'options';
  const addShares = parseFloat(shares) || 0;
  const addPrice  = parseFloat(price)  || 0;

  const newAvgEntry = price && shares && addShares > 0 ? (() => {
    const newTotal = position.shares + addShares;
    return Math.round((position.entry * position.shares + addPrice * addShares) / newTotal * 100) / 100;
  })() : null;

  const inputStyle = {
    background: Theme.colors.inputBackground,
    border: `1px solid ${Theme.colors.cardBorder}`,
    borderRadius: Theme.radius.sm,
    color: Theme.colors.primaryText,
    fontSize: 13,
    padding: '7px 10px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: Theme.colors.primaryText }}>
        Add to {position.ticker} {position.side === 'short' ? 'Short' : 'Long'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, color: Theme.colors.secondaryText, marginBottom: 4, display: 'block' }}>
            {isOptions ? 'Premium' : 'Add Price'} *
          </label>
          <input style={inputStyle} type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" autoFocus />
        </div>
        <div>
          <label style={{ fontSize: 11, color: Theme.colors.secondaryText, marginBottom: 4, display: 'block' }}>
            {isOptions ? 'Contracts' : 'Shares'} *
          </label>
          <input style={inputStyle} type="number" step="1" min="1" value={shares} onChange={e => setShares(e.target.value)} placeholder="100" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: Theme.colors.secondaryText, marginBottom: 4, display: 'block' }}>Date</label>
          <input style={inputStyle} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      {newAvgEntry !== null && (
        <div style={{
          background: Theme.colors.accentBlueDim,
          border: `1px solid ${Theme.colors.accentBlueBorder}`,
          borderRadius: Theme.radius.sm,
          padding: '8px 12px',
          fontSize: 12,
          color: Theme.colors.accentBlue,
        }}>
          New avg cost: <strong>${newAvgEntry}</strong> · Total {isOptions ? 'contracts' : 'shares'}: <strong>{position.shares + addShares}</strong>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{
          background: 'transparent', border: `1px solid ${Theme.colors.cardBorder}`,
          borderRadius: Theme.radius.sm, color: Theme.colors.secondaryText,
          fontSize: 13, padding: '7px 14px', cursor: 'pointer',
        }}>Cancel</button>
        <button
          disabled={!price || !shares}
          onClick={() => onAdd({ price, shares, date })}
          style={{
            background: Theme.colors.accentBlue, border: 'none',
            borderRadius: Theme.radius.sm, color: '#fff',
            fontSize: 13, fontWeight: 700, padding: '7px 18px',
            cursor: (price && shares) ? 'pointer' : 'not-allowed',
            opacity: (price && shares) ? 1 : 0.5,
          }}
        >Add Shares</button>
      </div>
    </div>
  );
}

// ── Positions Tab ─────────────────────────────────────────────────────────────

function PositionsTab({ positions, currentPrices, onClose, onDelete, onRefresh }) {
  const [closingId, setClosingId] = useState(null);
  const [addingId, setAddingId]   = useState(null);

  if (positions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: Theme.colors.secondaryText, fontSize: 13 }}>
        No open positions
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {positions.map(pos => {
        const isOptions = pos.type === 'options';
        const currentPrice = currentPrices?.[pos.ticker];
        const unrealizedPnl = currentPrice ? (() => {
          const multiplier = isOptions ? 100 : 1;
          const direction  = pos.side === 'short' ? -1 : 1;
          return Math.round(((currentPrice - pos.entry) * pos.shares * multiplier * direction) * 100) / 100;
        })() : null;

        const daysHeld = Math.floor((Date.now() - new Date(pos.date + 'T12:00:00Z')) / 86400000);
        const hasAdds   = pos.adds?.length > 0;
        const hasCloses = pos.closes?.length > 0;

        return (
          <div key={pos.id} style={{
            background: Theme.colors.cardBackground,
            border: `1px solid ${Theme.colors.cardBorder}`,
            borderRadius: Theme.radius.md,
            overflow: 'hidden',
          }}>
            {closingId === pos.id ? (
              <CloseForm
                position={pos}
                onClose={async (data) => {
                  await fetch(`${API}/positions/${pos.id}/close`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                  });
                  setClosingId(null);
                  onRefresh();
                }}
                onCancel={() => setClosingId(null)}
              />
            ) : addingId === pos.id ? (
              <AddForm
                position={pos}
                onAdd={async (data) => {
                  await fetch(`${API}/positions/${pos.id}/add`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                  });
                  setAddingId(null);
                  onRefresh();
                }}
                onCancel={() => setAddingId(null)}
              />
            ) : (
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: Theme.colors.primaryText }}>{pos.ticker}</span>
                    <Badge label={pos.side} color={pos.side === 'long' ? Theme.colors.bullishGreen : Theme.colors.bearishRed} />
                    {isOptions && <Badge label={`${pos.optionType?.toUpperCase()} $${pos.strike}`} color={Theme.colors.accentPurple} />}
                    {pos.grade && <Badge label={pos.grade} color={GRADE_COLOR[pos.grade] || '#6b7280'} />}
                    <span style={{ fontSize: 10, color: Theme.colors.secondaryText }}>{daysHeld}d held</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setAddingId(pos.id); setClosingId(null); }} style={{
                      background: Theme.colors.accentBlueDim, border: `1px solid ${Theme.colors.accentBlueBorder}`,
                      borderRadius: Theme.radius.sm, color: Theme.colors.accentBlue,
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', cursor: 'pointer',
                    }}>+ Add</button>
                    <button onClick={() => { setClosingId(pos.id); setAddingId(null); }} style={{
                      background: Theme.colors.bullishGreenBg, border: `1px solid ${Theme.colors.bullishGreenBorder}`,
                      borderRadius: Theme.radius.sm, color: Theme.colors.bullishGreen,
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', cursor: 'pointer',
                    }}>Close</button>
                    <button onClick={() => { if (confirm(`Delete ${pos.ticker} position?`)) onDelete(pos.id); }} style={{
                      background: 'transparent', border: `1px solid ${Theme.colors.cardBorder}`,
                      borderRadius: Theme.radius.sm, color: Theme.colors.secondaryText,
                      fontSize: 11, padding: '4px 8px', cursor: 'pointer',
                    }}>✕</button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                  <span style={{ color: Theme.colors.secondaryText }}>
                    {hasAdds ? 'Avg cost' : 'Entry'}{' '}
                    <span style={{ color: Theme.colors.primaryText, fontWeight: 600 }}>${pos.entry}</span>
                  </span>
                  <span style={{ color: Theme.colors.secondaryText }}>
                    {isOptions ? 'Contracts' : 'Shares'}{' '}
                    <span style={{ color: Theme.colors.primaryText, fontWeight: 600 }}>{pos.shares}</span>
                    {hasAdds && <span style={{ color: Theme.colors.secondaryText }}> · {pos.adds.length} add{pos.adds.length > 1 ? 's' : ''}</span>}
                  </span>
                  {currentPrice && <span style={{ color: Theme.colors.secondaryText }}>Now <span style={{ color: Theme.colors.primaryText, fontWeight: 600 }}>${currentPrice}</span></span>}
                  {unrealizedPnl !== null && (
                    <span style={{ fontWeight: 700, color: unrealizedPnl >= 0 ? Theme.colors.bullishGreen : Theme.colors.bearishRed }}>
                      {fmt$(unrealizedPnl)} unrealized
                    </span>
                  )}
                </div>

                {pos.setup && <div style={{ fontSize: 11, color: Theme.colors.secondaryText, marginTop: 6 }}>{pos.setup}</div>}
                {isOptions && pos.expiry && (
                  <div style={{ fontSize: 11, color: Theme.colors.accentAmber, marginTop: 4 }}>
                    Expires {pos.expiry}
                    {' · '}{Math.max(0, Math.floor((new Date(pos.expiry) - new Date()) / 86400000))}d left
                  </div>
                )}

                {/* Adds history */}
                {hasAdds && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${Theme.colors.cardBorder}` }}>
                    <div style={{ fontSize: 10, color: Theme.colors.secondaryText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Adds</div>
                    {pos.adds.map((add, i) => (
                      <div key={i} style={{ fontSize: 11, color: Theme.colors.secondaryText, display: 'flex', gap: 10 }}>
                        <span>{add.date}</span>
                        <span style={{ color: Theme.colors.primaryText }}>{add.shares} @ ${add.price}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Partial closes history */}
                {hasCloses && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${Theme.colors.cardBorder}` }}>
                    <div style={{ fontSize: 10, color: Theme.colors.secondaryText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Partial Closes</div>
                    {pos.closes.map((cl, i) => (
                      <div key={i} style={{ fontSize: 11, color: Theme.colors.secondaryText, display: 'flex', gap: 10 }}>
                        <span>{cl.date}</span>
                        <span style={{ color: Theme.colors.primaryText }}>{cl.shares} @ ${cl.price}</span>
                        <span style={{ color: cl.pnl >= 0 ? Theme.colors.bullishGreen : Theme.colors.bearishRed, fontWeight: 600 }}>{fmt$(cl.pnl)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Trades Tab ────────────────────────────────────────────────────────────────

function TradesTab({ trades, onDelete }) {
  const [filter, setFilter] = useState({ result: '', grade: '', type: '', ticker: '' });

  const filtered = trades.filter(t => {
    if (filter.result && t.result !== filter.result) return false;
    if (filter.grade && t.grade !== filter.grade) return false;
    if (filter.type && t.type !== filter.type) return false;
    if (filter.ticker && !t.ticker.includes(filter.ticker.toUpperCase())) return false;
    return true;
  });

  const selStyle = {
    background: Theme.colors.inputBackground,
    border: `1px solid ${Theme.colors.cardBorder}`,
    borderRadius: Theme.radius.sm,
    color: Theme.colors.primaryText,
    fontSize: 12,
    padding: '5px 8px',
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          style={{ ...selStyle, width: 80 }}
          value={filter.ticker}
          onChange={e => setFilter(f => ({ ...f, ticker: e.target.value }))}
          placeholder="Ticker"
        />
        <select style={selStyle} value={filter.result} onChange={e => setFilter(f => ({ ...f, result: e.target.value }))}>
          <option value="">All Results</option>
          {['win', 'loss', 'breakeven'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <select style={selStyle} value={filter.grade} onChange={e => setFilter(f => ({ ...f, grade: e.target.value }))}>
          <option value="">All Grades</option>
          {['A+', 'A', 'B', 'C'].map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select style={selStyle} value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
          <option value="">All Types</option>
          <option value="stock">Stock</option>
          <option value="options">Options</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: Theme.colors.secondaryText, fontSize: 13 }}>
          No trades found
        </div>
      ) : (
        filtered.map(trade => (
          <TradeRow key={trade.id} trade={trade} onDelete={onDelete} />
        ))
      )}
    </div>
  );
}

function TradeRow({ trade, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const isOptions = trade.type === 'options';

  return (
    <div style={{
      background: Theme.colors.cardBackground,
      border: `1px solid ${trade.pnl > 0 ? Theme.colors.bullishGreenBorder : trade.pnl < 0 ? Theme.colors.bearishRedBorder : Theme.colors.cardBorder}`,
      borderRadius: Theme.radius.md,
      overflow: 'hidden',
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: Theme.colors.primaryText }}>{trade.ticker}</span>
          <Badge label={trade.side} color={trade.side === 'long' ? Theme.colors.bullishGreen : Theme.colors.bearishRed} />
          {isOptions && <Badge label={`${trade.optionType?.toUpperCase()} $${trade.strike}`} color={Theme.colors.accentPurple} />}
          {trade.grade && <Badge label={trade.grade} color={GRADE_COLOR[trade.grade] || '#6b7280'} />}
          <span style={{ fontSize: 11, color: Theme.colors.secondaryText }}>{trade.date}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: RESULT_COLOR[trade.result] || Theme.colors.primaryText }}>
            {fmt$(trade.pnl)}
          </span>
          <span style={{ fontSize: 10, color: Theme.colors.secondaryText }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 14px 12px', borderTop: `1px solid ${Theme.colors.cardBorder}`, paddingTop: 10 }}>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ color: Theme.colors.secondaryText }}>Entry <span style={{ color: Theme.colors.primaryText, fontWeight: 600 }}>${trade.entry}</span></span>
            {trade.exit && <span style={{ color: Theme.colors.secondaryText }}>Exit <span style={{ color: Theme.colors.primaryText, fontWeight: 600 }}>${trade.exit}</span></span>}
            <span style={{ color: Theme.colors.secondaryText }}>{isOptions ? 'Contracts' : 'Shares'} <span style={{ color: Theme.colors.primaryText, fontWeight: 600 }}>{trade.shares}</span></span>
            {isOptions && trade.ivAtEntry && <span style={{ color: Theme.colors.secondaryText }}>IV <span style={{ color: Theme.colors.accentAmber, fontWeight: 600 }}>{trade.ivAtEntry}%</span></span>}
          </div>
          {trade.setup && <div style={{ fontSize: 12, color: Theme.colors.secondaryText, marginBottom: 6 }}>Setup: <span style={{ color: Theme.colors.primaryText }}>{trade.setup}</span></div>}
          {trade.notes && <div style={{ fontSize: 12, color: Theme.colors.secondaryText, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{trade.notes}</div>}
          {trade.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              {trade.tags.map(tag => (
                <span key={tag} style={{ background: Theme.colors.cardBorder, borderRadius: 4, fontSize: 10, color: Theme.colors.secondaryText, padding: '2px 6px' }}>#{tag}</span>
              ))}
            </div>
          )}
          <button
            onClick={() => { if (confirm(`Delete ${trade.ticker} trade?`)) onDelete(trade.id); }}
            style={{ background: 'transparent', border: `1px solid ${Theme.colors.cardBorder}`, borderRadius: Theme.radius.sm, color: Theme.colors.secondaryText, fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}
          >Delete</button>
        </div>
      )}
    </div>
  );
}

// ── Stats Tab ─────────────────────────────────────────────────────────────────

const TIME_RANGES = [
  { label: 'Today',    from: () => today() },
  { label: 'This Week', from: () => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().slice(0, 10); } },
  { label: 'This Month', from: () => new Date().toISOString().slice(0, 8) + '01' },
  { label: 'All Time',  from: () => null },
];

function StatsTab() {
  const [rangeIdx, setRangeIdx] = useState(3);
  const [stats, setStats] = useState(null);
  const [view, setView] = useState('summary'); // summary | weekly | monthly | breakdown

  const loadStats = useCallback(async () => {
    const range = TIME_RANGES[rangeIdx];
    const from = range.from();
    const url = from ? `${API}/stats?from=${from}&to=${today()}` : `${API}/stats`;
    const data = await fetch(url).then(r => r.json()).catch(() => null);
    if (data?.success) setStats(data);
  }, [rangeIdx]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (!stats) return <div style={{ textAlign: 'center', padding: 40, color: Theme.colors.secondaryText }}>Loading…</div>;

  const { summary } = stats;
  const pnlColor = summary.totalPnl > 0 ? Theme.colors.bullishGreen : summary.totalPnl < 0 ? Theme.colors.bearishRed : Theme.colors.primaryText;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Time range selector */}
      <div style={{ display: 'flex', gap: 6 }}>
        {TIME_RANGES.map((r, i) => (
          <button key={r.label} onClick={() => setRangeIdx(i)} style={{
            background: rangeIdx === i ? Theme.colors.accentBlueDim : 'transparent',
            border: `1px solid ${rangeIdx === i ? Theme.colors.accentBlueBorder : Theme.colors.cardBorder}`,
            borderRadius: Theme.radius.sm,
            color: rangeIdx === i ? Theme.colors.accentBlue : Theme.colors.secondaryText,
            fontSize: 11, fontWeight: 600, padding: '5px 10px', cursor: 'pointer',
          }}>{r.label}</button>
        ))}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatCard label="Total P&L" value={fmt$(summary.totalPnl)} color={pnlColor} />
        <StatCard label="Win Rate" value={fmtPct(summary.winRate)} sub={`${summary.wins}W / ${summary.losses}L`} color={summary.winRate >= 50 ? Theme.colors.bullishGreen : Theme.colors.bearishRed} />
        <StatCard label="Trades" value={summary.count} />
        <StatCard label="Profit Factor" value={summary.profitFactor ?? '—'} color={summary.profitFactor >= 1 ? Theme.colors.bullishGreen : Theme.colors.bearishRed} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatCard label="Avg Win" value={fmt$(summary.avgWin)} color={Theme.colors.bullishGreen} />
        <StatCard label="Avg Loss" value={fmt$(summary.avgLoss)} color={Theme.colors.bearishRed} />
        <StatCard label="Best Trade" value={fmt$(summary.largestWin)} color={Theme.colors.bullishGreen} />
        <StatCard label="Worst Trade" value={fmt$(summary.largestLoss)} color={Theme.colors.bearishRed} />
      </div>

      {/* View selector */}
      <div style={{ display: 'flex', gap: 6, borderTop: `1px solid ${Theme.colors.cardBorder}`, paddingTop: 14 }}>
        {[['summary','By Breakdown'], ['weekly','Weekly'], ['monthly','Monthly']].map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} style={{
            background: view === k ? Theme.colors.accentBlueDim : 'transparent',
            border: `1px solid ${view === k ? Theme.colors.accentBlueBorder : Theme.colors.cardBorder}`,
            borderRadius: Theme.radius.sm,
            color: view === k ? Theme.colors.accentBlue : Theme.colors.secondaryText,
            fontSize: 11, fontWeight: 600, padding: '5px 10px', cursor: 'pointer',
          }}>{l}</button>
        ))}
      </div>

      {/* Breakdown view */}
      {view === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <BreakdownTable title="By Grade" rows={stats.byGrade} />
          <BreakdownTable title="By Ticker" rows={stats.byTicker.slice(0, 10)} />
          <BreakdownTable title="By Setup" rows={stats.bySetup.slice(0, 10)} />
          <BreakdownTable title="By Type" rows={stats.byType} />
        </div>
      )}

      {/* Weekly view */}
      {view === 'weekly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {stats.weekly.length === 0 && <div style={{ color: Theme.colors.secondaryText, fontSize: 13, textAlign: 'center', padding: 20 }}>No data</div>}
          {stats.weekly.map(w => (
            <PeriodRow key={w.week} label={getWeekRange(w.week)} stats={w} />
          ))}
        </div>
      )}

      {/* Monthly view */}
      {view === 'monthly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {stats.monthly.length === 0 && <div style={{ color: Theme.colors.secondaryText, fontSize: 13, textAlign: 'center', padding: 20 }}>No data</div>}
          {stats.monthly.map(m => (
            <PeriodRow key={m.month} label={new Date(m.month + '-01T12:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })} stats={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function BreakdownTable({ title, rows }) {
  if (!rows?.length) return null;
  return (
    <div>
      <div style={{ fontSize: 11, color: Theme.colors.secondaryText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map(r => (
          <div key={r.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: Theme.colors.cardBackground, border: `1px solid ${Theme.colors.cardBorder}`,
            borderRadius: Theme.radius.sm, padding: '8px 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: Theme.colors.primaryText }}>{r.label}</span>
              <span style={{ fontSize: 11, color: Theme.colors.secondaryText }}>{r.count} trades · {fmtPct(r.winRate)} WR</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: r.totalPnl >= 0 ? Theme.colors.bullishGreen : Theme.colors.bearishRed }}>
              {fmt$(r.totalPnl)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PeriodRow({ label, stats }) {
  const pnlColor = stats.totalPnl > 0 ? Theme.colors.bullishGreen : stats.totalPnl < 0 ? Theme.colors.bearishRed : Theme.colors.primaryText;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: Theme.colors.cardBackground, border: `1px solid ${Theme.colors.cardBorder}`,
      borderRadius: Theme.radius.md, padding: '10px 14px',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: Theme.colors.primaryText }}>{label}</div>
        <div style={{ fontSize: 11, color: Theme.colors.secondaryText, marginTop: 2 }}>
          {stats.count} trades · {fmtPct(stats.winRate)} WR · PF {stats.profitFactor ?? '—'}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: pnlColor }}>{fmt$(stats.totalPnl)}</div>
        <div style={{ fontSize: 11, color: Theme.colors.secondaryText }}>{stats.wins}W {stats.losses}L</div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function JournalSection() {
  const [tab, setTab] = useState('positions');
  const [positions, setPositions] = useState([]);
  const [trades, setTrades] = useState([]);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logMode, setLogMode] = useState('open'); // 'open' | 'closed'
  const [currentPrices, setCurrentPrices] = useState({});

  const loadCurrentPrices = useCallback(async (positionsList) => {
    if (!positionsList.length) return;
    const tickers = [...new Set(positionsList.map(p => p.ticker))];
    const results = await Promise.allSettled(
      tickers.map(t => fetch(`/api/ticker-info?ticker=${encodeURIComponent(t)}`).then(r => r.json()))
    );
    const prices = {};
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value?.price != null) {
        prices[tickers[i]] = r.value.price;
      }
    });
    setCurrentPrices(prices);
  }, []);

  const loadPositions = useCallback(async () => {
    const data = await fetch(`${API}/positions`).then(r => r.json()).catch(() => null);
    if (data?.success) {
      setPositions(data.positions);
      loadCurrentPrices(data.positions);
    }
  }, [loadCurrentPrices]);

  const loadTrades = useCallback(async () => {
    const data = await fetch(`${API}/trades`).then(r => r.json()).catch(() => null);
    if (data?.success) setTrades(data.trades);
  }, []);

  useEffect(() => {
    loadPositions();
    loadTrades();
  }, [loadPositions, loadTrades]);

  const handleOpenPosition = async (form) => {
    await fetch(`${API}/positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowLogForm(false);
    loadPositions();
    setTab('positions');
  };

  const handleAddTrade = async (form) => {
    await fetch(`${API}/trades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowLogForm(false);
    loadTrades();
    setTab('trades');
  };

  const deletePosition = async (id) => {
    await fetch(`${API}/positions/${id}`, { method: 'DELETE' });
    loadPositions();
  };

  const deleteTrade = async (id) => {
    await fetch(`${API}/trades/${id}`, { method: 'DELETE' });
    loadTrades();
  };

  return (
    <div style={{ paddingTop: 20 }}>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: Theme.colors.primaryText }}>Trading Journal</div>
          <div style={{ fontSize: 12, color: Theme.colors.secondaryText, marginTop: 2 }}>
            {positions.length} open · {trades.length} closed
          </div>
        </div>
        <button
          onClick={() => { setShowLogForm(f => !f); setTab('log'); }}
          style={{
            background: Theme.colors.accentBlue, border: 'none',
            borderRadius: Theme.radius.sm, color: '#fff',
            fontSize: 12, fontWeight: 700, padding: '8px 14px', cursor: 'pointer',
          }}
        >
          + Log Trade
        </button>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <SubTab label="Positions" active={tab === 'positions'} onClick={() => setTab('positions')} count={positions.length} />
        <SubTab label="Log" active={tab === 'log'} onClick={() => setTab('log')} />
        <SubTab label="Trades" active={tab === 'trades'} onClick={() => setTab('trades')} count={trades.length} />
        <SubTab label="Stats" active={tab === 'stats'} onClick={() => setTab('stats')} />
      </div>

      {/* Positions */}
      {tab === 'positions' && (
        <PositionsTab
          positions={positions}
          currentPrices={currentPrices}
          onClose={() => {}}
          onDelete={deletePosition}
          onRefresh={() => { loadPositions(); loadTrades(); }}
        />
      )}

      {/* Log form */}
      {tab === 'log' && (
        <div style={{ background: Theme.colors.cardBackground, border: `1px solid ${Theme.colors.cardBorder}`, borderRadius: Theme.radius.md, padding: 16 }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: Theme.colors.inputBackground, border: `1px solid ${Theme.colors.cardBorder}`, borderRadius: Theme.radius.sm, padding: 3 }}>
            {[['open', 'Open Position'], ['closed', 'Log Closed Trade']].map(([k, l]) => (
              <div key={k} onClick={() => setLogMode(k)} style={{
                flex: 1, textAlign: 'center', padding: '6px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: Theme.radius.xs,
                background: logMode === k ? Theme.colors.accentBlueDim : 'transparent',
                color: logMode === k ? Theme.colors.accentBlue : Theme.colors.secondaryText,
                border: logMode === k ? `1px solid ${Theme.colors.accentBlueBorder}` : '1px solid transparent',
              }}>{l}</div>
            ))}
          </div>

          {logMode === 'open' && (
            <TradeForm
              onSubmit={handleOpenPosition}
              submitLabel="Open Position"
            />
          )}
          {logMode === 'closed' && (
            <TradeForm
              onSubmit={handleAddTrade}
              submitLabel="Add Trade"
              initial={{ exit: '', exitDate: today() }}
            />
          )}
        </div>
      )}

      {/* Trades */}
      {tab === 'trades' && (
        <TradesTab trades={trades} onDelete={deleteTrade} />
      )}

      {/* Stats */}
      {tab === 'stats' && <StatsTab />}
    </div>
  );
}
