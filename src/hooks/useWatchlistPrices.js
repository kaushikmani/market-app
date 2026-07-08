import { useEffect, useSyncExternalStore } from 'react';
import { ApiService } from '../services/ApiService';

// Single, app-wide subscription. Multiple components calling this hook
// share one fetch + one interval, instead of fanning out N requests every 60s.

const REFRESH_MS = 60 * 1000;

let cache = { prices: {}, loading: false };
const listeners = new Set();
let intervalId = null;
let refCount = 0;
let inFlight = null;

function isExtendedHours() {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const h = et.getHours();
  return h >= 4 && h < 20;
}

function emit() {
  for (const l of listeners) l();
}

async function fetchOnce() {
  if (!isExtendedHours()) return;
  if (inFlight) return inFlight;
  cache = { ...cache, loading: true };
  emit();
  inFlight = ApiService.getWatchlistPrices()
    .then(data => {
      if (data?.prices) cache = { prices: data.prices, loading: false };
      else cache = { ...cache, loading: false };
    })
    .catch(() => { cache = { ...cache, loading: false }; })
    .finally(() => { inFlight = null; emit(); });
  return inFlight;
}

function subscribe(listener) {
  listeners.add(listener);
  refCount += 1;
  if (refCount === 1) {
    fetchOnce();
    intervalId = setInterval(fetchOnce, REFRESH_MS);
  }
  return () => {
    listeners.delete(listener);
    refCount = Math.max(0, refCount - 1);
    if (refCount === 0 && intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

function getSnapshot() {
  return cache;
}

export function useWatchlistPrices() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  // Keep API stable for callers
  useEffect(() => {}, []);
  return { prices: snap.prices, loading: snap.loading };
}
