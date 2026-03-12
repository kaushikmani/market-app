import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { GEMINI_API_KEY } from '../config.js';

const execAsync = promisify(exec);

// Find whisper binary — check PATH then common install locations
let WHISPER_BIN = 'whisper';
try {
  WHISPER_BIN = execSync('which whisper 2>/dev/null || echo whisper', { encoding: 'utf-8' }).trim();
} catch {
  const candidates = [
    '/opt/homebrew/bin/whisper',
    '/usr/local/bin/whisper',
    `${process.env.HOME}/.local/bin/whisper`,
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) { WHISPER_BIN = c; break; }
  }
}

const WATCHLIST_TICKERS = [
  'SPY','QQQ','IWM','DIA','GLD','SLV','XLK','XLC','XLV','IGV','ARKG','NAIL',
  'NVDA','TSLA','AAPL','MSFT','GOOGL','AMZN','META',
  'CRWD','PANW','FTNT','ZS','OKTA','RBRK',
  'MU','WDC','STX','PSTG',
  'ASML','LRCX','KLAC','AMAT','TSM','AMD','ARM','MRVL','INTC','TXN','ADI','AVGO','ON','ALAB','CRDO',
  'APH','CIEN','LITE','SMCI','VRT','DELL','HPE','ANET','CLS',
  'PLTR','ORCL','CRM','NOW','ADBE','TEAM','WDAY','HUBS','MDB','SNOW','DDOG','NET','PATH',
  'MSTR','COIN','HOOD','MARA','RIOT','HUT','IREN','IBIT',
  'VST','CEG','LEU','CCJ','OKLO','SMR','NNE','GEV',
  'FSLR','ENPH','BE','PLUG',
  'LMT','RTX','NOC','GD','BA','RKLB','ASTS',
  'IONQ','RGTI','QBTS','QUBT',
  'SOFI','ALLY','GS','JPM','BAC',
  'BABA','BIDU','JD','PDD',
  'RIVN','LCID','LI','XPEV',
  'ACHR','JOBY',
  'UNH','ABBV','LLY','NVO','MRNA','CRSP',
  'RDDT','SNAP','PINS','SPOT','TTD','APP','DIS','NFLX',
  'HD','WMT','NKE','KO',
  'ABNB','BKNG','DAL','AAL',
  'XOM','CVX','OXY',
  'CAT','HON','FCX',
];

export function extractTickers(text) {
  if (!text) return [];
  const found = new Set();

  // Match $TICKER pattern
  const dollarMatches = text.match(/\$([A-Z]{1,5})\b/g);
  if (dollarMatches) {
    dollarMatches.forEach(m => found.add(m.replace('$', '')));
  }

  // Match known watchlist tickers as standalone words
  const upper = text.toUpperCase();
  for (const ticker of WATCHLIST_TICKERS) {
    const regex = new RegExp(`\\b${ticker}\\b`, 'g');
    if (regex.test(upper)) {
      found.add(ticker);
    }
  }

  return [...found].sort();
}

// GEMINI_API_KEY imported from config.js above

const SUMMARY_PROMPT = `You are a trading analyst extracting actionable intelligence from trading notes for a trader's journal.

Your job is to distill the content into detailed, actionable bullet points a trader can reference throughout the day.

PRIORITY INFORMATION TO EXTRACT:
1. PRICE LEVELS — support, resistance, entry zones, stop losses, profit targets (exact dollar amounts)
2. TRADE SETUPS — ticker + direction (long/short) + trigger condition + target + stop
3. KEY LEVELS — breakout levels, moving average prices, VWAP, prior highs/lows
4. RISK/REWARD — position sizing notes, risk warnings, max loss levels
5. CATALYSTS — earnings dates, Fed meetings, economic data, sector rotation
6. MARKET CONTEXT — overall bias (bullish/bearish/neutral), sector leadership, breadth

Rules:
- Return ONLY bullet points, one per line, starting with "• "
- ALWAYS include specific dollar prices, percentages, and levels when mentioned — never omit numbers
- Format levels clearly: "$TICKER: support $X, resistance $Y, target $Z"
- Include ticker symbols in ALL CAPS
- If the source mentions a trade idea, include: direction, entry, stop, target
- Keep each point concise but DETAILED — include all numbers and levels
- No headers, no intro text, just bullet points
- If content is messy/copied from chat, clean it up but preserve all data points

Content:
`;

