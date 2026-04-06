import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { transcribeAudio, extractTickers, summarizeTranscript, generateBrief, callGemini, callGeminiDirect, callGeminiStream } from '../services/whisperService.js';
import { getQuotes } from '../services/schwab.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOTES_DIR = path.join(__dirname, '..', 'data', 'notes');
const UPLOADS_DIR = path.join(NOTES_DIR, 'uploads');

// Ensure directories exist
if (!fs.existsSync(NOTES_DIR)) fs.mkdirSync(NOTES_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_MIMETYPES = [
  'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/m4a', 'audio/ogg', 'audio/wav', 'audio/x-m4a',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
];

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' is not allowed`));
    }
  },
});
const router = express.Router();

const heavyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests for this endpoint.' },
});

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getNoteFilePath(id) {
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(String(id))) throw new Error('Invalid note id');
  const resolved = path.resolve(NOTES_DIR, `${id}.json`);
  if (!resolved.startsWith(path.resolve(NOTES_DIR) + path.sep)) throw new Error('Invalid note id');
  return resolved;
}

function readNote(id) {
  const filePath = getNoteFilePath(id);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeNote(note) {
  fs.writeFileSync(getNoteFilePath(note.id), JSON.stringify(note, null, 2));
  return note;
}

function getAllNotes() {
  if (!fs.existsSync(NOTES_DIR)) return [];
  return fs.readdirSync(NOTES_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(NOTES_DIR, f), 'utf-8'));
      } catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// GET /api/notes — list notes, optional ?days=21 filter
