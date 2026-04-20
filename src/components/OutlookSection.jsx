import React, { useState } from 'react';
import { Theme } from '../models/Theme';

const COACHING_SESSIONS = [
  {
    id: 'session-1',
    session: 1,
    date: 'Jan 28, 2026',
    title: 'Session 1 — Introduction to IC Insiders Coaching',
    videoUrl: 'https://www.youtube.com/watch?v=bbSpB_IIbVo',
    videoType: 'youtube',
    duration: '1 hr 11 min',
    summary: 'First session of the IC Insiders Group Coaching program with David Prince. Introductory format covering the coaching program structure and David\'s overall trading philosophy.',
    keyTakeaways: [
      'Inaugural session establishing the IC Insiders Group Coaching format with David Prince (T3 Live)',
      'Group coaching / Q&A style — members bring questions and setups to each session',
      'Full replay available on YouTube',
    ],
  },
  {
    id: 'session-2',
    session: 2,
    date: 'Feb 11, 2026',
    title: 'Session 2 — How I Use Charts and Technical Analysis',
    videoUrl: 'https://www.youtube.com/watch?v=W7O5fNFKVHY',
    videoType: 'youtube',
    duration: '59 min 58 sec',
    summary: 'David Prince teaches how he uses charts and TA in trading — three-timeframe framework, moving averages, volume analysis, and his setup checklist before every entry.',
    keyTakeaways: [
      'Three timeframes: weekly for dominant trend, daily for setup identification, intraday (60-min/5-min) for entry precision',
      'Moving averages: 20-day (momentum pullbacks), 50-day (medium-term benchmark), 200-day (bull/bear dividing line)',
      'Volume confirms price — breakouts need high volume; pullbacks should show volume dry-up (VDU)',
      'Setup checklist: market trend aligned, stock trend aligned, clear entry trigger, defined stop, 2:1 R/R minimum, volume confirmed',
      'Common mistake: chasing breakouts without volume, ignoring the weekly trend, or fighting the higher timeframe',
    ],
  },
  {
    id: 'session-3',
    session: 3,
    date: 'Feb 13, 2026',
    title: 'Session 3 — Growing a Smaller Account + A+ Setups',
    videoUrl: 'https://us06web.zoom.us/rec/share/ug8Tinb286rSBIo_oMnx7v6_YDiFLOYRJhKGM90kocouPeb3LHKDzc1XktfBAh0.rXLqstV89T-vCmds',
    videoType: 'zoom',
    zoomPassword: 'X5Y##s@b',
    duration: null,
    summary: 'How to grow a smaller trading account by being ruthlessly selective — focusing only on A+ setups and avoiding the over-trading trap that erodes capital.',
    keyTakeaways: [
      'A+ setup criteria: macro aligned, leading sector, strong relative strength stock, clean chart base, volume confirmation, clear stop, 2:1+ R/R',
      'Risk no more than 1-2% of account per trade — non-negotiable for small accounts',
      'Run 3-5 positions max; concentrate in fewer, better setups rather than spreading thin',
      'If no A+ setup exists, the correct action is NO TRADE — cash is a valid position',
      'Track win rate by grade (A/B/C) after each trade — A+ win rate should significantly exceed B/C to validate criteria',
    ],
  },
  {
    id: 'session-4',
    session: 4,
    date: 'Feb 18, 2026',
    title: 'Session 4 — Approach to Earnings Season',
    videoUrl: 'https://www.youtube.com/watch?v=coM5ToWhcRQ',
    videoType: 'youtube',
    duration: '1 hr 1 min 56 sec',
    summary: 'David\'s systematic approach to earnings events — pre-earnings positioning, managing gap risk, implied volatility dynamics, and the post-earnings reaction playbook.',
    keyTakeaways: [
      'Chart structure before earnings predicts the reaction better than the actual numbers',
      'Three strategies: hold through (reduce to 50-75% size), sell before (protect gains, no coin flip), or trade the post-earnings reaction',
      'Know the expected move from options pricing — if buying options, the stock must move MORE than the expected move to profit (IV crush)',
      'Size a position before earnings as if you could lose the entire amount overnight — gap risk bypasses stops',
      'Post-earnings playbook: gap up + hold HOD = continuation; gap up + fade = failed breakout; gap down + VWAP recovery = potential long; gap down continues = avoid',
    ],
  },
  {
    id: 'session-5',
    session: 5,
    date: 'Mar 4, 2026',
    title: 'Session 5 — Trading Around a Core Position + Market Trends',
    videoUrl: 'https://www.youtube.com/watch?v=MlssFhlbdw8',
    videoType: 'youtube',
    duration: '1 hr 3 min',
    summary: 'Two topics: trading around a core long-term position for additional cash flow (scaling, covered calls, separate scalps), and a top-down process for finding focus ideas each week.',
    keyTakeaways: [
      'Core position = long-term conviction hold; trading around it (trims, adds, covered calls) adds 10-30% additional return on the same underlying',
      'Scale in/out: trim 25-33% at resistance, add back at support — never cut the full core below 50% of target size',
      'Covered calls: sell OTM weekly/monthly calls at next resistance level to collect premium; avoid during expected big moves or catalysts',
      'Top-down process: SPY/QQQ weekly vs 20-week MA (bull/bear) → top 2-3 sectors by RS → leaders within sector → setup quality check',
      'David\'s Sunday routine: review macro, identify top sectors, screen RS leaders, build Tier 1 watchlist (3-5 names), set alerts for Monday',
    ],
  },
  {
    id: 'session-6',
    session: 6,
    date: 'Mar 11, 2026',
    title: 'Session 6 — Screen Setup + Focus Watchlists',
    videoUrl: 'https://www.youtube.com/watch?v=ol2MV_RkkR8',
    videoType: 'youtube',
    duration: '1 hr 24 min',
    summary: 'Optimal multi-monitor screen layout for trading, building a focused sector-based watchlist of 15-25 names, and a bonus scalping lesson on trading familiar names.',
    keyTakeaways: [
      'Monitor layout: M1 = active charts (5-min + 1-min); M2 = market overview (SPY/QQQ/IWM + TICK/TRIN/ADD); M3 = watchlist with Level 2/T&S',
      'Chart layout per stock: daily (big picture trend/levels) + 5-min/1-min (intraday entry timing) — both timeframes always visible',
      'Focus watchlist: 15-25 names max — Tier 1 (trade today: 3-5), Tier 2 (watching for setup: 8-10), Tier 3 (research: 5-10)',
      'Sector watchlist: Tech (NVDA, AMD, MSFT, META), Energy (XOM, CVX), Financials (JPM, GS), Healthcare (UNH, LLY), always SPY/QQQ/IWM',
      'Scalping tip: scalp names you know well — familiarity with a stock\'s VWAP behavior removes hesitation and leads to cleaner exits',
    ],
  },
  {
    id: 'session-7',
    session: 7,
    date: 'Mar 20, 2026',
    title: 'Session 7 — Principles of Running Money for More Alpha',
    videoUrl: 'https://www.youtube.com/watch?v=Datfy9xMoo8',
    videoType: 'youtube',
    duration: '1 hr 3 min',
    summary: 'How to generate returns above the S&P 500 benchmark — concentration over diversification, sizing by conviction, letting winners run, cutting losers fast, and sector rotation.',
    keyTakeaways: [
      'Alpha = performance above SPY; owning 30-40 stocks makes you a closet index fund — run 5-10 high-conviction positions',
      'Size by conviction tier: Tier 1 (15-25% of portfolio), Tier 2 (8-12%), Tier 3 speculative (3-5%)',
      '60-70% of a stock\'s move is driven by sector and market trend — being in the right sector matters more than individual stock picking',
      'Letting winners run (trailing stops, think in multiples of R) adds more alpha than finding more winners',
      'Cutting losers fast preserves alpha — down 50% requires up 100% to recover; no position down more than 2x initial risk',
    ],
  },
  {
    id: 'session-8',
    session: 8,
    date: 'Mar 25, 2026',
    title: 'Session 8 — Swing Trading vs Scalping',
    videoUrl: 'https://www.youtube.com/watch?v=woC3BF_lFDM',
    videoType: 'youtube',
    duration: '1 hr 5 min',
    summary: 'Fundamental differences between swing trading and scalping — timeframes, chart usage, position sizing, psychological demands, and the common mistake of confusing the two.',
    keyTakeaways: [
      'Swing trading: 2 days to weeks, daily/weekly charts, wider stops, smaller size, targets multi-day trends with patience',
      'Scalping: seconds to minutes, 1-min/5-min charts, tight stops, larger size, requires full screen attention and fast decisions',
      'Key mistake: turning a scalp into a swing trade (holding a loser) or a swing into a scalp (exiting early on intraday noise)',
      'Define the trade type BEFORE entry — match your chart timeframe to your intended hold period',
      'Many pros combine both: swing trade a core account for larger gains, scalp for daily cash flow — but master one style first',
    ],
  },
  {
    id: 'session-9',
    session: 9,
    date: 'Apr 1, 2026',
    title: 'Session 9 — When to Use P/E (and When Not To)',
    videoUrl: null,
    videoType: 'zoom',
    duration: null,
    summary: 'When the price-to-earnings ratio is a useful filter for trade decisions and when it actively misleads. Replay link delivered Apr 2 — detailed notes pending after rewatch.',
    keyTakeaways: [
      'Topic focus: when to use P/E and when not to + a how-to follow-on segment',
      'Replay link arrived in Gmail (info@t3live.com, Apr 2 2026) — fill in specifics after watching',
    ],
  },
  {
    id: 'session-10',
    session: 10,
    date: 'Apr 15, 2026',
    title: 'Session 10 — Trading + Emotion',
    videoUrl: null,
    videoType: 'zoom',
    duration: null,
    summary: 'Managing emotion in active trading — the gap between knowing the rules and following them when capital is on the line. Replay link delivered Apr 15 — detailed notes pending after rewatch.',
    keyTakeaways: [
      'Topic focus: trading psychology and the emotional component of execution',
      'Replay link arrived in Gmail (info@t3live.com, Apr 15 2026) — fill in specifics after watching',
    ],
  },
];

