import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Theme } from '../models/Theme';
import { useNotes } from '../hooks/useNotes';
import { ApiService } from '../services/ApiService';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}


function formatDayNum(dateStr) {
  return new Date(dateStr + 'T12:00:00').getDate();
}

function formatWeekday(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}


const TYPE_STYLES = {
  audio: { bg: Theme.colors.accentPurpleDim, color: Theme.colors.accentPurple, label: 'Audio' },
  text: { bg: Theme.colors.accentBlueDim, color: Theme.colors.accentBlue, label: 'Text' },
  image: { bg: 'rgba(52, 211, 153, 0.10)', color: '#34d399', label: 'Image' },
};

const TypeBadge = ({ type }) => {
  const s = TYPE_STYLES[type] || TYPE_STYLES.text;
  return (
    <span style={{
      fontSize: '9px',
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: Theme.radius.xs,
      background: s.bg,
      color: s.color,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    }}>
      {s.label}
    </span>
  );
};

const TickerPill = ({ ticker, onClick }) => (
  <span
    onClick={() => onClick(ticker)}
    style={{
      fontSize: '10px',
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: Theme.radius.full,
      background: Theme.colors.accentBlueDim,
      color: Theme.colors.accentBlue,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      border: `1px solid ${Theme.colors.accentBlueBorder}`,
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = Theme.colors.accentBlue;
      e.currentTarget.style.color = '#fff';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = Theme.colors.accentBlueDim;
      e.currentTarget.style.color = Theme.colors.accentBlue;
    }}
  >
    ${ticker}
  </span>
);

const TagPill = ({ tag }) => (
  <span style={{
    fontSize: '9px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: Theme.radius.full,
    background: 'rgba(255,255,255,0.04)',
    color: Theme.colors.secondaryText,
    border: `1px solid ${Theme.colors.cardBorder}`,
  }}>
    {tag}
  </span>
);

