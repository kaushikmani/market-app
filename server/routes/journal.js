import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const POSITIONS_FILE = path.join(DATA_DIR, 'journal-positions.json');
const TRADES_FILE    = path.join(DATA_DIR, 'journal-trades.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const router = express.Router();

// ── Storage helpers ───────────────────────────────────────────────────────────

function readPositions() {
  try { return JSON.parse(fs.readFileSync(POSITIONS_FILE, 'utf-8')); }
  catch { return []; }
}

function writePositions(data) {
  fs.writeFileSync(POSITIONS_FILE, JSON.stringify(data, null, 2));
}

function readTrades() {
  try { return JSON.parse(fs.readFileSync(TRADES_FILE, 'utf-8')); }
  catch { return []; }
}

function writeTrades(data) {
  fs.writeFileSync(TRADES_FILE, JSON.stringify(data, null, 2));
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function calcPnl(trade) {
  const { entry, exit, shares, side, type } = trade;
  if (!exit || !entry || !shares) return null;
  const multiplier = type === 'options' ? 100 : 1;
  const direction  = side === 'short' ? -1 : 1;
  return Math.round(((exit - entry) * shares * multiplier * direction) * 100) / 100;
}

function deriveResult(pnl) {
  if (pnl === null) return 'open';
  if (pnl > 0) return 'win';
  if (pnl < 0) return 'loss';
  return 'breakeven';
}

// ── Positions ─────────────────────────────────────────────────────────────────

router.get('/journal/positions', (req, res) => {
  res.json({ success: true, positions: readPositions() });
});

router.post('/journal/positions', (req, res) => {
  const { ticker, date, side, type, setup, grade, entry, shares, notes, tags,
          optionType, strike, expiry, premium, ivAtEntry } = req.body;

  if (!ticker) return res.status(400).json({ error: 'ticker required' });
  if (!entry || !shares) return res.status(400).json({ error: 'entry and shares required' });

  const position = {
    id: generateId(),
    ticker: ticker.toUpperCase(),
    date: date || new Date().toISOString().slice(0, 10),
    side: side || 'long',
    type: type || 'stock',
    setup: setup || '',
    grade: grade || '',
    entry: parseFloat(entry),
    shares: parseFloat(shares),
    notes: notes || '',
    tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []),
    ...(type === 'options' && {
      optionType: optionType || 'call',
      strike: strike ? parseFloat(strike) : null,
      expiry: expiry || null,
      premium: premium ? parseFloat(premium) : null,
      ivAtEntry: ivAtEntry ? parseFloat(ivAtEntry) : null,
    }),
    openedAt: new Date().toISOString(),
  };

  const positions = readPositions();
  positions.unshift(position);
  writePositions(positions);
  res.status(201).json({ success: true, position });
});

router.patch('/journal/positions/:id', (req, res) => {
  const positions = readPositions();
  const idx = positions.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Position not found' });

  const ALLOWED = ['ticker', 'date', 'side', 'type', 'setup', 'grade', 'entry', 'shares',
    'exit', 'exitDate', 'notes', 'tags', 'status', 'optionType', 'strike', 'expiry', 'premium', 'ivAtEntry'];
  const updates = Object.fromEntries(
    ALLOWED.filter(f => req.body[f] !== undefined).map(f => [f, req.body[f]])
  );
  positions[idx] = { ...positions[idx], ...updates, id: positions[idx].id };
  writePositions(positions);
  res.json({ success: true, position: positions[idx] });
});

router.delete('/journal/positions/:id', (req, res) => {
  const positions = readPositions();
  const idx = positions.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Position not found' });

  positions.splice(idx, 1);
  writePositions(positions);
  res.json({ success: true });
});

// Add shares to a position → recalculates weighted avg entry
router.post('/journal/positions/:id/add', (req, res) => {
  const positions = readPositions();
  const idx = positions.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Position not found' });

  const { price, shares, date } = req.body;
  if (!price || !shares) return res.status(400).json({ error: 'price and shares required' });

  const position = positions[idx];
  const addPrice  = parseFloat(price);
  const addShares = parseFloat(shares);
  const newTotalShares = position.shares + addShares;
  const newEntry = (position.entry * position.shares + addPrice * addShares) / newTotalShares;

  const add = {
    price: addPrice,
    shares: addShares,
    date: date || new Date().toISOString().slice(0, 10),
    addedAt: new Date().toISOString(),
  };

  positions[idx] = {
    ...position,
    entry: Math.round(newEntry * 10000) / 10000,
    shares: newTotalShares,
    adds: [...(position.adds || []), add],
  };

  writePositions(positions);
  res.json({ success: true, position: positions[idx] });
});

// Close a position (full or partial) → creates a trade record
router.post('/journal/positions/:id/close', (req, res) => {
  const positions = readPositions();
  const idx = positions.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Position not found' });

  const { exit, exitDate, notes: closeNotes, shares: sharesToClose } = req.body;
  if (!exit) return res.status(400).json({ error: 'exit price required' });

  const position = positions[idx];
  const exitPrice  = parseFloat(exit);
  const closeShares = sharesToClose ? parseFloat(sharesToClose) : position.shares;
  const isPartial   = closeShares < position.shares;

  const pnl = calcPnl({ ...position, exit: exitPrice, shares: closeShares });

  const trade = {
    ...position,
    id: generateId(),
    shares: closeShares,
    exit: exitPrice,
    exitDate: exitDate || new Date().toISOString().slice(0, 10),
    pnl,
    result: deriveResult(pnl),
    notes: closeNotes ? `${position.notes}\n\nClose: ${closeNotes}`.trim() : position.notes,
    closedAt: new Date().toISOString(),
    ...(isPartial && { partial: true }),
  };

  if (isPartial) {
    const closeRecord = {
      price: exitPrice,
      shares: closeShares,
      date: trade.exitDate,
      pnl,
      closedAt: trade.closedAt,
    };
    positions[idx] = {
      ...position,
      shares: position.shares - closeShares,
      closes: [...(position.closes || []), closeRecord],
    };
    writePositions(positions);
  } else {
    positions.splice(idx, 1);
    writePositions(positions);
  }

  const trades = readTrades();
  trades.unshift(trade);
  writeTrades(trades);

  res.json({ success: true, trade, partial: isPartial });
});

// ── Trades ────────────────────────────────────────────────────────────────────

router.get('/journal/trades', (req, res) => {
  let trades = readTrades();

  // Optional filters
  const { ticker, result, grade, type, from, to } = req.query;
  if (ticker) trades = trades.filter(t => t.ticker === ticker.toUpperCase());
  if (result) trades = trades.filter(t => t.result === result);
  if (grade)  trades = trades.filter(t => t.grade === grade);
  if (type)   trades = trades.filter(t => t.type === type);
  if (from)   trades = trades.filter(t => t.date >= from);
  if (to)     trades = trades.filter(t => t.date <= to);

  res.json({ success: true, trades });
});

// Add a closed trade directly (no open position flow)
router.post('/journal/trades', (req, res) => {
  const { ticker, date, side, type, setup, grade, entry, exit, shares, notes, tags,
          optionType, strike, expiry, premium, ivAtEntry, exitDate, result } = req.body;

  if (!ticker) return res.status(400).json({ error: 'ticker required' });
  if (!entry || !shares) return res.status(400).json({ error: 'entry and shares required' });

  const entryPrice = parseFloat(entry);
  const exitPrice  = exit ? parseFloat(exit) : null;
  const pnl = exitPrice ? calcPnl({ entry: entryPrice, exit: exitPrice, shares: parseFloat(shares), side: side || 'long', type: type || 'stock' }) : null;

  const trade = {
    id: generateId(),
    ticker: ticker.toUpperCase(),
    date: date || new Date().toISOString().slice(0, 10),
    exitDate: exitDate || (exitPrice ? new Date().toISOString().slice(0, 10) : null),
    side: side || 'long',
    type: type || 'stock',
    setup: setup || '',
    grade: grade || '',
    entry: entryPrice,
    exit: exitPrice,
    shares: parseFloat(shares),
    pnl,
    result: result || deriveResult(pnl),
    notes: notes || '',
    tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []),
    ...(type === 'options' && {
      optionType: optionType || 'call',
      strike: strike ? parseFloat(strike) : null,
      expiry: expiry || null,
      premium: premium ? parseFloat(premium) : null,
      ivAtEntry: ivAtEntry ? parseFloat(ivAtEntry) : null,
    }),
    closedAt: new Date().toISOString(),
  };

  const trades = readTrades();
  trades.unshift(trade);
  writeTrades(trades);
  res.status(201).json({ success: true, trade });
});

