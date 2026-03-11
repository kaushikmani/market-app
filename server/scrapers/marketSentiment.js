import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cache = { data: null, expiry: 0 };

// ── VIX term structure via Yahoo Finance ──────────────────────────────────────
function fetchVixTerm() {
  try {
    const fetchPrice = (sym) => {
      const raw = execSync(
        `curl -sL -H "User-Agent: Mozilla/5.0" "https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d"`,
        { timeout: 8000, encoding: 'utf-8' }
      );
      return JSON.parse(raw)?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
    };
    const vix  = fetchPrice('^VIX');
    const vix3m = fetchPrice('^VIX3M');
    if (!vix || !vix3m) return null;
    const spread = parseFloat((vix - vix3m).toFixed(2));
    return {
      vix:  parseFloat(vix.toFixed(2)),
      vix3m: parseFloat(vix3m.toFixed(2)),
      spread,
      // contango (VIX < VIX3M) = calm; inverted (VIX > VIX3M) = acute fear/panic
      structure: spread > 0 ? 'inverted' : 'contango',
    };
  } catch { return null; }
}

// ── Breadth from watchlist scan disk cache ────────────────────────────────────
function calcBreadth() {
  try {
    const p = path.join(__dirname, '../data/page-cache/watchlist-scan.json');
    if (!fs.existsSync(p)) return null;
    const results = JSON.parse(fs.readFileSync(p, 'utf8')).results || [];
    if (!results.length) return null;

    const w200 = results.filter(r => r.smas?.[200] && r.price);
    const w50  = results.filter(r => r.smas?.[50]  && r.price);
    const wRsi = results.filter(r => r.rsi != null);

    return {
      above200d:  w200.length ? Math.round(w200.filter(r => r.price > r.smas[200]).length / w200.length * 100) : null,
      above50d:   w50.length  ? Math.round(w50.filter(r => r.price > r.smas[50]).length   / w50.length  * 100) : null,
      rsiAbove50: wRsi.length ? Math.round(wRsi.filter(r => r.rsi > 50).length            / wRsi.length * 100) : null,
      sampleSize: results.length,
    };
  } catch { return null; }
}

export async function fetchMarketSentiment() {
  const now = Date.now();
  if (cache.data && now < cache.expiry) return cache.data;

  try {
    const res = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.cnn.com/',
      },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`CNN F&G returned ${res.status}`);
    const j = await res.json();
    const fg = j.fear_and_greed;

    const label = r => r ? r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

    const hist = (j.fear_and_greed_historical?.data || []).slice(-30).map(d => ({
      x: d.x,
      y: Math.round(d.y * 10) / 10,
    }));

    const data = {
      success: true,
      fearGreed: {
        score:      Math.round(fg.score * 10) / 10,
        rating:     label(fg.rating),
        prevClose:  Math.round((fg.previous_close   || 0) * 10) / 10,
        prev1Week:  Math.round((fg.previous_1_week  || 0) * 10) / 10,
        prev1Month: Math.round((fg.previous_1_month || 0) * 10) / 10,
        prev1Year:  Math.round((fg.previous_1_year  || 0) * 10) / 10,
        history: hist,
      },
      components: {
        putCall:       { score: j.put_call_options?.score,       rating: label(j.put_call_options?.rating) },
        vix:           { score: j.market_volatility_vix?.score,  rating: label(j.market_volatility_vix?.rating) },
        junkBond:      { score: j.junk_bond_demand?.score,       rating: label(j.junk_bond_demand?.rating) },
        safeHaven:     { score: j.safe_haven_demand?.score,      rating: label(j.safe_haven_demand?.rating) },
        momentum:      { score: j.market_momentum_sp500?.score,  rating: label(j.market_momentum_sp500?.rating) },
        priceStrength: { score: j.stock_price_strength?.score,   rating: label(j.stock_price_strength?.rating) },
        priceBreadth:  { score: j.stock_price_breadth?.score,    rating: label(j.stock_price_breadth?.rating) },
      },
      vixTerm: fetchVixTerm(),
      breadth: calcBreadth(),
      updatedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };

    cache = { data, expiry: now + 15 * 60 * 1000 };
    return data;
  } catch (e) {
    console.error('[MarketSentiment] Failed:', e.message);
    return { success: false, error: e.message };
  }
}