const THEMES = [
  {
    id: 'macro',
    title: 'Macro Outlook',
    sentiment: 'cautious',
    summary: 'H1 2026 correction likely creates buying opportunities. S&P at 23X earnings after 3 big years. Midterm year volatility typical.',
    keyPoints: [
      'S&P trading at 23X earnings — well above historic norm, susceptible to correction',
      'QQQ 3-year return nearly 130%, moved 50% off April lows',
      'SOXL rose 500%+ from April lows — #1 buy call',
      '10-20% QQQ correction possible in H1 2026',
      'QQQ $540 area is ideal to add risk (high before recent breakout)',
      'New Fed chairman steps in — no series of rate cuts without weak economy',
      'Days of chasing highs to sell at new highs are over — buy bases and first breakouts',
    ],
    tickers: ['QQQ', 'SOXL', 'SPY'],
    targets: { 'QQQ': 'Buy zone ~$540 on correction' },
  },
  {
    id: 'ai',
    title: 'AI & Semiconductors',
    sentiment: 'bullish',
    summary: 'AI potential equal to or larger than the internet. NVDA remains a buy-the-dip name. Market won\'t rely on Mag 7 as in years past.',
    keyPoints: [
      'AI potential is equal to or larger than the internet',
      'Market can\'t ride NVDA, GOOGL and semis for another 3 years — rotation happening',
      'NVDA has dominant lead at modest 25X P/E — buy all major dips',
      'Strategy: buy Yen panics, tariff lows, any 20%+ drawdowns',
      'Strong rotation out of large cap tech towards year-end into financials, biotech, space',
    ],
    tickers: ['NVDA', 'GOOGL'],
    targets: { 'NVDA': 'Buy any 20%+ drawdown' },
  },
  {
    id: 'tsla',
    title: 'Tesla',
    sentiment: 'neutral',
    summary: 'Valuation bets on robotics & robotaxis, not cars. Expect $400 again unless Optimus & FSD progress. Better entry in 2026.',
    keyPoints: [
      'Valuation is asking "who cares about cars" — TAM on robotics & robotaxis trumps cars',
      'Really a bet on Elon and the narratives, not P/E or car demand',
      'Expect $400 again without more Optimus & FSD progress',
      'Looking into 2027, that would be an opportunity',
      'Not bearish — just expect a better entry in 2026',
    ],
    tickers: ['TSLA'],
    targets: { 'TSLA': 'Wait for ~$400 re-entry' },
  },
  {
    id: 'evtol',
    title: 'eVTOL / Flying Taxis',
    sentiment: 'bullish',
    summary: 'Breakthrough year for eVTOL. JOBY launching in Dubai. Sector could take off like quantum names. Top picks: JOBY, EVTL, ACHR.',
    keyPoints: [
      'JOBY launching electric air taxi business in Dubai in 2026',
      'Sector will take off like quantum names (some without near-term revenue)',
      'EVTL — famed investor Jason Mudrick leading, large insider buying last month',
      'ACHR — Brett Adcock (Figure CEO) involved, works with Anduril',
      'JOBY is clear leader with catalyst, real revenue base after Blade merger',
      'Smaller stocks with plenty of volatility — don\'t oversize',
      'When Anduril IPOs — plan to buy and hold for a decade',
    ],
    tickers: ['JOBY', 'EVTL', 'ACHR'],
    targets: {},
  },
  {
    id: 'housing',
    title: 'Housing',
    sentiment: 'bullish',
    summary: 'Homebuilders in correction mode. Without rate decline, housing deteriorates near-term but companies have weathered the storm. Bullish for H2 2026.',
    keyPoints: [
      'Homebuilders in correction mode — poor earnings from the group',
      'US housing supply increasing, buyers on sidelines without rate decline',
      'Companies survived rough cycle via cost cuts and lower pricing',
      'Bullish on DHI, TOL, LEN on weakness ahead of H2 2026 recovery',
      'RKT is favorite rates play — behemoth with 2 large acquisitions',
      'RKT expected above $30 by year-end — must-own long-term',
    ],
    tickers: ['DHI', 'TOL', 'LEN', 'RKT'],
    targets: { 'RKT': 'Above $30 by year-end' },
  },
  {
    id: 'cannabis',
    title: 'Cannabis Comeback',
    sentiment: 'bullish',
    summary: 'Schedule I to III reclassification eliminates 280E tax burden. MSO profitability could jump several hundred percent. MSOS 50%+ upside.',
    keyPoints: [
      'Industry-friendly President could drive federal scheduling change',
      'Schedule III eliminates IRC Section 280E — businesses can deduct normal expenses',
      'MSO profitability would jump several hundred percent',
      'MSOS is simplest play — 50% upside on low end',
      'GTBIF (Green Thumb) is a favorite in the space',
      'Supply/demand headwinds and black market still hurt, but profit jump can\'t be ignored',
      'Institutions will finally be able to own many of these stocks',
    ],
    tickers: ['MSOS', 'GTBIF'],
    targets: { 'MSOS': '50%+ upside' },
  },
  {
    id: 'imnm',
    title: 'Immunome (IMNM)',
    sentiment: 'bullish',
    summary: 'Led by Clay Siegall (ex-Seagen CEO, $43B Pfizer acquisition). Varegacestat Phase 3 cut disease progression by 84%. 40-50% gain expected.',
    keyPoints: [
      'Clay Siegall — former founder & CEO of Seagen (acquired by Pfizer for $43B)',
      'Buys companies for pennies and gets late-stage drugs to finish line',
      'Varegacestat Phase 3 RINGSIDE trial: 84% reduction in disease progression',
      'Siegall bought shares under $10, near $17, and in offering at $21.50',
      'See 40-50% gain in 2026 — only buy on weakness after monster move',
    ],
    tickers: ['IMNM'],
    targets: { 'IMNM': '40-50% gain in 2026, buy weakness' },
  },
  {
    id: 'crm',
    title: 'Salesforce (CRM)',
    sentiment: 'bullish',
    summary: 'Favorite large cap tech name, down 20% in 2025. Agentforce AI ARR $500M+, up 330% YoY. Trading at 20X PE below average. Target above $300.',
    keyPoints: [
      'Down 20% in 2025 as software names missed the AI bull market',
      'Agentforce AI ARR surpassed $500M — 330% increase YoY',
      'Key driver of earnings beat last quarter',
      'Trading at 20X PE, well below average multiple as growth resumes',
      'Target well above $300 in 2026',
    ],
    tickers: ['CRM'],
    targets: { 'CRM': 'Well above $300 in 2026' },
  },
  {
    id: 'memory',
    title: 'Storage & Memory (Caution)',
    sentiment: 'bearish',
    summary: 'SNDK up 500%, MU up 220% in 2025. Memory is a commodity — supply coming online. Within 10-20% of a top. Potential short opportunities.',
    keyPoints: [
      'SNDK top S&P 500 performer of 2025 — 500%+ since spinoff',
      'MU up 220% — not expensive at 14X 2026 estimates',
      'AI increased demand + limited supply drove memory prices up',
      'Memory is a commodity — all major companies racing to build supply',
      'Within 10-20% of a top — do not chase',
      'Decent short opportunities in the months ahead once supply comes online',
    ],
    tickers: ['SNDK', 'MU', 'STX', 'WDC'],
    targets: { 'SNDK': 'Near top, short candidate', 'MU': 'Near top, short candidate' },
  },
];