const NoteCard = ({ note, onTickerClick, onDelete, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState([]);
  const [saving, setSaving] = useState(false);
  const hasSummary = note.summary && note.summary.length > 0;
  const isLong = note.content && note.content.length > 300;

  const startEditing = () => {
    setEditedSummary([...note.summary]);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditedSummary([]);
  };

  const handleSave = async () => {
    const cleaned = editedSummary.filter(p => p.trim().length > 0);
    if (cleaned.length === 0) return;
    try {
      setSaving(true);
      await onUpdate(note.id, { summary: cleaned });
      setEditing(false);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updatePoint = (idx, value) => {
    setEditedSummary(prev => prev.map((p, i) => i === idx ? value : p));
  };

  const removePoint = (idx) => {
    setEditedSummary(prev => prev.filter((_, i) => i !== idx));
  };

  const addPoint = () => {
    setEditedSummary(prev => [...prev, '']);
  };

  return (
    <div className="card" style={{ padding: '16px', position: 'relative' }}>
      <div className="flex items-center gap-2" style={{ marginBottom: '10px', flexWrap: 'wrap' }}>
        <TypeBadge type={note.type} />
        <span style={{ fontSize: '12px', fontWeight: 700, color: Theme.colors.primaryText, flex: 1 }}>
          {note.title}
        </span>
        <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>
          {formatTime(note.createdAt)}
        </span>
        <span
          onClick={() => onDelete(note.id)}
          style={{
            fontSize: '10px',
            color: Theme.colors.tertiaryText,
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: Theme.radius.xs,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = Theme.colors.bearishRed;
            e.currentTarget.style.background = Theme.colors.bearishRedBg;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = Theme.colors.tertiaryText;
            e.currentTarget.style.background = 'transparent';
          }}
        >
          Delete
        </span>
      </div>

      {/* Summary bullet points */}
      {hasSummary && (
        <div style={{ marginBottom: note.content ? '8px' : 0 }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '6px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: Theme.colors.tertiaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Key Points
            </span>
            {!editing && (
              <span
                onClick={startEditing}
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: Theme.colors.tertiaryText,
                  cursor: 'pointer',
                  padding: '1px 6px',
                  borderRadius: Theme.radius.xs,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = Theme.colors.accentBlue;
                  e.currentTarget.style.background = Theme.colors.accentBlueDim;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = Theme.colors.tertiaryText;
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Edit
              </span>
            )}
          </div>

          {editing ? (
            <div>
              {editedSummary.map((point, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'flex-start' }}>
                  <span style={{ color: Theme.colors.accentBlue, flexShrink: 0, fontWeight: 700, fontSize: '12px', lineHeight: '32px' }}>•</span>
                  <textarea
                    value={point}
                    onChange={e => updatePoint(i, e.target.value)}
                    rows={1}
                    style={{
                      flex: 1,
                      background: Theme.colors.inputBackground,
                      border: `1px solid ${Theme.colors.cardBorder}`,
                      borderRadius: Theme.radius.xs,
                      color: Theme.colors.primaryText,
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      lineHeight: '1.6',
                      resize: 'vertical',
                      minHeight: '32px',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = Theme.colors.borderActive}
                    onBlur={e => e.currentTarget.style.borderColor = Theme.colors.cardBorder}
                  />
                  <span
                    onClick={() => removePoint(i)}
                    style={{
                      fontSize: '14px',
                      color: Theme.colors.tertiaryText,
                      cursor: 'pointer',
                      padding: '4px 4px',
                      lineHeight: '24px',
                      flexShrink: 0,
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = Theme.colors.bearishRed}
                    onMouseLeave={e => e.currentTarget.style.color = Theme.colors.tertiaryText}
                  >
                    x
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2" style={{ marginTop: '8px' }}>
                <span
                  onClick={addPoint}
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: Theme.colors.accentBlue,
                    cursor: 'pointer',
                    padding: '3px 10px',
                    borderRadius: Theme.radius.xs,
                    border: `1px dashed ${Theme.colors.accentBlueBorder}`,
                    transition: 'all 0.15s ease',
                  }}
                >
                  + Add point
                </span>
                <div style={{ flex: 1 }} />
                <span
                  onClick={cancelEditing}
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: Theme.colors.tertiaryText,
                    cursor: 'pointer',
                    padding: '4px 12px',
                    borderRadius: Theme.radius.xs,
                    transition: 'all 0.15s ease',
                  }}
                >
                  Cancel
                </span>
                <span
                  onClick={handleSave}
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#fff',
                    cursor: saving ? 'default' : 'pointer',
                    padding: '4px 14px',
                    borderRadius: Theme.radius.xs,
                    background: saving ? Theme.colors.tertiaryText : Theme.colors.accentBlue,
                    opacity: saving ? 0.6 : 1,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </span>
              </div>
            </div>
          ) : (
            <>
              {note.summary.map((point, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '5px',
                  fontSize: '12px',
                  color: Theme.colors.secondaryText,
                  lineHeight: 1.6,
                }}>
                  <span style={{ color: Theme.colors.accentBlue, flexShrink: 0, fontWeight: 700 }}>•</span>
                  <span>{point}</span>
                </div>
              ))}
            </>
          )}
          {note.content && !editing && (
            <span
              onClick={() => setShowTranscript(!showTranscript)}
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: Theme.colors.tertiaryText,
                cursor: 'pointer',
                marginTop: '6px',
                display: 'inline-block',
              }}
            >
              {showTranscript ? 'Hide original' : 'Show original'}
            </span>
          )}
        </div>
      )}

      {/* Full content / transcript */}
      {(!hasSummary || showTranscript) && note.content && (
        <>
          <div style={{
            fontSize: '12px',
            lineHeight: '1.7',
            color: Theme.colors.secondaryText,
            whiteSpace: 'pre-wrap',
            maxHeight: expanded || !isLong ? 'none' : '120px',
            overflow: 'hidden',
            position: 'relative',
            ...(hasSummary ? {
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: `1px solid ${Theme.colors.borderSubtle}`,
            } : {}),
          }}>
            {note.content}
            {isLong && !expanded && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '40px',
                background: `linear-gradient(transparent, ${Theme.colors.cardBackground})`,
              }} />
            )}
          </div>
          {isLong && (
            <span
              onClick={() => setExpanded(!expanded)}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: Theme.colors.accentBlue,
                cursor: 'pointer',
                marginTop: '6px',
                display: 'inline-block',
              }}
            >
              {expanded ? 'Show less' : 'Show more'}
            </span>
          )}
        </>
      )}

      {/* Images */}
      {note.images && note.images.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: note.images.length === 1 ? '1fr' : 'repeat(2, 1fr)',
          gap: '8px',
          marginTop: '12px',
        }}>
          {note.images.map((img, i) => (
            <a
              key={i}
              href={`/api/uploads/${img}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={`/api/uploads/${img}`}
                alt={`Note image ${i + 1}`}
                style={{
                  width: '100%',
                  borderRadius: Theme.radius.sm,
                  border: `1px solid ${Theme.colors.cardBorder}`,
                  cursor: 'pointer',
                  display: 'block',
                }}
              />
            </a>
          ))}
        </div>
      )}

      {((note.tickers && note.tickers.length > 0) || (note.tags && note.tags.length > 0)) && (
        <div className="flex items-center gap-1" style={{ marginTop: '12px', flexWrap: 'wrap' }}>
          {note.tickers?.map(t => (
            <TickerPill key={t} ticker={t} onClick={onTickerClick} />
          ))}
          {note.tags?.map(t => (
            <TagPill key={t} tag={t} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── 3-day Gemini Notes Summary ────────────────────────────────────────────────
const NotesSummary = ({ onRefreshTrigger }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setSummary(null);
    setError(null);
    try {
      const url = `/api/notes/summary/stream${force ? '?force=true' : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const obj = JSON.parse(line.slice(6));
            if (obj.text) { text = obj.text; setSummary(text); }
            if (obj.token) { text += obj.token; setSummary(text); }
            if (obj.error) throw new Error(obj.error);
            if (obj.done) setLoaded(true);
          } catch (e) {
            if (!(e instanceof SyntaxError)) throw e;
          }
        }
      }
      setLoaded(true);
    } catch (e) {
      setError(e.message);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load when parent signals a note was added
  useEffect(() => {
    if (onRefreshTrigger > 0) load(true);
  }, [onRefreshTrigger, load]);

  if (!loaded && !loading) {
    return (
      <div className="card" style={{ padding: '14px 16px', borderLeft: `3px solid ${Theme.colors.accentPurple}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: Theme.colors.accentPurple, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              3-Day Summary
            </span>
            <div style={{ fontSize: '10px', color: Theme.colors.tertiaryText, marginTop: '2px' }}>
              AI summary of your last 3 days with notes
            </div>
          </div>
          <button
            onClick={() => load(false)}
            style={{
              background: Theme.colors.accentPurpleDim,
              border: `1px solid rgba(167, 139, 250, 0.25)`,
              borderRadius: '4px',
              color: Theme.colors.accentPurple,
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
    <div className="card" style={{ padding: '14px 16px', borderLeft: `3px solid ${Theme.colors.accentPurple}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: summary ? '12px' : 0 }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: Theme.colors.accentPurple, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          3-Day Summary
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
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = Theme.colors.accentPurple; e.currentTarget.style.color = Theme.colors.accentPurple; } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = Theme.colors.cardBorder; e.currentTarget.style.color = Theme.colors.secondaryText; }}
        >
          {loading ? 'Generating...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: '11px', color: Theme.colors.bearishRed }}>{error}</div>
      )}

      {loading && !summary && (
        <div style={{ fontSize: '11px', color: Theme.colors.tertiaryText }}>Analyzing 3 days of notes...</div>
      )}

      {summary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {summary.split('\n\n').filter(Boolean).map((para, i) => (
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

      {!loading && loaded && !summary && !error && (
        <div style={{ fontSize: '11px', color: Theme.colors.tertiaryText }}>No notes found in the last 3 days.</div>
      )}
    </div>
  );
};

// ── Yesterday's Watchlist ─────────────────────────────────────────────────────
const YesterdayWatchlist = ({ onTickerClick }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    ApiService.getYesterdayWatchlist()
      .then(res => setData(res))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ padding: '16px', borderLeft: `3px solid ${Theme.colors.accentPurple}` }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: Theme.colors.tertiaryText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          Yesterday's Watchlist
        </div>
        <div style={{ fontSize: '11px', color: Theme.colors.tertiaryText }}>Loading...</div>
      </div>
    );
  }

  if (error || !data || data.tickers.length === 0) return null;

  return (
    <div className="card" style={{ padding: '16px', borderLeft: `3px solid ${Theme.colors.accentPurple}` }}>
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: Theme.colors.primaryText, marginBottom: '2px' }}>
          Yesterday's Watchlist
        </div>
        <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>
          Tickers from {data.date} notes
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {data.tickers.map(({ ticker, price, changePct, preMarketChangePct }) => {
          const isUp = changePct > 0;
          const isDown = changePct < 0;
          const changeColor = isUp ? Theme.colors.bullishGreen : isDown ? Theme.colors.bearishRed : Theme.colors.secondaryText;
          return (
            <div
              key={ticker}
              onClick={() => onTickerClick?.(ticker)}
              style={{
                padding: '6px 10px',
                background: Theme.colors.surfaceSubtle,
                border: `1px solid ${Theme.colors.borderSubtle}`,
                borderRadius: Theme.radius.sm,
                cursor: 'pointer',
                minWidth: '80px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: Theme.colors.primaryText }}>{ticker}</div>
              {price != null && (
                <div style={{ fontSize: '10px', color: Theme.colors.secondaryText }}>${price.toFixed(2)}</div>
              )}
              {changePct != null && (
                <div style={{ fontSize: '10px', fontWeight: 600, color: changeColor }}>
                  {changePct > 0 ? '+' : ''}{changePct.toFixed(2)}%
                </div>
              )}
              {preMarketChangePct !== null && preMarketChangePct !== undefined && (
                <div style={{ fontSize: '9px', color: Theme.colors.tertiaryText }}>
                  pre: {preMarketChangePct > 0 ? '+' : ''}{preMarketChangePct.toFixed(2)}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BRIEF_SECTIONS = [
  { key: 'Active Setups', icon: '▶', color: Theme.colors.bullishGreen },
  { key: 'Key Levels', icon: '◎', color: Theme.colors.accentBlue },
  { key: 'Catalysts', icon: '⚡', color: Theme.colors.accentAmber },
  { key: 'Market Bias', icon: '◈', color: Theme.colors.accentPurple },
];

const BriefSection = ({ brief, briefLoading, onTickerClick }) => {
  if (briefLoading) {
    return (
      <div className="card" style={{ padding: '16px', borderLeft: `3px solid ${Theme.colors.accentBlue}` }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: Theme.colors.primaryText, marginBottom: '8px' }}>
          Brief
        </div>
        <div style={{ fontSize: '11px', color: Theme.colors.tertiaryText }}>
          Generating consolidated brief...
        </div>
      </div>
    );
  }

  if (!brief) return null;

  // Extract ticker mentions from text for clickable highlighting
  const renderLine = (line) => {
    const parts = line.split(/(\b[A-Z]{2,5}\b)/g);
    return parts.map((part, i) => {
      // Check if this looks like a ticker (all caps, 2-5 chars, common ticker patterns)
      if (/^[A-Z]{2,5}$/.test(part) && !/^(THE|AND|FOR|WITH|FROM|ALSO|NEAR|HOLD|STOP|LONG|SHORT|BUY|SELL|NOT|BUT|ALL|MAY|NOW|ABOVE|BELOW|INTO|BACK|THAN|WILL|THIS|BEEN|ONLY|OVER)$/.test(part)) {
        return (
          <span
            key={i}
            onClick={() => onTickerClick(part)}
            style={{
              fontWeight: 700,
              color: Theme.colors.accentBlue,
              cursor: 'pointer',
              borderBottom: `1px dotted ${Theme.colors.accentBlueBorder}`,
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="card" style={{ padding: '16px', borderLeft: `3px solid ${Theme.colors.accentBlue}` }}>
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: Theme.colors.primaryText, marginBottom: '2px' }}>
          Brief
        </div>
        <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>
          Consolidated from last 4 days of notes
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {BRIEF_SECTIONS.map(({ key, icon, color }) => {
          const items = brief[key];
          if (!items || items.length === 0) return null;
          return (
            <div key={key}>
              <div className="flex items-center gap-1" style={{ marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color }}>{icon}</span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>
                  {key}
                </span>
              </div>
              <div style={{
                padding: '8px 12px',
                background: Theme.colors.surfaceSubtle,
                borderRadius: Theme.radius.sm,
                border: `1px solid ${Theme.colors.borderSubtle}`,
              }}>
                {items.map((item, i) => (
                  <div key={i} style={{
                    fontSize: '11px',
                    color: Theme.colors.secondaryText,
                    lineHeight: 1.6,
                    marginBottom: i < items.length - 1 ? '4px' : 0,
                    display: 'flex',
                    gap: '6px',
                  }}>
                    <span style={{ color, flexShrink: 0, fontWeight: 700, fontSize: '10px', marginTop: '2px' }}>•</span>
                    <span>{renderLine(item)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Notes Q&A (floating chat panel) ───────────────────────────────────────────
const NotesChat = () => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState([]); // [{question, answer}] answer=null means pending
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const ask = useCallback(async () => {
    const q = question.trim();
    if (!q) return;
    setQuestion('');
    const msgId = Date.now();
    setHistory(prev => [...prev, { id: msgId, question: q, answer: null }]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
    try {
      await ApiService.askNotes(q, (token) => {
        setHistory(prev => prev.map(h =>
          h.id === msgId ? { ...h, answer: (h.answer || '') + token } : h
        ));
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    } catch (e) {
      setHistory(prev => prev.map(h =>
        h.id === msgId ? { ...h, answer: `Error: ${e.message}` } : h
      ));
    } finally {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [question]);

  const handleKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); ask(); }
  };

  return (
    <>
      {/* Toggle button — visible when panel is closed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Ask your notes"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: Theme.colors.accentBlue,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
            zIndex: 1000,
          }}
        >
          <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        </button>
      )}

      {/* Floating chat panel */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 340,
          height: 480,
          background: Theme.colors.cardBackground,
          border: `1px solid ${Theme.colors.cardBorder}`,
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 36px rgba(0,0,0,0.55)',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '11px 14px',
            borderBottom: `1px solid ${Theme.colors.cardBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: Theme.colors.primaryText, letterSpacing: '0.02em' }}>
              Ask your notes
            </span>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {history.length > 0 && (
                <span
                  onClick={() => setHistory([])}
                  style={{ fontSize: '11px', color: Theme.colors.tertiaryText, cursor: 'pointer' }}
                >
                  Clear
                </span>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: Theme.colors.tertiaryText, fontSize: '18px',
                  lineHeight: 1, padding: '0 2px', fontFamily: 'inherit',
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Message area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            {history.length === 0 && (
              <div style={{
                color: Theme.colors.tertiaryText,
                fontSize: '12px',
                textAlign: 'center',
                marginTop: '60px',
                lineHeight: 1.6,
              }}>
                Ask anything about your notes.<br />
                <span style={{ fontSize: '11px', opacity: 0.7 }}>
                  e.g. "What was my META thesis?"
                </span>
              </div>
            )}
            {history.map((h) => (
              <div key={h.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* Question bubble */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{
                    background: Theme.colors.accentBlue,
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 500,
                    padding: '7px 12px',
                    borderRadius: '12px 12px 2px 12px',
                    maxWidth: '85%',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}>
                    {h.question}
                  </div>
                </div>
                {/* Answer bubble */}
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    background: Theme.colors.background || Theme.colors.cardBackground,
                    border: `1px solid ${Theme.colors.cardBorder}`,
                    color: h.answer === null ? Theme.colors.tertiaryText : Theme.colors.secondaryText,
                    fontSize: '12px',
                    padding: '8px 12px',
                    borderRadius: '2px 12px 12px 12px',
                    maxWidth: '90%',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {h.answer === null ? (
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontStyle: 'italic' }}>Thinking</span>
                        {[0, 1, 2].map(j => (
                          <div key={j} style={{
                            width: '4px', height: '4px', borderRadius: '50%',
                            background: Theme.colors.tertiaryText,
                            animation: `pulse 1.2s ease-in-out ${j * 0.2}s infinite`,
                          }} />
                        ))}
                      </div>
                    ) : h.answer}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <div style={{
            padding: '10px 12px',
            borderTop: `1px solid ${Theme.colors.cardBorder}`,
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about your notes…"
              style={{
                flex: 1,
                background: Theme.colors.inputBackground,
                border: `1px solid ${Theme.colors.cardBorder}`,
                borderRadius: Theme.radius.sm,
                color: Theme.colors.primaryText,
                padding: '7px 10px',
                fontSize: '12px',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={e => e.currentTarget.style.borderColor = Theme.colors.borderActive}
              onBlur={e => e.currentTarget.style.borderColor = Theme.colors.cardBorder}
            />
            <button
              onClick={ask}
              disabled={!question.trim()}
              style={{
                background: question.trim() ? Theme.colors.accentBlue : Theme.colors.cardBorder,
                border: 'none',
                borderRadius: Theme.radius.sm,
                color: '#fff',
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: question.trim() ? 'pointer' : 'default',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s ease',
              }}
            >
              Ask
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const AUDIO_STAGES = ['transcribing', 'extracting', 'summarizing', 'saving'];
const STAGE_LABELS = {
  transcribing: 'Transcribing audio...',
  extracting: 'Extracting tickers...',
  summarizing: 'Summarizing...',
  saving: 'Saving note...',
  done: 'Done!',
};

const AddNoteForm = ({ onSubmit, uploading, uploadStage, uploadProgress, onUpload, onUploadImages }) => {
  const [mode, setMode] = useState('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [imagePreview, setImagePreview] = useState([]);
  const fileRef = useRef(null);
  const imageRef = useRef(null);

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit({
      title: title.trim() || undefined,
      content: content.trim(),
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
    setTitle('');
    setContent('');
    setTags('');
  };

  const handleFile = (file) => {
    if (!file) return;
    onUpload(file, title.trim() || undefined);
    setTitle('');
  };

  const handleImageFiles = (files) => {
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    // Show previews
    const previews = imageFiles.map(f => ({ file: f, url: URL.createObjectURL(f) }));
    setImagePreview(prev => [...prev, ...previews]);
  };

  const handleImageSubmit = () => {
    if (imagePreview.length === 0) return;
    const files = imagePreview.map(p => p.file);
    onUploadImages(files, title.trim() || undefined, content.trim() || undefined);
    setTitle('');
    setContent('');
    setImagePreview([]);
  };

  const removeImage = (idx) => {
    setImagePreview(prev => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (mode === 'image') {
      handleImageFiles(e.dataTransfer.files);
    } else {
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    }
  };

  const inputStyle = {
    background: Theme.colors.inputBackground,
    border: `1px solid ${Theme.colors.cardBorder}`,
    borderRadius: Theme.radius.sm,
    color: Theme.colors.primaryText,
    padding: '10px 12px',
    fontSize: '12px',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s ease',
  };

  return (
    <div className="card" style={{ padding: '16px' }}>
      {/* Mode toggle */}
      <div className="flex items-center gap-1" style={{ marginBottom: '14px' }}>
        {[['text', 'Text Note'], ['image', 'Image'], ['audio', 'Audio']].map(([m, label]) => (
          <span
            key={m}
            onClick={() => setMode(m)}
            style={{
              fontSize: '11px',
              fontWeight: mode === m ? 700 : 500,
              padding: '5px 14px',
              borderRadius: Theme.radius.sm,
              background: mode === m ? Theme.colors.accentBlue : 'transparent',
              color: mode === m ? '#fff' : Theme.colors.secondaryText,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Title (shared) */}
      <input
        type="text"
        placeholder="Title (optional)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={{ ...inputStyle, marginBottom: '10px' }}
        onFocus={e => e.currentTarget.style.borderColor = Theme.colors.borderActive}
        onBlur={e => e.currentTarget.style.borderColor = Theme.colors.cardBorder}
      />

      {mode === 'text' && (
        <form onSubmit={handleTextSubmit}>
          <textarea
            placeholder="Write your trading notes... Mention tickers like $NVDA or AAPL and they'll be auto-extracted."
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            style={{
              ...inputStyle,
              resize: 'vertical',
              minHeight: '80px',
              lineHeight: '1.6',
            }}
            onFocus={e => e.currentTarget.style.borderColor = Theme.colors.borderActive}
            onBlur={e => e.currentTarget.style.borderColor = Theme.colors.cardBorder}
          />
          <input
            type="text"
            placeholder="Tags (comma separated)"
            value={tags}
            onChange={e => setTags(e.target.value)}
            style={{ ...inputStyle, marginTop: '10px' }}
            onFocus={e => e.currentTarget.style.borderColor = Theme.colors.borderActive}
            onBlur={e => e.currentTarget.style.borderColor = Theme.colors.cardBorder}
          />
          <button
            type="submit"
            disabled={!content.trim()}
            style={{
              marginTop: '12px',
              background: content.trim() ? Theme.colors.accentBlue : Theme.colors.tertiaryText,
              border: 'none',
              borderRadius: Theme.radius.sm,
              color: '#fff',
              padding: '9px 20px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: content.trim() ? 'pointer' : 'default',
              fontFamily: 'inherit',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              opacity: content.trim() ? 1 : 0.5,
              transition: 'all 0.15s ease',
            }}
          >
            Save Note
          </button>
        </form>
      )}

      {mode === 'image' && (
        <div>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => imageRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#34d399' : Theme.colors.cardBorder}`,
              borderRadius: Theme.radius.md,
              padding: imagePreview.length > 0 ? '16px' : '32px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'rgba(52, 211, 153, 0.06)' : 'transparent',
              transition: 'all 0.2s ease',
            }}
          >
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => handleImageFiles(e.target.files)}
            />
            {imagePreview.length > 0 ? (
              <div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: '8px',
                  marginBottom: '10px',
                }}>
                  {imagePreview.map((p, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img
                        src={p.url}
                        alt={`Preview ${i + 1}`}
                        style={{
                          width: '100%',
                          borderRadius: Theme.radius.sm,
                          border: `1px solid ${Theme.colors.cardBorder}`,
                          display: 'block',
                        }}
                      />
                      <span
                        onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        x
                      </span>
                    </div>
                  ))}
                </div>
                <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>
                  Click to add more images
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span style={{ fontSize: '20px' }}>&#128247;</span>
                <span style={{ fontSize: '12px', color: Theme.colors.secondaryText, fontWeight: 600 }}>
                  Drop images or click to upload
                </span>
                <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>
                  PNG, JPG, GIF — multiple allowed
                </span>
              </div>
            )}
          </div>

          {/* Caption / note text for images */}
          {imagePreview.length > 0 && (
            <div>
              <textarea
                placeholder="Add a caption or notes (optional)... Mention tickers like $NVDA"
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={2}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  minHeight: '50px',
                  lineHeight: '1.6',
                  marginTop: '10px',
                }}
                onFocus={e => e.currentTarget.style.borderColor = Theme.colors.borderActive}
                onBlur={e => e.currentTarget.style.borderColor = Theme.colors.cardBorder}
              />
              <button
                onClick={handleImageSubmit}
                disabled={uploading}
                style={{
                  marginTop: '12px',
                  background: uploading ? Theme.colors.tertiaryText : '#34d399',
                  border: 'none',
                  borderRadius: Theme.radius.sm,
                  color: '#fff',
                  padding: '9px 20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: uploading ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  opacity: uploading ? 0.5 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                {uploading ? 'Uploading...' : `Upload ${imagePreview.length} Image${imagePreview.length > 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'audio' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? Theme.colors.accentBlue : Theme.colors.cardBorder}`,
            borderRadius: Theme.radius.md,
            padding: '32px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? Theme.colors.accentBlueDim : 'transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-3" style={{ width: '100%', padding: '8px 0' }}>
              <div style={{ fontSize: '20px' }}>&#127908;</div>
              <span style={{ fontSize: '12px', color: Theme.colors.accentBlue, fontWeight: 600 }}>
                {STAGE_LABELS[uploadStage] || 'Processing...'}
              </span>
              {/* Progress bar */}
              <div style={{
                width: '100%',
                maxWidth: '240px',
                height: '4px',
                borderRadius: '2px',
                background: Theme.colors.cardBorder,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  borderRadius: '2px',
                  background: Theme.colors.accentBlue,
                  width: `${uploadProgress || 0}%`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              {/* Stage steps */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {AUDIO_STAGES.map((stage, i) => {
                  const currentIdx = AUDIO_STAGES.indexOf(uploadStage);
                  const done = i < currentIdx;
                  const active = i === currentIdx;
                  return (
                    <React.Fragment key={stage}>
                      {i > 0 && (
                        <div style={{
                          width: '16px',
                          height: '1px',
                          background: done ? Theme.colors.accentBlue : Theme.colors.cardBorder,
                        }} />
                      )}
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: done
                          ? Theme.colors.accentBlue
                          : active
                            ? Theme.colors.accentBlue
                            : Theme.colors.cardBorder,
                        opacity: done ? 1 : active ? 1 : 0.4,
                        boxShadow: active ? `0 0 4px ${Theme.colors.accentBlue}` : 'none',
                        transition: 'all 0.3s ease',
                      }} />
                    </React.Fragment>
                  );
                })}
              </div>
              <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>
                {uploadProgress > 0 ? `${uploadProgress}%` : 'Starting...'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span style={{ fontSize: '20px' }}>&#127908;</span>
              <span style={{ fontSize: '12px', color: Theme.colors.secondaryText, fontWeight: 600 }}>
                Drop audio file or click to upload
              </span>
              <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>
                Supports m4a, mp3, wav, webm
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Today's Game Plan (AI-generated from today's notes) ──────────────────────
const BIAS_CONFIG = {
  bullish: { label: '▲ Bullish', color: Theme.colors.bullishGreen, bg: Theme.colors.bullishGreenBg, border: Theme.colors.bullishGreenBorder },
  bearish: { label: '▼ Bearish', color: Theme.colors.bearishRed, bg: Theme.colors.bearishRedBg, border: Theme.colors.bearishRedBorder },
  neutral: { label: '◈ Neutral', color: Theme.colors.accentAmber, bg: 'rgba(245, 166, 35, 0.08)', border: 'rgba(245, 166, 35, 0.25)' },
};

const PlanSection = ({ label, items, color }) => {
  if (!items?.length) return null;
  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 700, color: Theme.colors.tertiaryText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: '7px', fontSize: '12px', color: Theme.colors.secondaryText, lineHeight: 1.6 }}>
            <span style={{ color: color || Theme.colors.accentBlue, flexShrink: 0, fontWeight: 700 }}>•</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TodayGamePlan = ({ todayNoteCount, onTickerClick }) => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiService.getGamePlan();
      if (!data.hasNotes) {
        setError('no_notes');
      } else if (data.plan) {
        setPlan(data.plan);
        setGenerated(true);
      } else {
        setError('Generation failed — try again');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const bias = plan ? (BIAS_CONFIG[plan.bias] || BIAS_CONFIG.neutral) : null;
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="card" style={{
      padding: '16px',
      borderLeft: `3px solid ${Theme.colors.accentAmber}`,
      background: 'linear-gradient(135deg, rgba(245, 166, 35, 0.04) 0%, transparent 60%)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: plan ? '14px' : '10px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: Theme.colors.primaryText, letterSpacing: '-0.01em' }}>
            Today's Game Plan
          </div>
          <div style={{ fontSize: '10px', color: Theme.colors.tertiaryText, marginTop: '2px' }}>{dateStr}</div>
        </div>
        {generated && (
          <span
            onClick={generate}
            style={{ fontSize: '10px', fontWeight: 600, color: Theme.colors.tertiaryText, cursor: 'pointer', padding: '3px 8px', borderRadius: Theme.radius.xs, transition: 'color 0.15s ease' }}
            onMouseEnter={e => e.currentTarget.style.color = Theme.colors.accentBlue}
            onMouseLeave={e => e.currentTarget.style.color = Theme.colors.tertiaryText}
          >
            ↺ Regenerate
          </span>
        )}
      </div>

      {/* States */}
      {!generated && !loading && error !== 'no_notes' && (
        <div>
          {todayNoteCount === 0 ? (
            <div style={{ fontSize: '12px', color: Theme.colors.tertiaryText, padding: '4px 0 10px' }}>
              No notes for today yet — add some analysis below, then generate your game plan.
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: Theme.colors.secondaryText, padding: '4px 0 10px' }}>
              {todayNoteCount} note{todayNoteCount > 1 ? 's' : ''} posted today. Ready to generate.
            </div>
          )}
          <button
            onClick={generate}
            disabled={todayNoteCount === 0}
            style={{
              background: todayNoteCount === 0 ? Theme.colors.tertiaryText : Theme.colors.accentAmber,
              border: 'none', borderRadius: Theme.radius.sm,
              color: todayNoteCount === 0 ? Theme.colors.secondaryText : '#000',
              padding: '8px 18px', fontSize: '11px', fontWeight: 800,
              cursor: todayNoteCount === 0 ? 'default' : 'pointer',
              fontFamily: 'inherit', letterSpacing: '0.04em', textTransform: 'uppercase',
              opacity: todayNoteCount === 0 ? 0.4 : 1, transition: 'all 0.15s ease',
            }}
          >
            Generate Game Plan
          </button>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0' }}>
          <div style={{
            width: '14px', height: '14px',
            border: `2px solid ${Theme.colors.cardBorder}`,
            borderTop: `2px solid ${Theme.colors.accentAmber}`,
            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ fontSize: '12px', color: Theme.colors.secondaryText }}>Generating from today's notes...</span>
        </div>
      )}

      {error === 'no_notes' && (
        <div style={{ fontSize: '12px', color: Theme.colors.tertiaryText, padding: '4px 0' }}>
          No notes for today yet — add some analysis below, then generate your game plan.
        </div>
      )}

      {error && error !== 'no_notes' && (
        <div style={{ fontSize: '12px', color: Theme.colors.bearishRed }}>{error}</div>
      )}

      {/* Generated plan */}
      {plan && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Bias badge */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{
              fontSize: '11px', fontWeight: 800, padding: '4px 12px',
              borderRadius: Theme.radius.full, whiteSpace: 'nowrap',
              background: bias.bg, color: bias.color, border: `1px solid ${bias.border}`,
            }}>
              {bias.label}
            </span>
            {plan.biasReason && (
              <span style={{ fontSize: '12px', color: Theme.colors.secondaryText, lineHeight: 1.6, paddingTop: '2px' }}>
                {plan.biasReason}
              </span>
            )}
          </div>

          <PlanSection label="Key Levels" items={plan.keyLevels} color={Theme.colors.accentBlue} />
          <PlanSection label="Setups to Watch" items={plan.setups} color={Theme.colors.bullishGreen} />
          <PlanSection label="Risks" items={plan.risks} color={Theme.colors.bearishRed} />

          {/* Watchlist tickers */}
          {plan.watchlist?.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: Theme.colors.tertiaryText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Watchlist
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {plan.watchlist.map(t => (
                  <span
                    key={t}
                    onClick={() => onTickerClick && onTickerClick(t)}
                    style={{
                      fontSize: '11px', fontWeight: 700, padding: '3px 10px',
                      borderRadius: Theme.radius.full, cursor: 'pointer',
                      background: Theme.colors.accentBlueDim, color: Theme.colors.accentBlue,
                      border: `1px solid ${Theme.colors.accentBlueBorder}`,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = Theme.colors.accentBlue; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = Theme.colors.accentBlueDim; e.currentTarget.style.color = Theme.colors.accentBlue; }}
                  >
                    ${t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Day tabs sidebar (right side)
const DaySidebar = ({ notesByDate, selectedDate, onSelectDate }) => {
  if (notesByDate.length === 0) return null;

  return (
    <div style={{
      position: 'sticky',
      top: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minWidth: '56px',
    }}>
      {/* "All" tab */}
      <div
        onClick={() => onSelectDate(null)}
        style={{
          padding: '8px 6px',
          borderRadius: Theme.radius.sm,
          background: selectedDate === null ? Theme.colors.accentBlue : 'transparent',
          color: selectedDate === null ? '#fff' : Theme.colors.secondaryText,
          fontSize: '10px',
          fontWeight: selectedDate === null ? 700 : 500,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          border: `1px solid ${selectedDate === null ? Theme.colors.accentBlue : Theme.colors.cardBorder}`,
          letterSpacing: '0.03em',
        }}
      >
        All
      </div>

      {notesByDate.map(({ date, notes }) => {
        const isActive = selectedDate === date;
        const isWeekend = [0, 6].includes(new Date(date + 'T12:00:00').getDay());
        return (
          <div
            key={date}
            onClick={() => onSelectDate(date)}
            style={{
              padding: '6px 6px',
              borderRadius: Theme.radius.sm,
              background: isActive ? Theme.colors.accentBlue : 'transparent',
              color: isActive ? '#fff' : isWeekend ? Theme.colors.tertiaryText : Theme.colors.secondaryText,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              border: `1px solid ${isActive ? Theme.colors.accentBlue : Theme.colors.cardBorder}`,
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 800, lineHeight: '1.2' }}>
              {formatDayNum(date)}
            </div>
            <div style={{ fontSize: '9px', fontWeight: 600, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {formatWeekday(date)}
            </div>
            <div style={{
              fontSize: '9px',
              fontWeight: 700,
              marginTop: '2px',
              opacity: isActive ? 0.8 : 0.5,
            }}>
              {notes.length}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const TradingNotesSection = ({ onTickerClick }) => {
  const {
    notesByDate,
    loading,
    error,
    uploading,
    uploadStage,
    uploadProgress,
    brief,
    briefLoading,
    createNote,
    updateNote,
    uploadAudio,
    uploadImages,
    deleteNote,
  } = useNotes(5);

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [summaryRefreshTrigger, setSummaryRefreshTrigger] = useState(0);

  // Count today's notes (excludes plan type to avoid circular dependency)
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayNoteCount = notesByDate
    .find(({ date }) => date === todayStr)
    ?.notes.filter(n => n.type !== 'plan').length ?? 0;

  // Collect all unique tickers across all notes, sorted alphabetically
  const allTickers = useMemo(() => {
    const tickerSet = new Set();
    notesByDate.forEach(({ notes }) => {
      notes.forEach(note => {
        note.tickers?.forEach(t => tickerSet.add(t));
      });
    });
    return Array.from(tickerSet).sort();
  }, [notesByDate]);

  const filteredNotesByDate = useMemo(() => {
    // First filter by date
    const byDate = selectedDate === null
      ? notesByDate
      : notesByDate.filter(({ date }) => date === selectedDate);

    // Then filter by ticker if one is selected
    if (!selectedTicker) return byDate;
    return byDate
      .map(({ date, notes }) => ({
        date,
        notes: notes.filter(note => note.tickers?.includes(selectedTicker)),
      }))
      .filter(({ notes }) => notes.length > 0);
  }, [notesByDate, selectedDate, selectedTicker]);

  const handleCreate = async (data) => {
    try {
      await createNote(data);
      setSummaryRefreshTrigger(t => t + 1);
    } catch (err) {
      alert('Failed to save note: ' + err.message);
    }
  };

  const handleUpload = async (file, title) => {
    try {
      await uploadAudio(file, title);
    } catch (err) {
      alert('Failed to transcribe: ' + err.message);
    }
  };

  const handleUploadImages = async (files, title, content) => {
    try {
      await uploadImages(files, title, content);
    } catch (err) {
      alert('Failed to upload images: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      setDeleteError(null);
      await deleteNote(id);
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="card" style={{ padding: '20px' }}>
            <div className="skeleton" style={{ width: '40%', height: '12px', marginBottom: '12px' }} />
            <div className="skeleton" style={{ width: '90%', height: '10px', marginBottom: '8px' }} />
            <div className="skeleton" style={{ width: '60%', height: '10px' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <div style={{
          fontSize: '18px',
          fontWeight: 800,
          color: Theme.colors.primaryText,
          letterSpacing: '-0.02em',
          marginBottom: '4px',
        }}>
          Journal
        </div>
        <span style={{ fontSize: '11px', color: Theme.colors.tertiaryText }}>
          Inner Circle journal — last 5 days
        </span>
      </div>

      {error && (
        <div className="card" style={{
          padding: '12px 16px',
          background: Theme.colors.bearishRedBg,
          borderColor: Theme.colors.bearishRedBorder,
        }}>
          <span style={{ fontSize: '12px', color: Theme.colors.bearishRed }}>{error}</span>
        </div>
      )}

      {deleteError && (
        <div className="card" style={{
          padding: '12px 16px',
          background: Theme.colors.bearishRedBg,
          borderColor: Theme.colors.bearishRedBorder,
        }}>
          <span style={{ fontSize: '12px', color: Theme.colors.bearishRed }}>Delete failed: {deleteError}</span>
        </div>
      )}

      {/* Today's Game Plan — always shown, generates from today's notes */}
      {!loading && <TodayGamePlan todayNoteCount={todayNoteCount} onTickerClick={onTickerClick} />}

      {/* 3-Day Gemini Summary */}
      {!loading && <NotesSummary onRefreshTrigger={summaryRefreshTrigger} />}

      {/* Add note button / form */}
      {showAddForm ? (
        <div style={{ position: 'relative' }}>
          <span
            onClick={() => !uploading && setShowAddForm(false)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              pointerEvents: uploading ? 'none' : 'auto',
              opacity: uploading ? 0.3 : 1,
              fontSize: '11px',
              color: Theme.colors.tertiaryText,
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: Theme.radius.xs,
              zIndex: 1,
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = Theme.colors.secondaryText}
            onMouseLeave={e => e.currentTarget.style.color = Theme.colors.tertiaryText}
          >
            ✕
          </span>
          <AddNoteForm
            onSubmit={async (data) => { await handleCreate(data); setShowAddForm(false); }}
            uploading={uploading}
            uploadStage={uploadStage}
            uploadProgress={uploadProgress}
            onUpload={async (file, title) => { await handleUpload(file, title); setShowAddForm(false); }}
            onUploadImages={async (files, title, content) => { await handleUploadImages(files, title, content); setShowAddForm(false); }}
          />
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            background: 'transparent',
            border: `1px dashed ${Theme.colors.cardBorder}`,
            borderRadius: Theme.radius.sm,
            color: Theme.colors.secondaryText,
            padding: '10px 20px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            width: '100%',
            textAlign: 'center',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = Theme.colors.accentBlue;
            e.currentTarget.style.color = Theme.colors.accentBlue;
            e.currentTarget.style.background = Theme.colors.accentBlueDim;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = Theme.colors.cardBorder;
            e.currentTarget.style.color = Theme.colors.secondaryText;
            e.currentTarget.style.background = 'transparent';
          }}
        >
          + New Note
        </button>
      )}

      {/* Yesterday's tickers with live prices */}
      <YesterdayWatchlist onTickerClick={onTickerClick} />

      {/* Summary from last 3-4 market days */}
      <BriefSection brief={brief} briefLoading={briefLoading} onTickerClick={onTickerClick} />

      {/* Ask your notes */}
      <NotesChat />

      {/* Ticker filter bar */}
      {allTickers.length > 0 && (
        <div>
          <div style={{
            fontSize: '10px',
            fontWeight: 700,
            color: Theme.colors.tertiaryText,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '8px',
          }}>
            Filter by Ticker
          </div>
          <div className="flex items-center" style={{ flexWrap: 'wrap', gap: '6px' }}>
            {/* All pill */}
            <span
              onClick={() => setSelectedTicker(null)}
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: Theme.radius.full,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: selectedTicker === null ? Theme.colors.accentBlue : 'transparent',
                color: selectedTicker === null ? '#fff' : Theme.colors.secondaryText,
                border: `1px solid ${selectedTicker === null ? Theme.colors.accentBlue : Theme.colors.cardBorder}`,
              }}
            >
              All
            </span>
            {allTickers.map(t => (
              <span
                key={t}
                onClick={() => setSelectedTicker(selectedTicker === t ? null : t)}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: Theme.radius.full,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background: selectedTicker === t ? Theme.colors.accentBlue : Theme.colors.accentBlueDim,
                  color: selectedTicker === t ? '#fff' : Theme.colors.accentBlue,
                  border: `1px solid ${selectedTicker === t ? Theme.colors.accentBlue : Theme.colors.accentBlueBorder}`,
                }}
              >
                ${t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Day tabs + Notes timeline */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {/* Day sidebar */}
        <DaySidebar
          notesByDate={notesByDate}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {/* Notes content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {filteredNotesByDate.length === 0 ? (
            <div className="card flex items-center justify-center" style={{ height: '100px' }}>
              <span style={{ fontSize: '12px', color: Theme.colors.secondaryText }}>
                {notesByDate.length === 0
                  ? 'No notes yet. Add your first note above.'
                  : selectedTicker
                  ? `No notes tagged $${selectedTicker}${selectedDate ? ' for this day' : ''}.`
                  : 'No notes for this day.'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredNotesByDate.map(({ date, notes }) => (
                <div key={date}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: Theme.colors.tertiaryText,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '8px 0 6px',
                    borderBottom: `1px solid ${Theme.colors.borderSubtle}`,
                    marginBottom: '10px',
                  }}>
                    {formatDate(date)}
                  </div>
                  <div className="flex flex-col gap-3">
                    {notes.map(note => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onTickerClick={onTickerClick}
                        onDelete={handleDelete}
                        onUpdate={updateNote}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
