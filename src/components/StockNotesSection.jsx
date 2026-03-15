import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/ApiService';
import { Theme } from '../models/Theme';

function formatDate(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

const TYPE_COLOR = {
  audio: Theme.colors.accentPurple,
  image: '#34d399',
  text: Theme.colors.accentBlue,
  plan: Theme.colors.accentAmber,
};

const TYPE_LABEL = { audio: 'Audio', image: 'Image', text: 'Text', plan: 'Plan' };

const NoteItem = ({ note, onOpenJournal }) => {
  const [expanded, setExpanded] = useState(false);
  const color = TYPE_COLOR[note.type] || Theme.colors.accentBlue;
  const isLong = note.content && note.content.length > 250;

  return (
    <div style={{
      borderLeft: `2px solid ${color}`,
      paddingLeft: '12px',
      paddingBottom: '12px',
      paddingTop: '2px',
    }}>
      {/* Title + meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: Theme.colors.primaryText }}>
          {note.title || 'Note'}
        </span>
        <span style={{
          fontSize: '9px', fontWeight: 700, padding: '1px 6px',
          borderRadius: Theme.radius.xs,
          background: `${color}18`, color,
          border: `1px solid ${color}30`,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          {TYPE_LABEL[note.type] || 'Text'}
        </span>
        <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText, marginLeft: 'auto' }}>
          {formatDate(note.createdAt)}
        </span>
      </div>

      {/* AI summary bullets */}
      {note.summary?.length > 0 && (
        <div style={{ marginBottom: note.content ? '6px' : 0 }}>
          {note.summary.map((point, i) => (
            <div key={i} style={{ display: 'flex', gap: '6px', fontSize: '12px', color: Theme.colors.secondaryText, lineHeight: 1.6 }}>
              <span style={{ color, flexShrink: 0, fontWeight: 700 }}>•</span>
              <span>{point}</span>
            </div>
          ))}
        </div>
      )}

      {/* Raw content (transcript / text) */}
      {note.content && (
        <>
          <div style={{
            fontSize: '12px', color: Theme.colors.secondaryText,
            lineHeight: '1.7', whiteSpace: 'pre-wrap',
            maxHeight: expanded || !isLong ? 'none' : '80px',
            overflow: 'hidden',
            position: 'relative',
          }}>
            {note.content}
            {isLong && !expanded && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '30px',
                background: `linear-gradient(transparent, ${Theme.colors.cardBackground})`,
              }} />
            )}
          </div>
          {isLong && (
            <span
              onClick={() => setExpanded(!expanded)}
              style={{ fontSize: '11px', fontWeight: 600, color: Theme.colors.accentBlue, cursor: 'pointer' }}
            >
              {expanded ? 'Show less' : 'Show more'}
            </span>
          )}
        </>
      )}

      {/* Images */}
      {note.images?.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: note.images.length === 1 ? '1fr' : 'repeat(2, 1fr)',
          gap: '6px', marginTop: '8px',
        }}>
          {note.images.map((img, i) => (
            <a key={i} href={`/api/uploads/${img}`} target="_blank" rel="noopener noreferrer">
              <img
                src={`/api/uploads/${img}`}
                alt={`Note image ${i + 1}`}
                style={{ width: '100%', borderRadius: Theme.radius.sm, border: `1px solid ${Theme.colors.cardBorder}`, display: 'block' }}
              />
            </a>
          ))}
        </div>
      )}

      {/* Tags */}
      {note.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
          {note.tags.map(t => (
            <span key={t} style={{
              fontSize: '9px', fontWeight: 600, padding: '1px 6px',
              borderRadius: Theme.radius.full,
              background: 'rgba(255,255,255,0.04)',
              color: Theme.colors.tertiaryText,
              border: `1px solid ${Theme.colors.cardBorder}`,
            }}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const StockNotesSection = ({ ticker, onOpenJournal }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    ApiService.getNotesByTicker(ticker)
      .then(d => setNotes(d.notes || []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[1, 2].map(i => (
        <div key={i} className="skeleton" style={{ height: '60px', borderRadius: Theme.radius.sm }} />
      ))}
    </div>
  );

  if (!notes.length) return (
    <div className="card flex items-center justify-center" style={{ height: '60px' }}>
      <span style={{ fontSize: '12px', color: Theme.colors.secondaryText }}>
        No journal notes for ${ticker} yet
      </span>
    </div>
  );

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div className="flex items-center gap-2">
          <span style={{
            fontSize: '11px', fontWeight: 700,
            color: Theme.colors.tertiaryText,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Your Notes
          </span>
          <span style={{
            fontSize: '9px', fontWeight: 700, padding: '1px 6px',
            borderRadius: Theme.radius.full,
            background: Theme.colors.accentBlueDim,
            color: Theme.colors.accentBlue,
            border: `1px solid ${Theme.colors.accentBlueBorder}`,
          }}>
            {notes.length}
          </span>
        </div>
        {onOpenJournal && (
          <span
            onClick={onOpenJournal}
            style={{
              fontSize: '10px', fontWeight: 600,
              color: Theme.colors.accentBlue, cursor: 'pointer',
              padding: '2px 8px', borderRadius: Theme.radius.xs,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = Theme.colors.accentBlueDim}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            View in Journal →
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {notes.map(note => (
          <NoteItem key={note.id} note={note} onOpenJournal={onOpenJournal} />
        ))}
      </div>
    </div>
  );
};
