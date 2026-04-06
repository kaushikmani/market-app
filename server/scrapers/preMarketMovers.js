const MOCK_DATA = [
  { ticker: 'NVDA', company: 'NVIDIA Corporation', mktCap: '3.2T', price: 875.30, pmPrice: 891.20, pmChgPct: 1.82, pmVol: '2.1M', chgPct: 0.45, avgVol: '45.2M', volume: '38.1M', volChgPct: -15.7 },
  { ticker: 'TSLA', company: 'Tesla, Inc.', mktCap: '780B', price: 245.10, pmPrice: 249.80, pmChgPct: 1.92, pmVol: '1.8M', chgPct: -0.32, avgVol: '98.5M', volume: '82.3M', volChgPct: -16.4 },
  { ticker: 'AAPL', company: 'Apple Inc.', mktCap: '3.5T', price: 228.50, pmPrice: 230.10, pmChgPct: 0.70, pmVol: '890K', chgPct: 0.12, avgVol: '52.1M', volume: '48.7M', volChgPct: -6.5 },
  { ticker: 'META', company: 'Meta Platforms, Inc.', mktCap: '1.5T', price: 585.20, pmPrice: 589.90, pmChgPct: 0.80, pmVol: '650K', chgPct: 1.10, avgVol: '18.3M', volume: '15.2M', volChgPct: -16.9 },
  { ticker: 'AMZN', company: 'Amazon.com, Inc.', mktCap: '2.1T', price: 198.70, pmPrice: 200.30, pmChgPct: 0.81, pmVol: '720K', chgPct: 0.55, avgVol: '42.8M', volume: '36.5M', volChgPct: -14.7 },
];

export async function scrapePreMarketMovers() {
  return {
    success: true,
    movers: MOCK_DATA,
    timestamp: Date.now(),
    source: 'mock',
  };
}
