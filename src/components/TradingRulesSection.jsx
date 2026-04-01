import React, { useState, useEffect, useCallback } from 'react';
import { Theme } from '../models/Theme';
import { ApiService } from '../services/ApiService';

export const TradingRulesSection = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draftRules, setDraftRules] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const loadRules = useCallback(async () => {
    try {
      const data = await ApiService.getRules();
      setRules(data.rules || []);
    } catch (e) {
      setError('Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  const startEdit = () => {
    setDraftRules([...rules]);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraftRules([]);
    setEditing(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const clean = draftRules.filter(r => r.trim());
      const data = await ApiService.saveRules(clean);
      setRules(data.rules);
      setEditing(false);
      setDraftRules([]);
    } catch (e) {
      setError('Failed to save rules');
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = (idx, val) => {
    setDraftRules(prev => prev.map((r, i) => i === idx ? val : r));
  };

  const removeDraft = (idx) => {
    setDraftRules(prev => prev.filter((_, i) => i !== idx));
  };

  const addDraft = () => {
    setDraftRules(prev => [...prev, '']);
  };

  if (loading) return null;

  return (
    <div className="card" style={{
      padding: '14px 16px',
      borderLeft: `3px solid ${Theme.colors.accentAmber}`,
      marginBottom: '4px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: collapsed ? 0 : '12px' }}>
        <div
          onClick={() => setCollapsed(c => !c)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
        >
          <span style={{ fontSize: '11px', color: Theme.colors.accentAmber }}>
            {collapsed ? '▶' : '▼'}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: Theme.colors.accentAmber, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Trading Rules
          </span>
          {!collapsed && (
            <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>
              {rules.length} rule{rules.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {!collapsed && !editing && (
          <button
            onClick={startEdit}
            style={{
              background: 'transparent',
              border: `1px solid ${Theme.colors.cardBorder}`,
              borderRadius: '4px',
              color: Theme.colors.secondaryText,
              fontSize: '10px',
              fontWeight: 600,
              padding: '3px 10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = Theme.colors.accentAmber; e.currentTarget.style.color = Theme.colors.accentAmber; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = Theme.colors.cardBorder; e.currentTarget.style.color = Theme.colors.secondaryText; }}
          >
            Edit
          </button>
        )}
        {!collapsed && editing && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={saveEdit}
              disabled={saving}
              style={{
                background: Theme.colors.accentAmber,
                border: 'none',
                borderRadius: '4px',
                color: '#000',
                fontSize: '10px',
                fontWeight: 700,
                padding: '3px 10px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={cancelEdit}
              style={{
                background: 'transparent',
                border: `1px solid ${Theme.colors.cardBorder}`,
                borderRadius: '4px',
                color: Theme.colors.secondaryText,
                fontSize: '10px',
                fontWeight: 600,
                padding: '3px 10px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ fontSize: '11px', color: Theme.colors.bearishRed, marginBottom: '8px' }}>{error}</div>
      )}

      {!collapsed && !editing && (
        <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {rules.map((rule, i) => (
            <li key={i} style={{ fontSize: '12px', color: Theme.colors.primaryText, lineHeight: 1.5 }}>
              {rule}
            </li>
          ))}
          {rules.length === 0 && (
            <div style={{ fontSize: '11px', color: Theme.colors.tertiaryText }}>
              No rules yet. Click Edit to add your trading rules.
            </div>
          )}
        </ol>
      )}

      {!collapsed && editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {draftRules.map((rule, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: Theme.colors.tertiaryText, minWidth: '16px' }}>{i + 1}.</span>
              <input
                value={rule}
                onChange={e => updateDraft(i, e.target.value)}
                placeholder="Enter rule..."
                style={{
                  flex: 1,
                  background: Theme.colors.inputBackground,
                  border: `1px solid ${Theme.colors.cardBorder}`,
                  borderRadius: '4px',
                  color: Theme.colors.primaryText,
                  fontSize: '12px',
                  padding: '5px 8px',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = Theme.colors.accentAmber; }}
                onBlur={e => { e.currentTarget.style.borderColor = Theme.colors.cardBorder; }}
              />
              <button
                onClick={() => removeDraft(i)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: Theme.colors.tertiaryText,
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '0 4px',
                  lineHeight: 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.color = Theme.colors.bearishRed; }}
                onMouseLeave={e => { e.currentTarget.style.color = Theme.colors.tertiaryText; }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={addDraft}
            style={{
              background: 'transparent',
              border: `1px dashed ${Theme.colors.cardBorder}`,
              borderRadius: '4px',
              color: Theme.colors.secondaryText,
              fontSize: '11px',
              fontWeight: 600,
              padding: '5px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'center',
              marginTop: '2px',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = Theme.colors.accentAmber; e.currentTarget.style.color = Theme.colors.accentAmber; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = Theme.colors.cardBorder; e.currentTarget.style.color = Theme.colors.secondaryText; }}
          >
            + Add Rule
          </button>
        </div>
      )}
    </div>
  );
};
