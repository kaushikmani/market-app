import { useState, useEffect } from 'react';
import { ApiService } from '../services/ApiService';
import { Theme } from '../models/Theme';

const CONDITIONS = [
  { value: 'near_sma',       label: 'Near SMA',       hasPeriod: true,  hasThr: true,  thrLabel: '% range' },
  { value: 'cross_above_sma',label: 'Cross Above SMA', hasPeriod: true,  hasThr: false },
  { value: 'cross_below_sma',label: 'Cross Below SMA', hasPeriod: true,  hasThr: false },
  { value: 'price_above',    label: 'Price Above $',   hasPeriod: false, hasThr: true,  thrLabel: 'price $' },
  { value: 'price_below',    label: 'Price Below $',   hasпериод: false, hasThr: true,  thrLabel: 'price $' },
];

function timeAgo(ts) {
  if (!ts) return null;
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function AlertRow({ alert, onToggle, onDelete }) {
  const cond = CONDITIONS.find(c => c.value === alert.condition);
  const lastSentAgo = timeAgo(alert.lastSent);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto auto auto',
      alignItems: 'center',
      gap: '10px',
      padding: '9px 14px',
      borderBottom: `1px solid ${Theme.colors.cardBorder}`,
      opacity: alert.enabled ? 1 : 0.45,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: Theme.colors.accentBlue, letterSpacing: '0.04em' }}>
            {alert.ticker}
          </span>
          <span style={{ fontSize: '10px', color: Theme.colors.secondaryText }}>
            {cond?.label || alert.condition}
            {alert.period ? ` ${alert.period}` : ''}
            {alert.threshold != null && alert.condition !== 'price_above' && alert.condition !== 'price_below'
              ? ` ±${alert.threshold}%` : ''}
            {alert.threshold != null && (alert.condition === 'price_above' || alert.condition === 'price_below')
              ? ` $${alert.threshold}` : ''}
          </span>
        </div>
        <div style={{ fontSize: '9px', color: Theme.colors.tertiaryText, marginTop: '2px' }}>
          Cooldown {alert.cooldownHours}h
          {lastSentAgo ? ` · Last triggered ${lastSentAgo}` : ' · Never triggered'}
        </div>
      </div>

      {/* Enabled toggle */}
      <div
        onClick={() => onToggle(alert.id, !alert.enabled)}
        style={{
          width: '32px', height: '18px', borderRadius: '9px',
          background: alert.enabled ? Theme.colors.accentBlue : Theme.colors.cardBorder,
          position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: '2px',
          left: alert.enabled ? '16px' : '2px',
          width: '14px', height: '14px', borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s',
        }} />
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(alert.id)}
        style={{
          background: 'transparent', border: 'none',
          color: Theme.colors.tertiaryText, cursor: 'pointer',
          fontSize: '14px', padding: '2px 4px',
          borderRadius: Theme.radius.xs,
        }}
        onMouseEnter={e => e.currentTarget.style.color = Theme.colors.bearishRed}
        onMouseLeave={e => e.currentTarget.style.color = Theme.colors.tertiaryText}
      >
        ✕
      </button>
    </div>
  );
}

