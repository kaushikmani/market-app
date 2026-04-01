const API_BASE = '/api';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const ApiService = {
  getNews: () =>
    fetchJson(`${API_BASE}/news`),

  getFinvizQuote: (ticker) =>
    fetchJson(`${API_BASE}/finviz-quote?ticker=${encodeURIComponent(ticker)}`),

  getFinvizPeers: (tickers) =>
    fetchJson(`${API_BASE}/finviz-peers?tickers=${encodeURIComponent(tickers)}`),

  getSMAs: (ticker) =>
    fetchJson(`${API_BASE}/sma?ticker=${encodeURIComponent(ticker)}`),

  getSMAData: (ticker) =>
    fetchJson(`${API_BASE}/sma?ticker=${encodeURIComponent(ticker)}`),

  getEarningsCalendar: () =>
    fetchJson(`${API_BASE}/earnings-calendar`),

  getTriggeredAlerts: () =>
    fetchJson(`${API_BASE}/alerts/triggered`),

  dismissTriggeredAlert: (id) =>
    fetch(`${API_BASE}/alerts/triggered/${encodeURIComponent(id)}`, { method: 'DELETE' }).then(r => r.json()),

  getAlerts: () =>
    fetchJson(`${API_BASE}/alerts`),

  createAlert: (data) =>
    fetch(`${API_BASE}/alerts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => { if (!r.ok) throw new Error(`API error: ${r.status}`); return r.json(); }),

  updateAlert: (id, data) =>
    fetch(`${API_BASE}/alerts/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => { if (!r.ok) throw new Error(`API error: ${r.status}`); return r.json(); }),

  deleteAlert: (id) =>
    fetch(`${API_BASE}/alerts/${id}`, { method: 'DELETE' })
      .then(r => { if (!r.ok) throw new Error(`API error: ${r.status}`); return r.json(); }),

  askAI: (data) =>
    fetch(`${API_BASE}/ask`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => { if (!r.ok) throw new Error(`API error: ${r.status}`); return r.json(); }),

  getNewsSentiment: (headlines) =>
    fetch(`${API_BASE}/news-sentiment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headlines }),
    }).then(r => { if (!r.ok) throw new Error(`API error: ${r.status}`); return r.json(); }),

  getStockNews: (ticker) =>
    fetchJson(`${API_BASE}/stock-news?ticker=${encodeURIComponent(ticker)}`),

  getMarketBriefing: () =>
    fetchJson(`${API_BASE}/market-briefing`),

  getEarningsPreview: (ticker) =>
    fetchJson(`${API_BASE}/earnings-preview?ticker=${encodeURIComponent(ticker)}`),

  getWatchlistScan: () =>
    fetchJson(`${API_BASE}/watchlist-scan`),

  getPreMarketReport: () =>
    fetchJson(`${API_BASE}/pre-market-report`),

  getThemePerformance: (range = 'today') =>
    fetchJson(`${API_BASE}/theme-performance?range=${encodeURIComponent(range)}`),

  getSubstackFeed: () =>
    fetchJson(`${API_BASE}/substack-feed`),

  getPreMarketMovers: () =>
    fetchJson(`${API_BASE}/pre-market-movers`),

  getWatchlistPrices: () =>
    fetchJson(`${API_BASE}/watchlist-prices`),

  getGapScanner: () =>
    fetchJson(`${API_BASE}/gap-scanner`),

  getMarketSentiment: () =>
    fetchJson(`${API_BASE}/market-sentiment`),

  getNotes: (days = 5) =>
    fetchJson(`${API_BASE}/notes?days=${days}`),

  getNotesByTicker: (ticker, days = 90) =>
    fetchJson(`${API_BASE}/notes?ticker=${encodeURIComponent(ticker)}&days=${days}`),

  getBrief: () =>
    fetchJson(`${API_BASE}/notes/brief`),

  getGamePlan: () =>
    fetchJson(`${API_BASE}/notes/gameplan`),

  askNotes: (question, days = 21) =>
    fetch(`${API_BASE}/notes/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, days }),
    }).then(r => { if (!r.ok) throw new Error(`API error: ${r.status}`); return r.json(); }),

  createNote: (data) =>
    fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => { if (!r.ok) throw new Error(`API error: ${r.status}`); return r.json(); }),

  getTranscriptionStatus: (jobId) =>
    fetchJson(`${API_BASE}/notes/transcription-status/${encodeURIComponent(jobId)}`),

  uploadAudio: (file, title) => {
    const formData = new FormData();
    formData.append('audio', file);
    if (title) formData.append('title', title);
    return fetch(`${API_BASE}/notes/upload-audio`, {
      method: 'POST',
      body: formData,
    }).then(r => { if (!r.ok) throw new Error(`API error: ${r.status}`); return r.json(); });
  },

  uploadImages: (files, title, content) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('images', file);
    }
    if (title) formData.append('title', title);
    if (content) formData.append('content', content);
    return fetch(`${API_BASE}/notes/upload-images`, {
      method: 'POST',
      body: formData,
    }).then(r => { if (!r.ok) throw new Error(`API error: ${r.status}`); return r.json(); });
  },

  updateNote: (id, data) =>
    fetch(`${API_BASE}/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => { if (!r.ok) throw new Error(`API error: ${r.status}`); return r.json(); }),

  deleteNote: (id) =>
    fetch(`${API_BASE}/notes/${id}`, { method: 'DELETE' })
      .then(r => { if (!r.ok) throw new Error(`API error: ${r.status}`); return r.json(); }),

  getMarketStatus: () =>
    fetchJson(`${API_BASE}/market-status`),

  getTickerInfo: (ticker) =>
    fetchJson(`${API_BASE}/ticker-info?ticker=${encodeURIComponent(ticker)}`),

  getEarningsHistory: (ticker) =>
    fetchJson(`${API_BASE}/earnings-history?ticker=${encodeURIComponent(ticker)}`),

  getNotesSummary: (force = false) =>
    fetchJson(`${API_BASE}/notes/summary${force ? '?force=true' : ''}`),

  getRules: () =>
    fetchJson(`${API_BASE}/rules`),

  saveRules: (rules) =>
    fetch(`${API_BASE}/rules`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules }),
    }).then(r => { if (!r.ok) throw new Error(`API error: ${r.status}`); return r.json(); }),

  getMarketNarrative: (force = false) =>
    fetchJson(`${API_BASE}/market-narrative${force ? '?force=true' : ''}`),

  getSetupScore: (force = false) =>
    fetchJson(`${API_BASE}/setup-score${force ? '?force=true' : ''}`),

  getTradeIdeas: (force = false) =>
    fetchJson(`${API_BASE}/trade-ideas${force ? '?force=true' : ''}`),
};
