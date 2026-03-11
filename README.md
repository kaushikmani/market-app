# StockAnalyzerWeb

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)

A real-time stock market analysis dashboard built for active traders. StockAnalyzerWeb aggregates live prices, technical indicators, gap scans, earnings calendars, AI-powered analysis, and multi-source news into a single dark-themed interface — all running locally on your machine. No subscriptions, no data vendor lock-in.

---

## Screenshots

> _Add screenshots of the dashboard here._

```
[ Main Dashboard ]          [ Stock Analysis Panel ]      [ Gap Scanner ]
[ Watchlist Sidebar ]       [ Alerts Panel ]              [ Earnings Calendar ]
```

---

## Features

### Market Dashboard
- **Pre-Market Report** — AI-generated macro narrative combining futures, sentiment, and overnight news
- **Market Briefing** — Scraped intraday market summary with sector rotation context
- **Gap Scanner** — Scans your entire watchlist for gap-ups and gap-downs using real-time Polygon.io snapshots
- **Pre-Market Movers** — Top pre-market gainers and losers
- **Market Sentiment** — Fear & Greed index with trend indicators
- **Theme Performance** — Sector and thematic ETF performance heatmap by time range

### Watchlist & Stock Analysis
- **Live Watchlist Prices** — Real-time prices for 100+ tickers across 15+ sector groups (Mega Cap Tech, Semiconductors, Cybersecurity, Cloud, Biotech, and more), auto-refreshing throughout the session
- **Watchlist Scanner** — Full technical scan across all watchlist tickers; flags RSI extremes, MACD crossovers, Bollinger Band squeezes, and SMA positioning
- **Stock Deep-Dive** — Click any ticker to open a full analysis panel with:
  - Interactive candlestick chart (TradingView Lightweight Charts)
  - Finviz fundamentals (P/E, EPS, sector, industry, market cap)
  - Moving averages (SMA 20/50/200) from Yahoo Finance
  - RSI, MACD, Bollinger Bands, ATR, and volatility metrics
  - Peer comparison table
  - AI-generated outlook summary
  - Earnings preview powered by Gemini

### News & Intelligence
- **Market News** — Aggregated headlines from major financial sources (10-minute cache)
- **Stock-Specific News** — Per-ticker news from Google News, Finviz, and X (formerly Twitter) in parallel
- **AI Sentiment Scoring** — Gemini scores each headline Bullish / Bearish / Neutral with a confidence rating
- **Substack Feed** — Pull articles from your followed Substack newsletters
- **X / Twitter Feed** — Curated financial Twitter feed (requires one-time login session)

### Price Alerts
- Create price alerts with conditions: above, below, crosses above, crosses below
- Toggle alerts on/off individually
- Alert state persists across server restarts
- Alert monitor polls during market hours (9:30am–4:00pm ET) using Polygon.io live data

### AI Features (Gemini-powered)
- **Ask AI** — Ask any natural language question about a stock with full technical and fundamental context injected automatically
- **Earnings Preview** — Pre-earnings AI briefing covering consensus expectations, historical beat/miss patterns, and key risk factors
- **Pre-Market Report** — Daily AI macro narrative generated at server startup
- **News Sentiment** — Batch headline scoring
- **Trading Notes Summarization** — Auto-extracts tickers and summarizes your voice/text notes
- **Notes Brief** — AI-synthesized daily trading brief from your last 4 days of notes

### Trading Journal
- **Text Notes** — Create timestamped trading notes; Gemini auto-extracts tickers and summarizes content
- **Voice Notes** — Upload audio recordings; transcribed via local Whisper, then summarized by Gemini
- **Ask Your Notes** — Query your note history with natural language (e.g., "What did I say about NVDA this week?")
- **Daily Brief** — Synthesized summary of your recent notes and trade ideas

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React | 19 |
| Build tool | Vite | 7 |
| Charts | TradingView Lightweight Charts | 4 |
| Backend framework | Express | 5 |
| Runtime | Node.js | 18+ |
| Web scraping | Playwright (Chromium) | 1.52 |
| Real-time market data | Polygon.io REST API | — |
| AI / LLM | Google Gemini 2.5 Flash | — |
| Speech-to-text | OpenAI Whisper (local CLI) | — |
| File uploads | Multer | 2 |
| Styling | Plain CSS (dark theme) | — |

### Data Sources

| Source | What it provides |
|---|---|
| **Polygon.io** | Real-time snapshots, OHLCV aggregates, SMA calculations for alerts |
| **Finviz** | Fundamentals, peer lists, stock-specific news |
| **Yahoo Finance** | SMAs (20/50/200), technical scan data |
| **Google News** | Per-ticker news aggregation |
| **X / Twitter** | Financial commentary feed |
| **Google Gemini** | AI analysis, sentiment scoring, summaries |
| **Whisper (local)** | Voice note transcription |

