import React, { useState } from 'react';
import { Theme } from '../models/Theme';

const SECTOR_NARRATIVES = {
  'Technology': 'AI infrastructure buildout, cloud migration, and platform dominance',
  'Communication Services': 'Ad spend recovery, streaming wars, and creator economy growth',
  'Healthcare': 'GLP-1 momentum, AI drug discovery, and aging demographics',
  'Financial': 'Rate cycle positioning, digital payments growth, and fintech disruption',
  'Consumer Cyclical': 'Consumer resilience vs inflation, e-commerce penetration',
  'Consumer Defensive': 'Defensive positioning, pricing power, and dividend stability',
  'Energy': 'OPEC discipline, energy security, and clean energy transition',
  'Industrials': 'Infrastructure spending, reshoring, and automation adoption',
  'Basic Materials': 'Commodity supercycle, EV materials demand, and reshoring tailwinds',
  'Real Estate': 'Rate sensitivity, data center REITs booming, housing shortage',
  'Utilities': 'AI data center power demand driving nuclear/utility renaissance',
};

const INDUSTRY_NARRATIVES = {
  'Semiconductors': 'AI chip demand driving record capex, supply chain reshoring',
  'Chip Design & Processors': 'AI chip demand driving record capex, supply chain reshoring',
  'Semiconductor Equipment': 'Wafer fab equipment demand surging with capacity expansion',
  'AI & Custom Silicon': 'Custom AI accelerators and next-gen interconnects',
  'Optical/Photonics': 'Switches, routers & fiber for AI data centers',
  'AI Infrastructure & Hardware': 'AI data center server and power infrastructure',
  'Software - Infrastructure': 'AI integration, cloud migration, and platform lock-in',
  'Software - Application': 'AI copilots, vertical SaaS, and enterprise automation',
  'Internet Content & Information': 'Ad monetization, AI search disruption, and engagement',
  'Consumer Electronics': 'Hardware refresh cycle, AI-on-device, and ecosystem stickiness',
  'Semiconductor Equipment & Materials': 'Foundry buildout, EUV adoption, US CHIPS Act spending',
  'Biotechnology': 'GLP-1 pipeline, gene therapy approvals, and M&A wave',
  'Drug Manufacturers - General': 'Patent cliffs, biosimilar competition, and AI R&D',
  'Aerospace & Defense': 'Global rearmament, drone warfare, and space commercialization',
  'Banks - Diversified': 'Net interest margin normalization, capital markets recovery',
  'Credit Services': 'Digital payments penetration, BNPL evolution, cross-border',
  'Solar': 'IRA subsidies, grid modernization, and utility-scale deployment',
  'Uranium': 'Nuclear renaissance for AI data center baseload power',
  'Auto Manufacturers': 'EV transition, autonomous driving, and China competition',
  'Restaurants': 'Same-store sales growth, franchise model scaling, and value wars',
  'Resorts & Casinos': 'Travel normalization, Macau recovery, and sports betting',
  'Internet Retail': 'Logistics moats, AI recommendations, and marketplace expansion',
};

const FundamentalItem = ({ label, value }) => (
  <div className="flex justify-between items-center" style={{
    padding: '7px 0',
    borderBottom: `1px solid ${Theme.colors.borderSubtle}`,
  }}>
    <span style={{
      fontSize: '11px',
      fontWeight: 500,
      color: Theme.colors.secondaryText,
    }}>{label}</span>
    <span className="tabular-nums" style={{
      fontSize: '12px',
      fontWeight: 700,
      color: Theme.colors.primaryText,
    }}>{value || '-'}</span>
  </div>
);

const LoadingSkeleton = () => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-2">
      <div className="skeleton" style={{ width: '180px', height: '22px' }} />
      <div className="skeleton" style={{ width: '60px', height: '20px', borderRadius: Theme.radius.full }} />
      <div className="skeleton" style={{ width: '80px', height: '20px', borderRadius: Theme.radius.full }} />
    </div>
    <div className="flex items-center gap-3">
      <div className="skeleton" style={{ width: '100px', height: '30px' }} />
      <div className="skeleton" style={{ width: '60px', height: '20px', borderRadius: Theme.radius.full }} />
    </div>
    <div className="card" style={{ padding: '8px 16px' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex justify-between" style={{ padding: '7px 0' }}>
          <div className="skeleton" style={{ width: '80px', height: '12px' }} />
          <div className="skeleton" style={{ width: '60px', height: '12px' }} />
        </div>
      ))}
    </div>
  </div>
);

