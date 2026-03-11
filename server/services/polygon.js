import { POLYGON_API_KEY } from '../config.js';

const BASE = 'https://api.polygon.io';

export async function polygonGet(path, params = {}) {
  const url = new URL(BASE + path);
  url.searchParams.set('apiKey', POLYGON_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Polygon ${path}: ${res.status} ${text.slice(0, 120)}`);
  }
  return res.json();
}

// Fetch all pages of a paginated Polygon endpoint (cursor-based)
export async function polygonGetAll(path, params = {}, maxPages = 10) {
  const results = [];
  let cursor = null;
  let page = 0;
  while (page < maxPages) {
    const p = cursor ? { ...params, cursor } : params;
    const data = await polygonGet(path, p);
    results.push(...(data.results || []));
    if (!data.next_url) break;
    cursor = new URL(data.next_url).searchParams.get('cursor');
    if (!cursor) break;
    page++;
  }
  return results;
}
