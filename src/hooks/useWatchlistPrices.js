import { useState, useEffect, useRef } from 'react';
import { ApiService } from '../services/ApiService';

// Returns true if market is currently open (including pre/after hours: 4am–8pm ET Mon-Fri)
function isExtendedHours() {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const h = et.getHours();
  return h >= 4 && h < 20; // 4am–8pm ET
}

export function useWatchlistPrices() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  const fetchPrices = async () => {
    if (!isExtendedHours()) return;
    try {
      setLoading(true);
      const data = await ApiService.getWatchlistPrices();
      if (data?.prices) setPrices(data.prices);
    } catch {
      // silent fail — sidebar still works without prices
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();

    // Refresh every 60 seconds during extended hours
    intervalRef.current = setInterval(() => {
      if (isExtendedHours()) fetchPrices();
    }, 60 * 1000);

    return () => clearInterval(intervalRef.current);
  }, []);

  return { prices, loading };
}