---

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **Chrome / Chromium** — Playwright downloads its own managed Chromium automatically on first run
- **Polygon.io API key** — Free tier sufficient for most features (see [API Keys](#api-keys))
- **Google Gemini API key** — Free tier available (see [API Keys](#api-keys))
- **Whisper CLI** _(optional)_ — Required only for voice note transcription. Install via `pip install openai-whisper`

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-username/StockAnalyzerWeb.git
cd StockAnalyzerWeb
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install server dependencies

```bash
cd server
npm install
cd ..
```

### 4. Install Playwright browsers

```bash
cd server
npx playwright install chromium
cd ..
```

### 5. Configure environment

Copy the example env file and fill in your API keys:

```bash
cp .env.example .env
```

Then edit `.env`:

```env
POLYGON_API_KEY=your_polygon_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

> See [API Keys](#api-keys) below for where to obtain each key.

### 6. Start the development servers

**Option A — Single command (both servers):**

```bash
npm install -D concurrently   # first time only if not already installed
npm run dev
```

**Option B — Two terminals:**

Terminal 1 (backend, port 3001):

```bash
cd server && npm run dev
```

Terminal 2 (frontend, port 5173):

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> On first startup the server warms all caches in the background. The dashboard will display stale disk-cached data immediately and refresh as live data arrives.

---

## API Keys

### Polygon.io (Market Data)

Used for: real-time stock snapshots, gap scanning, watchlist prices, OHLCV data, price alerts.

1. Go to [polygon.io](https://polygon.io) and create a free account
2. Navigate to **Dashboard → API Keys**
3. Copy your key into `server/config.js` as `POLYGON_API_KEY`

**Free tier limitations:** 5 API calls/minute, 2-year historical data. For active trading use, the Starter plan ($29/mo) removes rate limits and enables WebSocket streaming.

### Google Gemini API (AI Features)

Used for: stock analysis, earnings previews, pre-market reports, news sentiment scoring, note summarization.

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy your key into `server/config.js` as `GEMINI_API_KEY`

**Free tier:** 15 requests/minute, 1 million tokens/day — sufficient for personal use.

---

## Project Structure

```
StockAnalyzerWeb/
├── index.html                    # Frontend entry point
├── vite.config.js                # Vite configuration
├── package.json                  # Frontend dependencies
│
├── src/                          # React frontend
│   ├── App.jsx                   # Root component, layout, routing
│   ├── main.jsx                  # React entry point
│   ├── components/               # UI components
│   │   ├── WatchlistSidebar.jsx  # Live watchlist with sector groups
│   │   ├── GapScannerSection.jsx # Gap-up / gap-down scan results
│   │   ├── MarketBriefingSection.jsx
│   │   ├── PreMarketReportSection.jsx
│   │   ├── PreMarketMoversSection.jsx
│   │   ├── MarketSentimentSection.jsx
│   │   ├── ThemePerformanceSection.jsx
│   │   ├── EarningsCalendarSection.jsx
│   │   ├── NewsSection.jsx
│   │   ├── SubstackFeedSection.jsx
│   │   ├── StockOverviewSection.jsx
│   │   ├── StockChart.jsx        # Lightweight Charts candlestick
│   │   ├── ChartModal.jsx        # Full-screen chart modal
│   │   ├── IndicatorsSection.jsx # RSI, MACD, Bollinger Bands
│   │   ├── MovingAveragesSection.jsx
│   │   ├── VolatilityMetrics.jsx
│   │   ├── SimilarStocksSection.jsx
│   │   ├── StockNewsSection.jsx  # Multi-source stock news
│   │   ├── OutlookSection.jsx    # AI outlook summary
│   │   ├── EarningsPreviewSection.jsx
│   │   ├── TodaysSetupsSection.jsx
│   │   ├── AlertsPanel.jsx       # Price alert CRUD
│   │   ├── AskAIPanel.jsx        # Conversational AI analysis
│   │   └── TradingNotesSection.jsx
│   ├── hooks/
│   │   ├── useMarketData.js      # Main data-fetching hook
│   │   ├── useWatchlistPrices.js # Live price polling
│   │   ├── useEditableWatchlist.js
│   │   └── useNotes.js
│   ├── services/
│   │   ├── ApiService.js         # All frontend API calls
│   │   └── MockDataService.js
│   ├── models/
│   │   ├── Stock.js
│   │   └── Theme.js
│   └── data/
│       └── watchlist.js          # Frontend watchlist definition
│
└── server/                       # Express backend
    ├── index.js                  # Server entry, all API routes, cache logic
    ├── package.json              # Server dependencies
    ├── config.js                 # API keys (create this — not committed)
    ├── scrapers/                 # Playwright + fetch scrapers
    │   ├── browser.js            # Shared Playwright browser instance
    │   ├── gapScanner.js         # Polygon-based gap scan
    │   ├── watchlistScanner.js   # Full technical scan (RSI, MACD, BBands, SMAs)
    │   ├── watchlistPrices.js    # Live price fetching
    │   ├── finvizQuote.js        # Fundamentals scraper
    │   ├── finvizPeers.js        # Peer comparison scraper
    │   ├── finvizNews.js         # Finviz news scraper
    │   ├── googleNews.js         # Google News scraper
    │   ├── xNews.js              # X / Twitter feed scraper
    │   ├── yahooSMA.js           # Yahoo Finance SMA + technical data
    │   ├── marketBriefing.js     # Market briefing scraper
    │   ├── preMarketMovers.js    # Pre-market movers scraper
    │   ├── preMarketReport.js    # AI pre-market report generator
    │   ├── earningsCalendar.js   # Earnings calendar scraper
    │   ├── marketSentiment.js    # Fear & Greed index scraper
    │   ├── themePerformance.js   # Sector/theme performance
    │   └── substackFeed.js       # Substack RSS/scraper
    ├── services/
    │   ├── polygon.js            # Polygon.io API client (paginated)
    │   ├── whisperService.js     # Gemini API client + Whisper transcription
    │   └── alertMonitor.js       # Background price alert checker
    ├── routes/
    │   └── notes.js              # Trading notes CRUD + AI endpoints
    └── data/
        ├── watchlist.js          # Master watchlist (15+ sector groups)
        ├── xWhitelist.js         # Curated X accounts to follow
        ├── alerts.json           # Persisted price alerts (auto-created)
        ├── alert-state.json      # Alert trigger history (auto-created)
        ├── notes/                # Trading notes (one JSON file per note)
        │   └── uploads/          # Voice note audio files
        └── page-cache/           # Disk cache for slow scrapes (auto-created)
```

---

## Available Scripts

### Frontend (root directory)

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server at `http://localhost:5173` with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

### Backend (`server/` directory)

| Script | Description |
|---|---|
| `npm run dev` | Start server with `--watch` flag (auto-restarts on file changes) |
| `npm start` | Start server in production mode |

---

## API Endpoints

### Market Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/market-briefing` | Intraday market briefing (disk-cached) |
| `GET` | `/api/pre-market-report` | AI-generated pre-market macro narrative |
| `GET` | `/api/pre-market-movers` | Top pre-market gainers/losers (10-min cache) |
| `GET` | `/api/market-sentiment` | Fear & Greed index with score and rating |
| `GET` | `/api/theme-performance?range=today` | Sector/theme ETF performance (`today`, `1w`, `1m`) |
| `GET` | `/api/earnings-calendar` | This week and next week earnings (disk-cached) |

### Gap & Watchlist Scanning

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/gap-scanner` | Gap-ups and gap-downs across watchlist (90-sec cache) |
| `GET` | `/api/watchlist-scan` | Full technical scan across all tickers (15-min cache) |

### Stock Analysis

| Method | Endpoint | Query Params | Description |
|---|---|---|---|
| `GET` | `/api/finviz-quote` | `?ticker=NVDA` | Fundamentals, price, sector, industry |
| `GET` | `/api/finviz-peers` | `?tickers=NVDA,AMD` | Peer comparison data |
| `GET` | `/api/sma` | `?ticker=NVDA` | SMA 20/50/200 from Yahoo Finance |
| `GET` | `/api/earnings-preview` | `?ticker=NVDA` | AI-generated earnings briefing via Gemini |

### News

| Method | Endpoint | Query Params | Description |
|---|---|---|---|
| `GET` | `/api/news` | — | General market news (10-min cache) |
| `GET` | `/api/stock-news` | `?ticker=NVDA` | Per-ticker news: Google, Finviz, X combined |
| `GET` | `/api/substack-feed` | — | Substack article feed |

### Price Alerts

| Method | Endpoint | Body / Params | Description |
|---|---|---|---|
| `GET` | `/api/alerts` | — | List all alerts with last-triggered timestamps |
| `POST` | `/api/alerts` | `{ ticker, condition, price }` | Create a new alert |
| `PATCH` | `/api/alerts/:id` | `{ enabled, price, ... }` | Update alert (enable/disable, change price) |
| `DELETE` | `/api/alerts/:id` | — | Delete an alert |

### AI (Gemini)

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/ask` | `{ ticker, question, context }` | Conversational stock analysis |
| `POST` | `/api/news-sentiment` | `{ headlines: string[] }` | Batch sentiment scoring (Bullish/Bearish/Neutral) |

### Trading Notes

| Method | Endpoint | Body / Params | Description |
|---|---|---|---|
| `GET` | `/api/notes` | `?days=21` | List notes from last N days |
| `GET` | `/api/notes/brief` | — | AI-synthesized brief from last 4 days of notes (30-min cache) |
| `GET` | `/api/notes/:id` | — | Single note by ID |
| `POST` | `/api/notes` | `{ title, content, tickers, tags }` | Create text note (auto-summarized) |
| `POST` | `/api/notes/upload` | `multipart: audio file` | Upload voice note for Whisper transcription |
| `POST` | `/api/notes/ask` | `{ question, days }` | Query your notes with natural language |
| `PATCH` | `/api/notes/:id` | `{ title, content, ... }` | Update a note |
| `DELETE` | `/api/notes/:id` | — | Delete a note |

### Session Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/login` | Opens a Playwright browser for X session login (one-time setup) |

---

## Configuration

Copy `.env.example` to `.env` (this file is not committed) and fill in your keys:

| Variable | Required | Description |
|---|---|---|
| `POLYGON_API_KEY` | Yes | Polygon.io API key for real-time market data |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for all AI features |
| `PORT` | No | Server port (default: `3001`) |
| `NODE_ENV` | No | Set to `production` for Docker/deployed use |
| `BROWSER_PROFILE_DIR` | No | Custom Playwright browser profile path |

```env
# .env
POLYGON_API_KEY=your_polygon_api_key
GEMINI_API_KEY=your_gemini_api_key
PORT=3001
```

### Watchlist Customization

Edit `server/data/watchlist.js` to change which tickers are scanned for gaps, technical setups, and live prices. Each entry is a named sector group:

```js
export const WATCHLIST = [
  {
    name: 'My Group',
    tickers: ['AAPL', 'MSFT', 'GOOGL'],
  },
  // add more groups...
];
```

The parallel file at `src/data/watchlist.js` controls the frontend sidebar display and should be kept in sync.

### Alert Monitor Schedule

The alert monitor (`server/services/alertMonitor.js`) only polls during US market hours (9:30am–4:00pm ET, Monday–Friday) to conserve Polygon.io API quota.

---

## Data & Caching

The server uses a two-tier caching strategy to keep the UI fast while respecting scraper and API rate limits:

| Tier | Mechanism | Purpose |
|---|---|---|
| **In-memory cache** | JavaScript objects with expiry timestamps | Fast repeated requests within a session |
| **Disk cache** | JSON files in `server/data/page-cache/` | Instant cold-start responses on server restart |

### Cache TTLs by Endpoint

| Data | In-Memory TTL | Disk Cache |
|---|---|---|
| News | 10 minutes | Yes |
| Gap Scanner | 90 seconds | Yes |
| Pre-Market Movers | 10 minutes | No |
| Watchlist Scan | 15 minutes | Yes |
| Market Briefing | Per-request | Yes (persisted until next scrape) |
| Pre-Market Report | Per-request | Yes (persisted until next generation) |
| Earnings Calendar | Per-request | Yes |
| Market Sentiment | Per-request | Yes |
| Notes Brief | 30 minutes | No |

On server startup, all caches are warmed in the background. Browser-dependent tasks (Market Briefing, Pre-Market Report, Substack Feed) are serialized through a mutex because Playwright's persistent browser context only allows one instance at a time.

---

## Scraping Notice

This application uses Playwright to scrape publicly accessible financial websites (Finviz, Yahoo Finance, Google News) for personal, non-commercial use.

**Please use this tool responsibly:**

- This project is intended for **personal use only**
- Do not deploy it to scrape at high frequency or in bulk
- Respect each site's `robots.txt` and Terms of Service
- The server already adds delays between scraper requests to reduce load on target sites
- Do not use this to build commercial data products

The authors take no responsibility for misuse. Always check whether a site offers an official API before relying on scraping.

---

## Contributing

Contributions are welcome. To get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit: `git commit -m 'Add your feature'`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a Pull Request

**Ideas for contributions:**
- Additional technical indicators (VWAP, Ichimoku, Volume Profile)
- Options flow integration
- Portfolio P&L tracking
- Export to CSV / PDF
- Mobile-responsive layout improvements
- Test coverage

Please open an issue first for large changes to discuss the approach before investing time in implementation.

---

## License

This project is licensed under the [MIT License](LICENSE).

```
MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
