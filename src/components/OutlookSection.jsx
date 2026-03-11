import React, { useState } from 'react';
import { Theme } from '../models/Theme';

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
