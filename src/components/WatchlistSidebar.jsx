import React, { useState, useRef, useEffect } from 'react';
import { Theme } from '../models/Theme';
import { useEditableWatchlist } from '../hooks/useEditableWatchlist';
import { useWatchlistPrices } from '../hooks/useWatchlistPrices';

const InlineTickerInput = ({ onSubmit, onCancel }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit(value.trim());
      setValue('');
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={e => setValue(e.target.value.toUpperCase())}
      onKeyDown={handleKeyDown}
      onBlur={onCancel}
      placeholder="TICKER"
      style={{
        width: '52px',
        padding: '3px 6px',
        fontSize: '10px',
        fontFamily: 'var(--font-mono)',
        background: Theme.colors.inputBackground,
        border: `1px solid ${Theme.colors.accentBlueBorder}`,
        borderRadius: Theme.radius.sm,
        color: Theme.colors.primaryText,
        outline: 'none',
        letterSpacing: '0.02em',
      }}
    />
  );
};

const CategorySection = ({ category, activeTicker, onTickerClick, onChartClick, isExpanded, onToggle, onAddTicker, onRemoveTicker, onRemoveCategory, prices }) => {
  const [hovered, setHovered] = useState(false);
  const [hoveredTicker, setHoveredTicker] = useState(null);
  const [showInput, setShowInput] = useState(false);

  return (
    <div style={{ marginBottom: '2px' }}>
      <div
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding: '7px 14px',
          fontSize: '10px',
          fontWeight: 700,
          color: hovered ? Theme.colors.primaryText : Theme.colors.secondaryText,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.15s ease',
          borderRadius: Theme.radius.xs,
          userSelect: 'none',
          background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        }}
      >
        <span style={{ flex: 1 }}>{category.name}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {hovered && (
            <>
              <span
                onClick={e => { e.stopPropagation(); setShowInput(s => !s); }}
                title="Add ticker"
                style={{
                  fontSize: '13px',
                  lineHeight: 1,
                  color: Theme.colors.accentBlue,
                  opacity: 0.7,
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; }}
              >+</span>
              {category.isCustom && (
                <span
                  onClick={e => { e.stopPropagation(); onRemoveCategory(); }}
                  title="Delete category"
                  style={{
                    fontSize: '12px',
                    lineHeight: 1,
                    color: Theme.colors.bearishRed,
                    opacity: 0.7,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; }}
                >&times;</span>
              )}
            </>
          )}
          <span style={{
            fontSize: '8px',
            transition: 'transform 0.2s ease',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            opacity: 0.5,
          }}>&#9654;</span>
        </span>
      </div>

      {isExpanded && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '3px',
          padding: '4px 14px 10px',
        }}>
          {category.tickers.map(t => {
            const isActive = t === activeTicker;
            const isHovered = hoveredTicker === t;
            return (
              <div
                key={t}
                onMouseEnter={() => setHoveredTicker(t)}
                onMouseLeave={() => setHoveredTicker(null)}
                style={{
                  position: 'relative',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: isActive ? 700 : 500,
                  fontFamily: 'var(--font-mono)',
                  color: (() => {
                    if (isActive) return '#fff';
                    if (isHovered) return Theme.colors.accentBlue;
                    const p = prices?.[t];
                    if (p?.changePct != null) {
                      return p.changePct > 0 ? Theme.colors.bullishGreen : p.changePct < 0 ? Theme.colors.bearishRed : Theme.colors.primaryText;
                    }
                    return Theme.colors.primaryText;
                  })(),
                  background: isActive
                    ? Theme.colors.accentBlue
                    : isHovered ? Theme.colors.accentBlueDim : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? 'transparent' : isHovered ? Theme.colors.accentBlueBorder : Theme.colors.cardBorder}`,
                  borderRadius: Theme.radius.sm,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  letterSpacing: '0.02em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                onClick={() => onTickerClick(t)}
              >
                {t}
                {isHovered && !isActive && onChartClick && (
                  <span
                    onClick={e => { e.stopPropagation(); onChartClick(t); }}
                    title="Quick chart"
                    style={{ fontSize: '9px', lineHeight: 1, opacity: 0.7, marginLeft: '1px' }}
                  >
                    📈
                  </span>
                )}
                {isHovered && !isActive && (
                  <span
                    onClick={e => { e.stopPropagation(); onRemoveTicker(t); }}
                    title="Remove"
                    style={{
                      fontSize: '11px',
                      lineHeight: 1,
                      color: Theme.colors.bearishRed,
                      marginLeft: '1px',
                      opacity: 0.8,
                    }}
                  >&times;</span>
                )}
              </div>
            );
          })}
          {showInput && (
            <InlineTickerInput
              onSubmit={ticker => { onAddTicker(ticker); setShowInput(false); }}
              onCancel={() => setShowInput(false)}
            />
          )}
        </div>
      )}
    </div>
  );
};

const NewCategoryInput = ({ onSubmit, onCancel }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && value.trim()) {
      const ok = onSubmit(value.trim());
      if (ok) setValue('');
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div style={{ padding: '6px 14px' }}>
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        placeholder="Category name"
        style={{
          width: '100%',
          padding: '5px 8px',
          fontSize: '10px',
          background: Theme.colors.inputBackground,
          border: `1px solid ${Theme.colors.accentBlueBorder}`,
          borderRadius: Theme.radius.sm,
          color: Theme.colors.primaryText,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
};

export const WatchlistSidebar = ({ activeTicker, onTickerClick, onChartClick }) => {
  const { watchlist, addTicker, removeTicker, addCategory, removeCategory, resetAll } = useEditableWatchlist();
  const { prices } = useWatchlistPrices();
  const [expanded, setExpanded] = useState(() => {
    const init = {};
    watchlist.forEach((_, i) => { init[i] = i < 3; });
    return init;
  });
  const [showNewCategory, setShowNewCategory] = useState(false);

  const toggleCategory = (idx) => {
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const expandAll = () => {
    const all = {};
    watchlist.forEach((_, i) => { all[i] = true; });
    setExpanded(all);
  };

  const collapseAll = () => {
    const all = {};
    watchlist.forEach((_, i) => { all[i] = false; });
    setExpanded(all);
  };

  const totalTickers = watchlist.reduce((sum, cat) => sum + cat.tickers.length, 0);

  return (
    <div style={{
      width: '230px',
      minWidth: '230px',
      height: '100vh',
      position: 'sticky',
      top: 0,
      overflowY: 'auto',
      background: Theme.colors.sidebarBackground,
      borderRight: `1px solid ${Theme.colors.cardBorder}`,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 14px 12px',
        borderBottom: `1px solid ${Theme.colors.cardBorder}`,
      }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 800,
          color: Theme.colors.primaryText,
          letterSpacing: '0.04em',
          marginBottom: '6px',
          textTransform: 'uppercase',
        }}>
          Watchlist
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText, fontWeight: 500 }}>
            {totalTickers} stocks &middot; {watchlist.length} sectors
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span
              onClick={expandAll}
              style={{ fontSize: '9px', color: Theme.colors.accentBlue, cursor: 'pointer', letterSpacing: '0.04em', fontWeight: 600 }}
            >ALL</span>
            <span
              onClick={collapseAll}
              style={{ fontSize: '9px', color: Theme.colors.tertiaryText, cursor: 'pointer', letterSpacing: '0.04em', fontWeight: 600 }}
            >NONE</span>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 0',
      }}>
        {watchlist.map((cat, i) => (
          <CategorySection
            key={cat.name}
            category={cat}
            activeTicker={activeTicker}
            onTickerClick={onTickerClick}
            onChartClick={onChartClick}
            isExpanded={!!expanded[i]}
            onToggle={() => toggleCategory(i)}
            onAddTicker={(ticker) => addTicker(cat.name, ticker)}
            onRemoveTicker={(ticker) => removeTicker(cat.name, ticker)}
            onRemoveCategory={() => removeCategory(cat.name)}
            prices={prices}
          />
        ))}

        {showNewCategory ? (
          <NewCategoryInput
            onSubmit={(name) => {
              const ok = addCategory(name);
              if (ok) setShowNewCategory(false);
              return ok;
            }}
            onCancel={() => setShowNewCategory(false)}
          />
        ) : (
          <div
            onClick={() => setShowNewCategory(true)}
            style={{
              padding: '8px 14px',
              fontSize: '10px',
              fontWeight: 600,
              color: Theme.colors.accentBlue,
              cursor: 'pointer',
              letterSpacing: '0.04em',
              opacity: 0.6,
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; }}
          >
            + NEW CATEGORY
          </div>
        )}
      </div>

      {/* Footer with reset */}
      <div style={{
        padding: '8px 14px',
        borderTop: `1px solid ${Theme.colors.cardBorder}`,
      }}>
        <span
          onClick={resetAll}
          style={{
            fontSize: '9px',
            color: Theme.colors.tertiaryText,
            cursor: 'pointer',
            letterSpacing: '0.04em',
            fontWeight: 600,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = Theme.colors.bearishRed; }}
          onMouseLeave={e => { e.currentTarget.style.color = Theme.colors.tertiaryText; }}
        >RESET TO DEFAULTS</span>
      </div>
    </div>
  );
};