function AddAlertForm({ onAdd, onCancel }) {
  const [ticker,    setTicker]    = useState('');
  const [condition, setCondition] = useState('near_sma');
  const [period,    setPeriod]    = useState(50);
  const [threshold, setThreshold] = useState(1.5);
  const [cooldown,  setCooldown]  = useState(4);
  const [saving,    setSaving]    = useState(false);

  const cond = CONDITIONS.find(c => c.value === condition);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ticker.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        ticker:        ticker.trim().toUpperCase(),
        condition,
        period:        cond?.hasпериод || cond?.hasпериод === false ? undefined : cond?.hasрeriod ? undefined : period,
        ...(cond?.hasРeriod !== false && { period }),
        ...(cond?.hasThr && { threshold: parseFloat(threshold) }),
        cooldownHours: parseInt(cooldown),
      });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: Theme.colors.inputBackground,
    border: `1px solid ${Theme.colors.cardBorder}`,
    borderRadius: Theme.radius.sm, color: Theme.colors.primaryText,
    padding: '6px 10px', fontSize: '11px', fontFamily: 'inherit',
    outline: 'none', width: '100%',
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '14px', borderBottom: `1px solid ${Theme.colors.cardBorder}`, background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', marginBottom: '8px' }}>
        <input
          placeholder="TICKER"
          value={ticker}
          onChange={e => setTicker(e.target.value.toUpperCase())}
          style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontWeight: 800, letterSpacing: '0.06em' }}
          required
        />
        <select
          value={condition}
          onChange={e => setCondition(e.target.value)}
          style={{ ...inputStyle }}
        >
          {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: cond?.hasReriod !== false ? '1fr 1fr 1fr' : '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        {cond?.hasReriod !== false && (
          <div>
            <div style={{ fontSize: '8px', color: Theme.colors.tertiaryText, marginBottom: '3px' }}>SMA Period</div>
            <select value={period} onChange={e => setPeriod(e.target.value)} style={inputStyle}>
              {[8, 20, 21, 50, 100, 200].map(p => <option key={p} value={p}>SMA {p}</option>)}
            </select>
          </div>
        )}
        {cond?.hasThr && (
          <div>
            <div style={{ fontSize: '8px', color: Theme.colors.tertiaryText, marginBottom: '3px' }}>{cond.thrLabel}</div>
            <input type="number" step="0.1" value={threshold} onChange={e => setThreshold(e.target.value)} style={inputStyle} />
          </div>
        )}
        <div>
          <div style={{ fontSize: '8px', color: Theme.colors.tertiaryText, marginBottom: '3px' }}>Cooldown (hrs)</div>
          <input type="number" min="1" max="48" value={cooldown} onChange={e => setCooldown(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            flex: 1, padding: '7px', fontSize: '11px', fontWeight: 700,
            fontFamily: 'inherit', cursor: saving ? 'wait' : 'pointer',
            background: Theme.colors.accentBlue, border: 'none',
            borderRadius: Theme.radius.sm, color: '#fff',
          }}
        >
          {saving ? 'Adding...' : 'Add Alert'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '7px 14px', fontSize: '11px', fontWeight: 600,
            fontFamily: 'inherit', cursor: 'pointer',
            background: 'transparent', border: `1px solid ${Theme.colors.cardBorder}`,
            borderRadius: Theme.radius.sm, color: Theme.colors.secondaryText,
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function AlertsPanel({ onClose }) {
  const [alerts,   setAlerts]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    ApiService.getAlerts()
      .then(d => setAlerts(d.alerts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (data) => {
    await ApiService.createAlert(data);
    setShowForm(false);
    load();
  };

  const handleToggle = async (id, enabled) => {
    await ApiService.updateAlert(id, { enabled });
    load();
  };

  const handleDelete = async (id) => {
    await ApiService.deleteAlert(id);
    load();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      backdropFilter: 'blur(4px)',
    }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '520px',
          background: Theme.colors.appBackground,
          border: `1px solid ${Theme.colors.cardBorder}`,
          borderRadius: Theme.radius.md,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: `1px solid ${Theme.colors.cardBorder}`,
          background: Theme.colors.cardBackground, flexShrink: 0,
        }}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: Theme.colors.primaryText }}>
            Price Alerts
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowForm(f => !f)}
              style={{
                padding: '5px 12px', fontSize: '10px', fontWeight: 700,
                fontFamily: 'inherit', cursor: 'pointer',
                background: showForm ? Theme.colors.accentBlueDim : Theme.colors.accentBlue,
                border: `1px solid ${Theme.colors.accentBlueBorder}`,
                borderRadius: Theme.radius.sm,
                color: showForm ? Theme.colors.accentBlue : '#fff',
              }}
            >
              {showForm ? 'Cancel' : '+ New Alert'}
            </button>
            <button
              onClick={onClose}
              style={{
                width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: `1px solid ${Theme.colors.cardBorder}`,
                borderRadius: Theme.radius.sm, color: Theme.colors.secondaryText, cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && <AddAlertForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />}

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: Theme.colors.secondaryText }}>Loading...</div>
          ) : alerts.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: Theme.colors.secondaryText, marginBottom: '6px' }}>No alerts set</div>
              <div style={{ fontSize: '11px', color: Theme.colors.tertiaryText }}>
                Alerts are sent to Morning_Brief on WhatsApp
              </div>
            </div>
          ) : (
            alerts.map(a => (
              <AlertRow key={a.id} alert={a} onToggle={handleToggle} onDelete={handleDelete} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
