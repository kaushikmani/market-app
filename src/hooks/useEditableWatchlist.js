import { useState, useCallback, useMemo } from 'react';
import { WATCHLIST } from '../data/watchlist';

const STORAGE_KEY = 'watchlist_user_edits';

function loadEdits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveEdits(edits) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
  } catch {
    // localStorage full or unavailable
  }
}

// edits shape: { added: { [categoryName]: [ticker, ...] }, removed: { [categoryName]: [ticker, ...] }, customCategories: [{ name, tickers }] }
function getDefaultEdits() {
  return { added: {}, removed: {}, customCategories: [] };
}

export function useEditableWatchlist() {
  const [edits, setEdits] = useState(() => loadEdits() || getDefaultEdits());

  const watchlist = useMemo(() => {
    const base = WATCHLIST.map(cat => {
      const addedTickers = edits.added[cat.name] || [];
      const removedTickers = new Set(edits.removed[cat.name] || []);
      const tickers = [
        ...cat.tickers.filter(t => !removedTickers.has(t)),
        ...addedTickers.filter(t => !cat.tickers.includes(t)),
      ];
      return { name: cat.name, tickers, isCustom: false };
    });
    const custom = (edits.customCategories || []).map(cat => ({
      ...cat,
      isCustom: true,
    }));
    return [...base, ...custom];
  }, [edits]);

  const updateEdits = useCallback((updater) => {
    setEdits(prev => {
      const next = updater(prev);
      saveEdits(next);
      return next;
    });
  }, []);

  const addTicker = useCallback((categoryName, ticker) => {
    const upper = ticker.toUpperCase().trim();
    if (!upper) return;
    updateEdits(prev => {
      // Check if it's a custom category
      const customIdx = (prev.customCategories || []).findIndex(c => c.name === categoryName);
      if (customIdx !== -1) {
        const custom = [...prev.customCategories];
        const cat = { ...custom[customIdx], tickers: [...custom[customIdx].tickers] };
        if (!cat.tickers.includes(upper)) {
          cat.tickers.push(upper);
        }
        custom[customIdx] = cat;
        return { ...prev, customCategories: custom };
      }
      // Base category — first check if it was previously removed
      const removed = { ...prev.removed };
      if (removed[categoryName]) {
        removed[categoryName] = removed[categoryName].filter(t => t !== upper);
        if (removed[categoryName].length === 0) delete removed[categoryName];
      }
      // Then add if not already present in base
      const baseCat = WATCHLIST.find(c => c.name === categoryName);
      if (baseCat && baseCat.tickers.includes(upper)) {
        return { ...prev, removed };
      }
      const added = { ...prev.added };
      added[categoryName] = [...(added[categoryName] || [])];
      if (!added[categoryName].includes(upper)) {
        added[categoryName].push(upper);
      }
      return { ...prev, added, removed };
    });
  }, [updateEdits]);

  const removeTicker = useCallback((categoryName, ticker) => {
    updateEdits(prev => {
      // Custom category
      const customIdx = (prev.customCategories || []).findIndex(c => c.name === categoryName);
      if (customIdx !== -1) {
        const custom = [...prev.customCategories];
        const cat = { ...custom[customIdx], tickers: custom[customIdx].tickers.filter(t => t !== ticker) };
        custom[customIdx] = cat;
        return { ...prev, customCategories: custom };
      }
      // Base category
      const added = { ...prev.added };
      if (added[categoryName]) {
        added[categoryName] = added[categoryName].filter(t => t !== ticker);
        if (added[categoryName].length === 0) delete added[categoryName];
      }
      const baseCat = WATCHLIST.find(c => c.name === categoryName);
      if (baseCat && baseCat.tickers.includes(ticker)) {
        const removed = { ...prev.removed };
        removed[categoryName] = [...(removed[categoryName] || []), ticker];
        return { ...prev, added, removed };
      }
      return { ...prev, added };
    });
  }, [updateEdits]);

  const addCategory = useCallback((name) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    // Check for duplicate
    const exists = WATCHLIST.some(c => c.name.toLowerCase() === trimmed.toLowerCase()) ||
      (edits.customCategories || []).some(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) return false;
    updateEdits(prev => ({
      ...prev,
      customCategories: [...(prev.customCategories || []), { name: trimmed, tickers: [] }],
    }));
    return true;
  }, [edits, updateEdits]);

  const removeCategory = useCallback((categoryName) => {
    updateEdits(prev => ({
      ...prev,
      customCategories: (prev.customCategories || []).filter(c => c.name !== categoryName),
    }));
  }, [updateEdits]);

  const resetAll = useCallback(() => {
    const defaults = getDefaultEdits();
    saveEdits(defaults);
    setEdits(defaults);
  }, []);

  return { watchlist, addTicker, removeTicker, addCategory, removeCategory, resetAll };
}