router.get('/notes', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 21;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const ticker = req.query.ticker?.toUpperCase() || null;
    const notes = getAllNotes()
      .filter(n => new Date(n.createdAt) >= cutoff)
      .filter(n => !ticker || n.tickers?.includes(ticker));
    res.json({ success: true, notes, count: notes.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notes/gameplan — generate today's game plan from today's notes
const GAMEPLAN_PROMPT = `You are a trading coach reviewing a trader's notes from today.
Generate a structured game plan for the trading session based on these notes.

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "bias": "bullish" | "bearish" | "neutral",
  "biasReason": "one concise sentence explaining the bias",
  "keyLevels": ["level description 1", "level description 2"],
  "setups": ["setup description 1", "setup description 2"],
  "risks": ["risk 1", "risk 2"],
  "watchlist": ["TICKER1", "TICKER2"]
}

Rules:
- bias must be exactly one of: bullish, bearish, neutral
- Keep each item to one line max
- Max 4 items per array
- watchlist should only contain uppercase ticker symbols mentioned in the notes
- If a field has nothing relevant, return an empty array`;

router.get('/notes/gameplan', heavyLimiter, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const notes = getAllNotes().filter(n => (n.date || n.createdAt?.slice(0, 10)) === today);

    if (notes.length === 0) {
      return res.json({ success: true, hasNotes: false });
    }

    const input = notes.map(n => {
      const body = n.summary?.length > 0
        ? n.summary.join('\n')
        : (n.content || '').slice(0, 2000);
      return `[${n.title || 'Note'}]\n${body}`;
    }).join('\n\n---\n\n');

    const text = await callGeminiDirect(GAMEPLAN_PROMPT + '\n\nNotes:\n' + input);
    if (!text) return res.json({ success: true, hasNotes: true, plan: null, error: 'Generation failed' });

    // Strip markdown fences if present
    const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    const plan = JSON.parse(cleaned);
    res.json({ success: true, hasNotes: true, plan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notes/brief — consolidated trading brief from last 4 days
let briefCache = { data: null, generatedAt: 0 };
const BRIEF_TTL = 30 * 60 * 1000; // 30 min cache

router.get('/notes/brief', heavyLimiter, async (req, res) => {
  try {
    // Return cache if fresh
    if (briefCache.data && (Date.now() - briefCache.generatedAt) < BRIEF_TTL) {
      return res.json({ success: true, brief: briefCache.data, cached: true });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 4);
    const notes = getAllNotes()
      .filter(n => new Date(n.createdAt) >= cutoff)
      .filter(n => n.content || (n.summary && n.summary.length > 0));

    if (notes.length === 0) {
      return res.json({ success: true, brief: null, message: 'No recent notes' });
    }

    const brief = await generateBrief(notes);
    if (brief) {
      briefCache = { data: brief, generatedAt: Date.now() };
    }
    res.json({ success: true, brief });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notes/yesterday-watchlist — tickers from yesterday's notes with live prices
router.get('/notes/yesterday-watchlist', async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const notes = getAllNotes().filter(n => {
      const d = n.date || n.createdAt?.slice(0, 10);
      return d === yesterdayStr;
    });

    const tickerSet = new Set();
    notes.forEach(n => (n.tickers || []).forEach(t => tickerSet.add(t.toUpperCase())));
    const tickers = Array.from(tickerSet);

    if (tickers.length === 0) return res.json({ success: true, tickers: [], date: yesterdayStr });

    const quotes = await getQuotes(tickers);
    const result = tickers.map(ticker => {
      const q = quotes[ticker] || {};
      return {
        ticker,
        price: q.price ?? null,
        changePct: q.changePct ?? null,
        change: q.change ?? null,
        preMarketChangePct: q.preMarketChangePct ?? null,
      };
    }).filter(r => r.price !== null);

    res.json({ success: true, tickers: result, date: yesterdayStr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── All-notes AI summary ──────────────────────────────────────────────────────
let summaryCache = { data: null, generatedAt: 0 };
const SUMMARY_CACHE_TTL = 15 * 60 * 1000; // 15 min

export function invalidateSummaryCache() {
  summaryCache = { data: null, generatedAt: 0 };
}

const ALL_NOTES_SUMMARY_PROMPT = `You are a trading coach reviewing a trader's personal journal from the last 3 weeks.

Write a comprehensive summary of everything this trader has been thinking about, watching, and working on.
Organize it into readable paragraphs — not bullet points. Cover:
1. What stocks/sectors they've been focused on and their thesis for each
2. Key price levels and setups they've identified
3. Patterns in their thinking (recurring themes, biases, concerns)
4. Notable trades or ideas mentioned

Be specific — include ticker symbols, price levels, and exact setups when they appear.
Write in second person ("You've been watching...", "Your thesis on NVDA is...").
Keep it concise but complete — aim for 3-5 paragraphs.

Notes:
`;

export async function generateNotesSummary() {
  const allNotes = getAllNotes()
    .filter(n => n.content || (n.summary && n.summary.length > 0))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (allNotes.length === 0) return;

  // Find the 3 most recent distinct dates that have notes
  const dates = [...new Set(allNotes.map(n => n.date || n.createdAt?.slice(0, 10)))];
  const recentDates = new Set(dates.slice(0, 3));
  const notes = allNotes.filter(n => recentDates.has(n.date || n.createdAt?.slice(0, 10)));

  if (notes.length === 0) return;

  const input = notes.map(n => {
    const body = n.summary?.length > 0
      ? n.summary.join('\n')
      : (n.content || '').slice(0, 2000);
    const tickers = n.tickers?.length ? ` [${n.tickers.join(', ')}]` : '';
    return `[${n.date}] ${n.title}${tickers}\n${body}`;
  }).join('\n\n---\n\n');

  const text = await callGeminiDirect(ALL_NOTES_SUMMARY_PROMPT + input, 3, 800);
  if (text) summaryCache = { data: text.trim(), generatedAt: Date.now() };
}

router.get('/notes/summary', heavyLimiter, async (req, res) => {
  try {
    const force = req.query.force === 'true';
    if (!force && summaryCache.data && (Date.now() - summaryCache.generatedAt) < SUMMARY_CACHE_TTL) {
      return res.json({ success: true, summary: summaryCache.data, cached: true });
    }

    await generateNotesSummary();
    if (!summaryCache.data) return res.json({ success: true, summary: null, message: 'No recent notes' });
    res.json({ success: true, summary: summaryCache.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notes/summary/stream — SSE streaming version
router.get('/notes/summary/stream', heavyLimiter, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const force = req.query.force === 'true';

  // Serve from cache instantly if warm
  if (!force && summaryCache.data && (Date.now() - summaryCache.generatedAt) < SUMMARY_CACHE_TTL) {
    res.write(`data: ${JSON.stringify({ text: summaryCache.data, done: true })}\n\n`);
    res.end();
    return;
  }

  // Build notes input (same logic as generateNotesSummary)
  const allNotes = getAllNotes()
    .filter(n => n.content || (n.summary && n.summary.length > 0))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (allNotes.length === 0) {
    res.write(`data: ${JSON.stringify({ done: true, empty: true })}\n\n`);
    res.end();
    return;
  }

  const dates = [...new Set(allNotes.map(n => n.date || n.createdAt?.slice(0, 10)))];
  const recentDates = new Set(dates.slice(0, 3));
  const notes = allNotes.filter(n => recentDates.has(n.date || n.createdAt?.slice(0, 10)));

  const input = notes.map(n => {
    const body = n.summary?.length > 0 ? n.summary.join('\n') : (n.content || '').slice(0, 2000);
    const tickers = n.tickers?.length ? ` [${n.tickers.join(', ')}]` : '';
    return `[${n.date}] ${n.title}${tickers}\n${body}`;
  }).join('\n\n---\n\n');

  try {
    const fullText = await callGeminiStream(
      ALL_NOTES_SUMMARY_PROMPT + input,
      (token) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify({ token })}\n\n`); },
      800
    );
    summaryCache = { data: fullText.trim(), generatedAt: Date.now() };
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  } catch (e) {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
      res.end();
    }
  }
});

// GET /api/notes/:id — single note
router.get('/notes/:id', (req, res) => {
  try {
    const note = readNote(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notes — create text note
router.post('/notes', async (req, res) => {
  try {
    const { title, content, tickers = [], tags = [] } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const autoTickers = extractTickers(content);
    const allTickers = [...new Set([...tickers, ...autoTickers])].sort();

    const summary = await summarizeTranscript(content);

    const note = writeNote({
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      type: 'text',
      title: title || `Note — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      content,
      summary,
      tickers: allTickers,
      tags,
      createdAt: new Date().toISOString(),
    });

    invalidateSummaryCache();
    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notes/ask — ask a question about your notes (SSE streaming)
router.post('/notes/ask', heavyLimiter, async (req, res) => {
  try {
    const { question, days = 30 } = req.body;
    if (!question?.trim()) return res.status(400).json({ error: 'Question required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const allNotes = getAllNotes()
      .filter(n => new Date(n.createdAt) >= cutoff)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // most recent first

    if (!allNotes.length) {
      res.write(`data: ${JSON.stringify({ done: true, answer: `No notes found in the last ${days} days.` })}\n\n`);
      res.end(); return;
    }

    // Extract ticker mentions from the question
    const questionUpper = question.toUpperCase();
    const dollarTickers = (question.match(/\$([A-Z]{1,5})\b/g) || []).map(t => t.slice(1).toUpperCase());
    const allKnownTickers = [...new Set(allNotes.flatMap(n => n.tickers || []).map(t => t.toUpperCase()))];
    const wordTickers = allKnownTickers.filter(t => new RegExp(`\\b${t}\\b`).test(questionUpper));
    const mentionedTickers = [...new Set([...dollarTickers, ...wordTickers])];

    let notes = allNotes;

    if (mentionedTickers.length > 0) {
      // 1st pass: notes tagged with the ticker
      let tickerNotes = allNotes.filter(n =>
        n.tickers?.some(t => mentionedTickers.includes(t.toUpperCase()))
      );

      // 2nd pass: full-text search if tag lookup found nothing
      if (tickerNotes.length === 0) {
        tickerNotes = allNotes.filter(n => {
          const text = ((n.content || '') + ' ' + (n.summary || []).join(' ')).toUpperCase();
          return mentionedTickers.some(t => text.includes(t));
        });
      }

      if (tickerNotes.length > 0) {
        // For ticker-specific questions, limit to the 3 most recent relevant notes
        notes = tickerNotes.slice(0, 3);
      } else {
        // Ticker not found in any notes at all
        res.write(`data: ${JSON.stringify({ done: true, answer: `I couldn't find any notes mentioning ${mentionedTickers.join(', ')}.` })}\n\n`);
        res.end(); return;
      }
    } else {
      // General question — use the 5 most recent notes
      notes = allNotes.slice(0, 5);
    }

    const context = notes.map(n => {
      const summaryText = Array.isArray(n.summary) && n.summary.length > 0
        ? n.summary.join('\n')
        : '';
      const body = (summaryText || n.content || '').slice(0, 2500);
      const tickers = n.tickers?.length ? ` [${n.tickers.join(', ')}]` : '';
      return `[${n.date || n.createdAt?.slice(0, 10)}] ${n.title}${tickers}\n${body}`;
    }).join('\n\n---\n\n');

    const prompt = `You are analyzing a trader's personal journal. Answer the question based ONLY on the notes provided. Be direct and specific — include exact dates, price levels, and tickers from the notes. If not in the notes, say so.

NOTES:
${context}

QUESTION: ${question}

Answer concisely (2-5 sentences):`;

    let answered = false;
    await callGeminiStream(
      prompt,
      (token) => {
        if (!res.writableEnded) {
          answered = true;
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }
      },
      500
    );

    if (!res.writableEnded) {
      if (!answered) res.write(`data: ${JSON.stringify({ token: 'No answer generated. Try rephrasing.' })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  } catch (error) {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});


// In-memory transcription job status
const transcriptionJobs = new Map(); // jobId → { stage, progress, note, error }

// GET /api/notes/transcription-status/:jobId
router.get('/notes/transcription-status/:jobId', (req, res) => {
  const job = transcriptionJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// POST /api/notes/upload-audio — upload audio, transcribe async, return jobId immediately
router.post('/notes/upload-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    const originalName = req.file.originalname;
    const ext = path.extname(originalName) || '.m4a';
    const audioPath = `${req.file.path}${ext}`;
    fs.renameSync(req.file.path, audioPath);

    const jobId = generateId();
    transcriptionJobs.set(jobId, { stage: 'transcribing', progress: 10 });

    // Return jobId immediately so client can poll
    res.json({ success: true, jobId, status: 'transcribing' });

    // Run transcription pipeline in background
    (async () => {
      try {
        transcriptionJobs.set(jobId, { stage: 'transcribing', progress: 20 });
        const transcript = await transcribeAudio(audioPath);

        transcriptionJobs.set(jobId, { stage: 'extracting', progress: 60 });
        const tickers = extractTickers(transcript);

        transcriptionJobs.set(jobId, { stage: 'summarizing', progress: 75 });
        const summary = await summarizeTranscript(transcript);

        transcriptionJobs.set(jobId, { stage: 'saving', progress: 90 });
        const note = writeNote({
          id: generateId(),
          date: new Date().toISOString().split('T')[0],
          type: 'audio',
          title: req.body?.title || `Morning Call — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          content: transcript,
          summary,
          tickers,
          tags: req.body?.tags ? JSON.parse(req.body.tags) : ['morning-call'],
          audioFile: path.basename(audioPath),
          createdAt: new Date().toISOString(),
        });

        invalidateSummaryCache();
        transcriptionJobs.set(jobId, { stage: 'done', progress: 100, note });
        // Clean up job after 5 minutes
        setTimeout(() => transcriptionJobs.delete(jobId), 5 * 60 * 1000);
      } catch (error) {
        transcriptionJobs.set(jobId, { stage: 'error', progress: 0, error: error.message });
      }
    })();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notes/upload-images — upload images, attach to a new or existing note
router.post('/notes/upload-images', upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    // Rename files to keep extensions
    const imageFiles = req.files.map(file => {
      const ext = path.extname(file.originalname) || '.png';
      const newName = `${path.basename(file.path)}${ext}`;
      const newPath = path.join(UPLOADS_DIR, newName);
      fs.renameSync(file.path, newPath);
      return newName;
    });

    // If noteId provided, attach to existing note
    const noteId = req.body?.noteId;
    if (noteId) {
      const note = readNote(noteId);
      if (!note) return res.status(404).json({ error: 'Note not found' });
      note.images = [...(note.images || []), ...imageFiles];
      writeNote(note);
      return res.json({ success: true, note, images: imageFiles });
    }

    // Otherwise create a new image note
    const note = writeNote({
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      type: 'image',
      title: req.body?.title || `Screenshots — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      content: req.body?.content || '',
      tickers: req.body?.content ? extractTickers(req.body.content) : [],
      tags: req.body?.tags ? JSON.parse(req.body.tags) : [],
      images: imageFiles,
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notes/:id/summarize — re-summarize an existing note with Gemini
router.post('/notes/:id/summarize', async (req, res) => {
  try {
    const note = readNote(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (!note.content) return res.status(400).json({ error: 'Note has no content to summarize' });

    const summary = await summarizeTranscript(note.content);
    note.summary = summary;
    writeNote(note);
    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/notes/:id — update note
router.put('/notes/:id', (req, res) => {
  try {
    const note = readNote(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const { title, content, summary, tickers, tags } = req.body;
    if (title !== undefined) note.title = title;
    if (content !== undefined) {
      note.content = content;
      const autoTickers = extractTickers(content);
      note.tickers = [...new Set([...(tickers || note.tickers), ...autoTickers])].sort();
    }
    if (summary !== undefined) note.summary = summary;
    if (tickers !== undefined && content === undefined) note.tickers = tickers;
    if (tags !== undefined) note.tags = tags;

    writeNote(note);
    invalidateSummaryCache();
    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/notes/:id — delete note
router.delete('/notes/:id', (req, res) => {
  try {
    const filePath = getNoteFilePath(req.params.id);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Note not found' });

    // Also delete audio file and images if they exist
    const note = readNote(req.params.id);
    if (note?.audioFile) {
      try { fs.unlinkSync(path.join(UPLOADS_DIR, note.audioFile)); } catch { /* ignore */ }
    }
    if (note?.images) {
      for (const img of note.images) {
        try { fs.unlinkSync(path.join(UPLOADS_DIR, img)); } catch { /* ignore */ }
      }
    }

    fs.unlinkSync(filePath);
    invalidateSummaryCache();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