router.patch('/journal/trades/:id', (req, res) => {
  const trades = readTrades();
  const idx = trades.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Trade not found' });

  const ALLOWED_TRADE = ['ticker', 'date', 'side', 'type', 'setup', 'grade', 'entry', 'shares',
    'exit', 'exitDate', 'notes', 'tags', 'result', 'optionType', 'strike', 'expiry', 'premium', 'ivAtEntry'];
  const tradeUpdates = Object.fromEntries(
    ALLOWED_TRADE.filter(f => req.body[f] !== undefined).map(f => [f, req.body[f]])
  );
  const updated = { ...trades[idx], ...tradeUpdates, id: trades[idx].id };
  updated.pnl = calcPnl(updated);
  if (!req.body.result) updated.result = deriveResult(updated.pnl);
  trades[idx] = updated;
  writeTrades(trades);
  res.json({ success: true, trade: trades[idx] });
});

router.delete('/journal/trades/:id', (req, res) => {
  const trades = readTrades();
  const idx = trades.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Trade not found' });

  trades.splice(idx, 1);
  writeTrades(trades);
  res.json({ success: true });
});

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get('/journal/stats', (req, res) => {
  const { from, to } = req.query;
  let trades = readTrades().filter(t => t.result !== 'open');
  if (from) trades = trades.filter(t => t.date >= from);
  if (to)   trades = trades.filter(t => t.date <= to);

  const summary = computeSummary(trades);
  const byGrade  = groupBy(trades, 'grade');
  const bySetup  = groupBy(trades, 'setup');
  const byTicker = groupBy(trades, 'ticker');
  const byType   = groupBy(trades, 'type');

  // Weekly breakdown
  const weekly = {};
  for (const t of trades) {
    const week = getWeekKey(t.date);
    if (!weekly[week]) weekly[week] = [];
    weekly[week].push(t);
  }
  const weeklyStats = Object.entries(weekly)
    .map(([week, wTrades]) => ({ week, ...computeSummary(wTrades) }))
    .sort((a, b) => b.week.localeCompare(a.week));

  // Monthly breakdown
  const monthly = {};
  for (const t of trades) {
    const month = t.date.slice(0, 7);
    if (!monthly[month]) monthly[month] = [];
    monthly[month].push(t);
  }
  const monthlyStats = Object.entries(monthly)
    .map(([month, mTrades]) => ({ month, ...computeSummary(mTrades) }))
    .sort((a, b) => b.month.localeCompare(a.month));

  res.json({
    success: true,
    summary,
    byGrade:  Object.entries(byGrade).map(([k, v]) => ({ label: k || 'Ungraded', ...computeSummary(v) })),
    bySetup:  Object.entries(bySetup).map(([k, v]) => ({ label: k || 'No setup', ...computeSummary(v) })).sort((a,b) => b.totalPnl - a.totalPnl),
    byTicker: Object.entries(byTicker).map(([k, v]) => ({ label: k, ...computeSummary(v) })).sort((a,b) => b.totalPnl - a.totalPnl),
    byType:   Object.entries(byType).map(([k, v]) => ({ label: k, ...computeSummary(v) })),
    weekly:   weeklyStats,
    monthly:  monthlyStats,
  });
});

function computeSummary(trades) {
  const closed = trades.filter(t => t.pnl !== null);
  const wins   = closed.filter(t => t.result === 'win');
  const losses = closed.filter(t => t.result === 'loss');
  const totalPnl   = closed.reduce((s, t) => s + (t.pnl || 0), 0);
  const avgWin     = wins.length   ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length     : 0;
  const avgLoss    = losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
  const grossWin   = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss  = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? Math.round((grossWin / grossLoss) * 100) / 100 : null;

  return {
    count:        closed.length,
    wins:         wins.length,
    losses:       losses.length,
    winRate:      closed.length ? Math.round((wins.length / closed.length) * 1000) / 10 : 0,
    totalPnl:     Math.round(totalPnl * 100) / 100,
    avgWin:       Math.round(avgWin * 100) / 100,
    avgLoss:      Math.round(avgLoss * 100) / 100,
    profitFactor,
    largestWin:   wins.length   ? Math.max(...wins.map(t => t.pnl))    : 0,
    largestLoss:  losses.length ? Math.min(...losses.map(t => t.pnl))  : 0,
  };
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || '';
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

function getWeekKey(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay();
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

export default router;