const SENTIMENT_STYLES = {
  bullish: { color: Theme.colors.bullishGreen, bg: Theme.colors.bullishGreenBg, border: Theme.colors.bullishGreenBorder, label: 'Bullish' },
  bearish: { color: Theme.colors.bearishRed, bg: Theme.colors.bearishRedBg, border: Theme.colors.bearishRedBorder, label: 'Bearish' },
  neutral: { color: Theme.colors.accentAmber, bg: Theme.colors.accentAmberDim, border: 'rgba(245, 166, 35, 0.20)', label: 'Neutral' },
  cautious: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.08)', border: 'rgba(249, 115, 22, 0.18)', label: 'Cautious' },
};

function TickerPill({ ticker, onClick }) {
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onClick(ticker); }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: Theme.radius.xs,
        fontSize: '10px',
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color: Theme.colors.accentBlue,
        background: Theme.colors.accentBlueDim,
        border: `1px solid ${Theme.colors.accentBlueBorder}`,
        cursor: 'pointer',
        letterSpacing: '0.04em',
      }}
    >
      ${ticker}
    </span>
  );
}

function CoachingSessionCard({ session }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="card"
      style={{ padding: '14px 16px', cursor: 'pointer' }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{
          fontSize: '9px',
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: Theme.radius.full,
          color: Theme.colors.accentBlue,
          background: Theme.colors.accentBlueDim,
          border: `1px solid ${Theme.colors.accentBlueBorder}`,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          flexShrink: 0,
        }}>
          S{session.session}
        </span>
        <span style={{
          fontSize: '13px',
          fontWeight: 700,
          color: Theme.colors.primaryText,
          flex: 1,
        }}>
          {session.title.replace(/^Session \d+ — /, '')}
        </span>
        <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText, fontWeight: 600 }}>
          {expanded ? '−' : '+'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>{session.date}</span>
        {session.duration && (
          <span style={{ fontSize: '10px', color: Theme.colors.tertiaryText }}>· {session.duration}</span>
        )}
        <span style={{
          fontSize: '9px',
          fontWeight: 600,
          padding: '1px 6px',
          borderRadius: Theme.radius.xs,
          color: session.videoType === 'zoom' ? '#a78bfa' : '#f87171',
          background: session.videoType === 'zoom' ? 'rgba(167,139,250,0.08)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${session.videoType === 'zoom' ? 'rgba(167,139,250,0.2)' : 'rgba(248,113,113,0.2)'}`,
        }}>
          {session.videoType === 'zoom' ? 'Zoom' : 'YouTube'}
        </span>
      </div>

      <div style={{
        fontSize: '11px',
        color: Theme.colors.secondaryText,
        lineHeight: 1.6,
      }}>
        {session.summary}
      </div>

      {expanded && (
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: `1px solid ${Theme.colors.borderSubtle}`,
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 700,
            color: Theme.colors.tertiaryText,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '8px',
          }}>
            Key Takeaways
          </div>
          {session.keyTakeaways.map((point, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '6px',
              fontSize: '11px',
              color: Theme.colors.secondaryText,
              lineHeight: 1.5,
            }}>
              <span style={{ color: Theme.colors.tertiaryText, flexShrink: 0 }}>•</span>
              <span>{point}</span>
            </div>
          ))}
          <div style={{ marginTop: '10px' }}>
            <a
              href={session.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: Theme.colors.accentBlue,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              ▶ Watch Replay
              {session.videoType === 'zoom' && session.zoomPassword && (
                <span style={{ color: Theme.colors.tertiaryText, fontWeight: 400 }}>
                  (Password: {session.zoomPassword})
                </span>
              )}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeCard({ theme, onTickerClick }) {
  const [expanded, setExpanded] = useState(false);
  const style = SENTIMENT_STYLES[theme.sentiment];

  return (
    <div
      className="card"
      style={{ padding: '16px 18px', cursor: 'pointer' }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <span style={{
          fontSize: '14px',
          fontWeight: 800,
          color: Theme.colors.primaryText,
        }}>
          {theme.title}
        </span>
        <span style={{
          fontSize: '9px',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: Theme.radius.full,
          color: style.color,
          background: style.bg,
          border: `1px solid ${style.border}`,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          {style.label}
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: '10px',
          color: Theme.colors.tertiaryText,
          fontWeight: 600,
        }}>
          {expanded ? '−' : '+'}
        </span>
      </div>

      {/* Summary */}
      <div style={{
        fontSize: '11px',
        color: Theme.colors.secondaryText,
        lineHeight: 1.6,
        marginBottom: '8px',
      }}>
        {theme.summary}
      </div>

      {/* Tickers + Targets */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {theme.tickers.map(t => (
          <TickerPill key={t} ticker={t} onClick={onTickerClick} />
        ))}
        {Object.entries(theme.targets).map(([t, target]) => (
          <span key={t} style={{
            fontSize: '9px',
            fontWeight: 600,
            color: Theme.colors.tertiaryText,
            padding: '2px 6px',
            borderRadius: Theme.radius.xs,
            background: Theme.colors.surfaceSubtle,
          }}>
            {t}: {target}
          </span>
        ))}
      </div>

      {/* Expanded key points */}
      {expanded && (
        <div style={{
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: `1px solid ${Theme.colors.borderSubtle}`,
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 700,
            color: Theme.colors.tertiaryText,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '8px',
          }}>
            Key Points
          </div>
          {theme.keyPoints.map((point, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '6px',
              fontSize: '11px',
              color: Theme.colors.secondaryText,
              lineHeight: 1.5,
            }}>
              <span style={{ color: Theme.colors.tertiaryText, flexShrink: 0 }}>•</span>
              <span>{point}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const KEY_RECAP = [
  'H1 2026 correction creates opportunities',
  'Markets won\'t rely on Mag 7 as in years past',
  'NVDA is a buy on any big drawdowns',
  'Salesforce gets rerated to the upside',
  'eVTOL names will have a breakthrough year — JOBY, EVTL, ACHR',
  'Cannabis beginning its long-awaited comeback',
  'Clay Siegall keeps winning at Immunome',
  'Memory will see a peak',
  'Housing stocks will begin to lead',
];

export function OutlookSection({ onTickerClick }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{
          fontSize: '18px',
          fontWeight: 800,
          color: Theme.colors.primaryText,
          letterSpacing: '-0.01em',
          marginBottom: '4px',
        }}>
          2026 Inner Circle Strategy
        </div>
        <div style={{
          fontSize: '11px',
          color: Theme.colors.tertiaryText,
          fontWeight: 500,
        }}>
          By David Prince — Year-end 2025 update
        </div>
      </div>

      {/* Recap card */}
      <div className="card" style={{
        padding: '14px 16px',
        background: Theme.colors.accentBlueDim,
        border: `1px solid ${Theme.colors.accentBlueBorder}`,
      }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 700,
          color: Theme.colors.accentBlue,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '8px',
        }}>
          Key Themes Recap
        </div>
        {KEY_RECAP.map((item, i) => (
          <div key={i} style={{
            fontSize: '11px',
            color: Theme.colors.primaryText,
            lineHeight: 1.7,
            display: 'flex',
            gap: '8px',
          }}>
            <span style={{ color: Theme.colors.accentBlue, flexShrink: 0 }}>{i + 1}.</span>
            <span>{item}</span>
          </div>
        ))}
      </div>

      {/* Theme cards */}
      {THEMES.map(theme => (
        <ThemeCard key={theme.id} theme={theme} onTickerClick={onTickerClick} />
      ))}

      {/* IC Insiders Coaching Replays */}
      <div style={{ marginTop: '8px', marginBottom: '4px' }}>
        <div style={{
          fontSize: '15px',
          fontWeight: 800,
          color: Theme.colors.primaryText,
          letterSpacing: '-0.01em',
          marginBottom: '2px',
        }}>
          IC Insiders Group Coaching
        </div>
        <div style={{
          fontSize: '11px',
          color: Theme.colors.tertiaryText,
          fontWeight: 500,
        }}>
          David Prince · 8 sessions · Jan–Mar 2026
        </div>
      </div>

      {COACHING_SESSIONS.map(session => (
        <CoachingSessionCard key={session.id} session={session} />
      ))}

      {/* Footer */}
      <div className="card" style={{
        padding: '14px 16px',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '11px',
          color: Theme.colors.secondaryText,
          lineHeight: 1.6,
          fontStyle: 'italic',
        }}>
          "Let's stay focused on the right ideas, and let's do our best to keep our emotions in check."
        </div>
      </div>
    </div>
  );
}