const CompanyProfile = ({ description, sector, industry, analystRating, fundamentals }) => {
  const [expanded, setExpanded] = useState(false);
  const narrative = INDUSTRY_NARRATIVES[industry] || SECTOR_NARRATIVES[sector] || null;

  // Build quick stats for narrative context
  const epsGrowth = fundamentals?.['EPS Q/Q'];
  const salesGrowth = fundamentals?.['Sales Q/Q'];
  const shortFloat = fundamentals?.['Short Float'];

  const hasGrowthData = epsGrowth || salesGrowth;
  const isLong = description && description.length > 200;
  const displayDesc = expanded || !isLong ? description : description.slice(0, 200) + '...';

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      {/* Narrative */}
      {narrative && (
        <div style={{
          padding: '8px 12px',
          marginBottom: '10px',
          borderRadius: Theme.radius.sm,
          background: Theme.colors.accentBlueDim,
          border: `1px solid ${Theme.colors.accentBlueBorder}`,
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 700,
            color: Theme.colors.accentBlue,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '3px',
          }}>
            Current Narrative
          </div>
          <div style={{ fontSize: '11px', color: Theme.colors.primaryText, lineHeight: '1.5' }}>
            {narrative}
          </div>
          {hasGrowthData && (
            <div className="flex items-center gap-3" style={{ marginTop: '6px' }}>
              {epsGrowth && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: epsGrowth.startsWith('-') ? Theme.colors.bearishRed : Theme.colors.bullishGreen,
                }}>
                  EPS Q/Q: {epsGrowth}
                </span>
              )}
              {salesGrowth && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: salesGrowth.startsWith('-') ? Theme.colors.bearishRed : Theme.colors.bullishGreen,
                }}>
                  Sales Q/Q: {salesGrowth}
                </span>
              )}
              {shortFloat && (
                <span style={{ fontSize: '10px', fontWeight: 600, color: Theme.colors.secondaryText }}>
                  Short: {shortFloat}
                </span>
              )}
              {analystRating && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: analystRating.includes('Buy') ? Theme.colors.bullishGreen
                    : analystRating.includes('Sell') ? Theme.colors.bearishRed
                    : Theme.colors.secondaryText,
                }}>
                  Analyst: {analystRating}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Company description */}
      {description && (
        <div>
          <div style={{
            fontSize: '10px',
            fontWeight: 700,
            color: Theme.colors.tertiaryText,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '5px',
          }}>
            What they do
          </div>
          <div style={{
            fontSize: '11px',
            color: Theme.colors.secondaryText,
            lineHeight: '1.6',
          }}>
            {displayDesc}
            {isLong && (
              <span
                onClick={() => setExpanded(!expanded)}
                style={{
                  color: Theme.colors.accentBlue,
                  cursor: 'pointer',
                  fontWeight: 600,
                  marginLeft: '4px',
                }}
              >
                {expanded ? 'Less' : 'More'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const StockOverviewSection = ({ data, loading, error }) => {
  if (loading) return <LoadingSkeleton />;

  if (error) return (
    <div className="card flex flex-col items-center justify-center" style={{
      height: '100px',
      background: Theme.colors.bearishRedBg,
      borderColor: Theme.colors.bearishRedBorder,
    }}>
      <span style={{ fontSize: '12px', color: Theme.colors.bearishRed }}>{error}</span>
    </div>
  );

  if (!data || !data.success) return null;

  const isPositive = data.changePct && !data.changePct.startsWith('-');
  const changeColor = isPositive ? Theme.colors.bullishGreen : Theme.colors.bearishRed;
  const changeBg = isPositive ? Theme.colors.bullishGreenBg : Theme.colors.bearishRedBg;
  const changeBorder = isPositive ? Theme.colors.bullishGreenBorder : Theme.colors.bearishRedBorder;

  // Parse 52W high/low and compute position
  const w52High = parseFloat((data.fundamentals?.['52W High'] || '').replace(/[^0-9.]/g, '')) || null;
  const w52Low = parseFloat((data.fundamentals?.['52W Low'] || '').replace(/[^0-9.]/g, '')) || null;
  const currentPrice = parseFloat(String(data.price || '').replace(/[^0-9.]/g, '')) || null;

  const w52Position = (w52High && w52Low && currentPrice && w52High > w52Low)
    ? Math.max(0, Math.min(100, ((currentPrice - w52Low) / (w52High - w52Low)) * 100))
    : null;

  const pctFrom52High = (w52High && currentPrice)
    ? ((currentPrice - w52High) / w52High) * 100
    : null;

  const fundEntries = Object.entries(data.fundamentals || {});
  const priorityKeys = ['Market Cap', 'P/E', 'EPS (ttm)', 'PEG', 'P/B', 'Dividend %', 'ROE', 'Debt/Eq', 'Target Price', '52W Range', 'Beta', 'Avg Volume'];
  // Find earnings key (may have tooltip artifacts from Finviz)
  const earningsKey = Object.keys(data.fundamentals || {}).find(k => k.endsWith('Earnings') || k === 'Earnings');
  const sortedFunds = fundEntries
    .filter(([k]) => k !== earningsKey) // shown separately
    .sort((a, b) => {
      const ai = priorityKeys.indexOf(a[0]);
      const bi = priorityKeys.indexOf(b[0]);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    }).slice(0, 12);

  const earningsDate = earningsKey ? data.fundamentals[earningsKey] : null;

  // Parse earnings proximity
  let earningsDaysAway = null;
  let earningsUrgent = false;
  if (earningsDate) {
    const parts = earningsDate.match(/([A-Za-z]+)\s+(\d+)/);
    if (parts) {
      const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
      const m = months[parts[1]];
      const d = parseInt(parts[2]);
      if (m !== undefined) {
        const now = new Date();
        let ed = new Date(now.getFullYear(), m, d);
        if (ed < new Date(now.getTime() - 180 * 86400000)) ed = new Date(now.getFullYear() + 1, m, d);
        now.setHours(0, 0, 0, 0);
        earningsDaysAway = Math.round((ed - now) / 86400000);
        earningsUrgent = earningsDaysAway >= 0 && earningsDaysAway <= 7;
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Company name + pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span style={{
          fontSize: '18px',
          fontWeight: 800,
          color: Theme.colors.primaryText,
          letterSpacing: '-0.01em',
        }}>
          {data.companyName || data.ticker}
        </span>
        <span className="pill pill-blue" style={{ fontFamily: 'var(--font-mono)' }}>{data.ticker}</span>
        {data.sector && <span className="pill pill-amber">{data.sector}</span>}
        {data.industry && <span className="pill pill-gray">{data.industry}</span>}
      </div>

      {/* Company description + narrative */}
      {(data.description || data.sector) && (
        <CompanyProfile
          description={data.description}
          sector={data.sector}
          industry={data.industry}
          analystRating={data.analystRating}
          fundamentals={data.fundamentals}
        />
      )}

      {/* Price bar */}
      <div className="flex items-center gap-3">
        <span className="tabular-nums" style={{
          fontSize: '26px',
          fontWeight: 800,
          color: Theme.colors.primaryText,
        }}>
          ${data.price}
        </span>
        {data.changePct && (
          <span className="tabular-nums" style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 10px',
            borderRadius: Theme.radius.full,
            fontSize: '12px',
            fontWeight: 700,
            color: changeColor,
            background: changeBg,
            border: `1px solid ${changeBorder}`,
          }}>
            {data.change} ({data.changePct})
          </span>
        )}
        {data.fundamentals?.['Market Cap'] && (
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: Theme.colors.tertiaryText,
            marginLeft: 'auto',
          }}>
            MCap: {data.fundamentals['Market Cap']}
          </span>
        )}
      </div>

      {/* Earnings date */}
      {earningsDate && (
        <div className="flex items-center gap-2" style={{
          padding: '8px 14px',
          borderRadius: Theme.radius.sm,
          background: earningsUrgent ? Theme.colors.accentAmberDim : Theme.colors.surfaceSubtle,
          border: `1px solid ${earningsUrgent ? 'rgba(245, 166, 35, 0.20)' : Theme.colors.borderSubtle}`,
        }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            color: earningsUrgent ? Theme.colors.accentAmber : Theme.colors.tertiaryText,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Earnings
          </span>
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            color: earningsUrgent ? Theme.colors.accentAmber : Theme.colors.primaryText,
          }}>
            {earningsDate}
          </span>
          {earningsDaysAway !== null && earningsDaysAway >= 0 && (
            <span style={{
              fontSize: '10px',
              fontWeight: 600,
              color: earningsUrgent ? Theme.colors.accentAmber : Theme.colors.secondaryText,
              marginLeft: 'auto',
            }}>
              {earningsDaysAway === 0 ? 'Today' : earningsDaysAway === 1 ? 'Tomorrow' : `in ${earningsDaysAway} days`}
            </span>
          )}
        </div>
      )}

      {/* Fundamentals grid */}
      {sortedFunds.length > 0 && (
        <div className="card" style={{ padding: '4px 16px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            columnGap: '24px',
          }}>
            {sortedFunds.map(([label, value]) => (
              <FundamentalItem key={label} label={label} value={value} />
            ))}
          </div>
        </div>
      )}

      {/* Short Interest card */}
      {(() => {
        const shortFloat = data.fundamentals?.['Short Float'];
        const shortRatio = data.fundamentals?.['Short Ratio'];
        const shortInterest = data.fundamentals?.['Short Interest'];
        const floatShares = data.fundamentals?.['Shs Float'];
        if (!shortFloat && !shortRatio) return null;

        // Parse short float % for color coding
        const shortFloatNum = parseFloat((shortFloat || '').replace('%', ''));
        const isHighShort = shortFloatNum >= 20;
        const isMidShort = !isHighShort && shortFloatNum >= 10;
        const shortColor = isHighShort ? Theme.colors.bearishRed
          : isMidShort ? Theme.colors.accentAmber
          : Theme.colors.secondaryText;
        const shortBg = isHighShort ? Theme.colors.bearishRedBg
          : isMidShort ? 'rgba(245, 166, 35, 0.08)'
          : Theme.colors.surfaceSubtle;
        const shortBorder = isHighShort ? Theme.colors.bearishRedBorder
          : isMidShort ? 'rgba(245, 166, 35, 0.20)'
          : Theme.colors.borderSubtle;

        return (
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{
                fontSize: '11px', fontWeight: 700, color: Theme.colors.tertiaryText,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Short Interest
              </span>
              {shortFloat && (
                <span style={{
                  fontSize: '11px', fontWeight: 800, padding: '2px 8px',
                  borderRadius: Theme.radius.full,
                  background: shortBg, color: shortColor, border: `1px solid ${shortBorder}`,
                  fontFamily: 'var(--font-mono)',
                }}>
                  {shortFloat} of float
                </span>
              )}
            </div>

            {/* Short float bar */}
            {!isNaN(shortFloatNum) && shortFloatNum > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  height: '5px', borderRadius: Theme.radius.full,
                  background: Theme.colors.cardBorder, position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${Math.min(100, shortFloatNum * 2)}%`, // scale: 50%=100% bar
                    background: isHighShort ? Theme.colors.bearishRed
                      : isMidShort ? Theme.colors.accentAmber
                      : Theme.colors.accentBlue,
                    borderRadius: Theme.radius.full,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '24px' }}>
              {shortRatio && (
                <div className="flex justify-between items-center" style={{ padding: '5px 0', borderBottom: `1px solid ${Theme.colors.borderSubtle}` }}>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: Theme.colors.secondaryText }}>Days to Cover</span>
                  <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: Theme.colors.primaryText }}>{shortRatio}</span>
                </div>
              )}
              {shortInterest && (
                <div className="flex justify-between items-center" style={{ padding: '5px 0', borderBottom: `1px solid ${Theme.colors.borderSubtle}` }}>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: Theme.colors.secondaryText }}>Shares Short</span>
                  <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: Theme.colors.primaryText }}>{shortInterest}</span>
                </div>
              )}
              {floatShares && (
                <div className="flex justify-between items-center" style={{ padding: '5px 0', borderBottom: `1px solid ${Theme.colors.borderSubtle}` }}>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: Theme.colors.secondaryText }}>Float</span>
                  <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: Theme.colors.primaryText }}>{floatShares}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 52W Range card */}
      {(w52High || w52Low) && (
        <div className="card" style={{ padding: '12px 16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: Theme.colors.tertiaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              52W Range
            </span>
            {pctFrom52High !== null && (
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: Theme.radius.full,
                background: Theme.colors.bearishRedBg,
                color: Theme.colors.bearishRed,
                border: `1px solid ${Theme.colors.bearishRedBorder}`,
                fontFamily: 'var(--font-mono)',
              }}>
                {pctFrom52High.toFixed(1)}% from 52W high
              </span>
            )}
          </div>

          {/* Progress bar */}
          {w52Position !== null && (
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <div style={{
                height: '6px',
                borderRadius: Theme.radius.full,
                background: Theme.colors.cardBorder,
                position: 'relative',
                overflow: 'visible',
              }}>
                {/* Filled portion */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${w52Position}%`,
                  borderRadius: Theme.radius.full,
                  background: `linear-gradient(to right, ${Theme.colors.bullishGreen}, ${Theme.colors.accentBlue})`,
                }} />
                {/* Current price marker */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${w52Position}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: Theme.colors.primaryText,
                  border: `2px solid ${Theme.colors.cardBackground}`,
                  boxShadow: `0 0 0 1px ${Theme.colors.accentBlue}`,
                  zIndex: 1,
                }} />
              </div>
            </div>
          )}

          {/* Low / High labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '9px', color: Theme.colors.tertiaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                52W Low
              </span>
              <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: Theme.colors.bullishGreen }}>
                {w52Low ? `$${w52Low.toFixed(2)}` : '-'}
              </span>
            </div>
            {currentPrice && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: Theme.colors.tertiaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Current
                </span>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: Theme.colors.primaryText }}>
                  ${currentPrice.toFixed(2)}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              <span style={{ fontSize: '9px', color: Theme.colors.tertiaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                52W High
              </span>
              <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: Theme.colors.bearishRed }}>
                {w52High ? `$${w52High.toFixed(2)}` : '-'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