export async function callGemini(prompt, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 8000 },
          }),
        }
      );

      if (res.status === 429) {
        const wait = (i + 1) * 20000; // 20s, 40s — fail fast so rule-based fallbacks kick in
        console.log(`[Gemini] Rate limited, retrying in ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) {
        console.error('[Gemini] API error:', res.status);
        return null;
      }

      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (error) {
      console.error('[Gemini] Request failed:', error.message);
      if (i < retries - 1) await new Promise(r => setTimeout(r, 5000));
    }
  }
  return null;
}

/**
 * Summarize a trading call transcript into bullet points using Gemini.
 */
export async function summarizeTranscript(transcript) {
  if (!transcript || transcript.length < 50) return [];

  const text = await callGemini(SUMMARY_PROMPT + transcript);
  if (!text) return [];

  const points = text
    .split('\n')
    .map(line => line.replace(/^[•\-*]\s*/, '').trim())
    .filter(line => line.length > 10);

  return points;
}

const BRIEF_PROMPT = `You are a trading analyst creating a consolidated morning brief from the last few days of trading notes.

Given multiple days of note summaries, create a SINGLE consolidated brief with these sections. Use exactly these headers:

## Active Setups
List every actionable trade idea with: ticker, direction (long/short), entry level, stop, target. One per line.
Format: "TICKER — long/short above/below $X, stop $Y, target $Z" or similar concise format.
Only include setups that are still relevant (not already hit targets or stopped out).

## Key Levels
For each actively discussed ticker, list the critical price levels to watch.
Format: "TICKER: support $X (description), resistance $Y (description)"
Consolidate across days — if the same ticker has levels from multiple notes, merge them.

## Catalysts
Upcoming earnings, Fed events, economic data, or other catalysts. Include dates when available.

## Market Bias
2-3 sentences on overall market sentiment and positioning from the notes.

Rules:
- Include ALL dollar amounts and percentages — never omit numbers
- If a ticker appears across multiple days, consolidate into one entry with the most recent levels
- Remove stale/expired info (e.g. earnings that already happened)
- Keep it tight and scannable — this is a quick reference, not a novel
- Use ticker symbols in ALL CAPS
- Today's date for reference: ${new Date().toISOString().split('T')[0]}
`;

/**
 * Generate a consolidated trading brief from recent note summaries.
 */
export async function generateBrief(notes) {
  if (!notes || notes.length === 0) return null;

  // Build input from summaries + content
  const input = notes.map(n => {
    const date = n.date || n.createdAt?.split('T')[0];
    const header = `--- ${date} | ${n.title} ---`;
    const body = n.summary?.length > 0
      ? n.summary.map(p => `• ${p}`).join('\n')
      : (n.content || '').slice(0, 3000);
    return `${header}\n${body}`;
  }).join('\n\n');

  const text = await callGemini(BRIEF_PROMPT + '\n\nNotes:\n' + input);
  if (!text) return null;

  // Parse sections
  const sections = {};
  let currentSection = null;
  for (const line of text.split('\n')) {
    const headerMatch = line.match(/^##\s+(.+)/);
    if (headerMatch) {
      currentSection = headerMatch[1].trim();
      sections[currentSection] = [];
    } else if (currentSection && line.trim()) {
      sections[currentSection].push(line.replace(/^[•\-*]\s*/, '').trim());
    }
  }

  return sections;
}

// ── Earnings Preview ──────────────────────────────────────────────

const earningsCache = new Map(); // ticker -> { data, expiry }
const EARNINGS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function generateEarningsPreview(ticker, context = {}) {
  const key = ticker.toUpperCase();

  // Check cache
  const cached = earningsCache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  const prompt = `You are a senior equity research analyst. Generate an earnings preview for ${key}.

Context:
- Earnings date: ${context.earningsDate || 'Unknown'}
- Current price: $${context.price || 'N/A'}
- Sector: ${context.sector || 'N/A'} / ${context.industry || 'N/A'}
- EPS (ttm): ${context.eps || 'N/A'}
- P/E: ${context.pe || 'N/A'}

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "expectedMove": "±X.X%",
  "expectedRange": "$XXX - $XXX",
  "keyMetrics": ["metric 1 with context", "metric 2", "metric 3", "metric 4"],
  "bullCase": ["point 1", "point 2", "point 3"],
  "bearCase": ["concern 1", "concern 2", "concern 3"],
  "context": "1-2 sentences about recent guidance or analyst sentiment heading into earnings"
}

Focus on what THIS specific company's earnings hinge on — the actual business drivers investors care about, not generic metrics. Be specific (e.g. "AWS revenue growth and margin trajectory" not "cloud computing").
For expectedMove, estimate based on the stock's typical historical earnings moves.
For expectedRange, calculate from the current price and expected move percentage.`;

  const text = await callGemini(prompt);
  if (!text) return null;

  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const data = JSON.parse(cleaned);
    data.ticker = key;
    data.generatedAt = new Date().toISOString();

    // Cache it
    earningsCache.set(key, { data, expiry: Date.now() + EARNINGS_CACHE_TTL });

    return data;
  } catch (e) {
    console.error('[EarningsPreview] Failed to parse Gemini response:', e.message);
    return null;
  }
}

export async function transcribeAudio(audioFilePath) {
  const outputDir = path.dirname(audioFilePath);
  const baseName = path.basename(audioFilePath, path.extname(audioFilePath));

  try {
    await execAsync(
      `"${WHISPER_BIN}" "${audioFilePath}" --model base --output_format txt --output_dir "${outputDir}" --language en`,
      { timeout: 600000 } // 10 min timeout
    );

    const txtPath = path.join(outputDir, `${baseName}.txt`);
    if (!fs.existsSync(txtPath)) {
      throw new Error('Whisper did not produce output file');
    }

    const transcript = fs.readFileSync(txtPath, 'utf-8').trim();

    // Clean up the txt output file
    try { fs.unlinkSync(txtPath); } catch { /* ignore */ }

    return transcript;
  } catch (error) {
    if (error.message.includes('command not found') || error.message.includes('not recognized')) {
      throw new Error('Whisper is not installed. Install with: pip install openai-whisper');
    }
    throw new Error(`Transcription failed: ${error.message}`);
  }
}
