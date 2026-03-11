import React from 'react';
import { Theme } from '../models/Theme';

const SectionLabel = ({ children, color }) => (
  <div style={{
    fontSize: '10px',
    fontWeight: 700,
    color: color || Theme.colors.tertiaryText,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '6px',
  }}>
    {children}
  </div>
);

const BulletList = ({ items, color }) => (
  <div className="flex flex-col" style={{ gap: '4px' }}>
    {items.map((item, i) => (
      <div key={i} className="flex" style={{ gap: '6px' }}>
        <span style={{ color: color || Theme.colors.secondaryText, fontSize: '11px', lineHeight: '1.5' }}>•</span>
        <span style={{ fontSize: '11px', color: Theme.colors.primaryText, lineHeight: '1.5' }}>{item}</span>
      </div>
    ))}
  </div>
);

const LoadingSkeleton = () => (
  <div className="card" style={{ padding: '16px' }}>
    <div className="flex items-center gap-2" style={{ marginBottom: '14px' }}>
      <div className="skeleton" style={{ width: '140px', height: '14px' }} />
      <div className="skeleton" style={{ width: '60px', height: '22px', borderRadius: Theme.radius.full, marginLeft: 'auto' }} />
    </div>
    <div className="flex flex-col gap-3">
      <div className="skeleton" style={{ width: '100%', height: '50px', borderRadius: Theme.radius.sm }} />
      <div className="skeleton" style={{ width: '100%', height: '70px', borderRadius: Theme.radius.sm }} />
      <div className="flex gap-3">
        <div className="skeleton" style={{ flex: 1, height: '80px', borderRadius: Theme.radius.sm }} />
        <div className="skeleton" style={{ flex: 1, height: '80px', borderRadius: Theme.radius.sm }} />
      </div>
    </div>
  </div>
);

export const EarningsPreviewSection = ({ data, loading, error }) => {
  if (loading) return <LoadingSkeleton />;
  if (error) return null;
  if (!data || !data.success) return null;

  return (
    <div className="card" style={{ padding: '16px' }}>
      {/* Header */}
      <div className="flex items-center gap-2" style={{ marginBottom: '14px' }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          color: Theme.colors.primaryText,
        }}>
          Earnings Preview
        </span>
        <span style={{
          fontSize: '9px',
          fontWeight: 600,
          color: Theme.colors.tertiaryText,
          marginLeft: '4px',
        }}>
          AI-Generated
        </span>

        {/* Expected move pill */}
        {data.expectedMove && (
          <span style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 10px',
            borderRadius: Theme.radius.full,
            fontSize: '12px',
            fontWeight: 700,
            color: Theme.colors.accentAmber,
            background: Theme.colors.accentAmberDim,
            border: '1px solid rgba(245, 166, 35, 0.20)',
            fontFamily: 'var(--font-mono)',
          }}>
            {data.expectedMove}
          </span>
        )}
      </div>

      {/* Expected move + range */}
      {data.expectedRange && (
        <div style={{
          padding: '10px 14px',
          borderRadius: Theme.radius.sm,
          background: Theme.colors.surfaceSubtle,
          border: `1px solid ${Theme.colors.borderSubtle}`,
          marginBottom: '12px',
        }}>
          <SectionLabel>Expected Move</SectionLabel>
          <div className="flex items-center gap-3">
            <span className="tabular-nums" style={{
              fontSize: '16px',
              fontWeight: 800,
              color: Theme.colors.accentAmber,
            }}>
              {data.expectedMove}
            </span>
            <span className="tabular-nums" style={{
              fontSize: '12px',
              fontWeight: 600,
              color: Theme.colors.secondaryText,
            }}>
              Range: {data.expectedRange}
            </span>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {data.keyMetrics?.length > 0 && (
        <div style={{
          padding: '10px 14px',
          borderRadius: Theme.radius.sm,
          background: Theme.colors.accentBlueDim,
          border: `1px solid ${Theme.colors.accentBlueBorder}`,
          marginBottom: '12px',
        }}>
          <SectionLabel color={Theme.colors.accentBlue}>What Matters</SectionLabel>
          <div className="flex flex-col" style={{ gap: '3px' }}>
            {data.keyMetrics.map((metric, i) => (
              <div key={i} className="flex items-start" style={{ gap: '8px' }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: Theme.colors.accentBlue,
                  minWidth: '14px',
                  fontFamily: 'var(--font-mono)',
                  lineHeight: '1.6',
                }}>
                  {i + 1}.
                </span>
                <span style={{ fontSize: '11px', color: Theme.colors.primaryText, lineHeight: '1.6' }}>
                  {metric}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bull / Bear side by side */}
      <div className="flex gap-3" style={{ marginBottom: '12px' }}>
        {/* Bull case */}
        {data.bullCase?.length > 0 && (
          <div style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: Theme.radius.sm,
            background: Theme.colors.bullishGreenBg,
            border: `1px solid ${Theme.colors.bullishGreenBorder}`,
          }}>
            <SectionLabel color={Theme.colors.bullishGreen}>Bull Case</SectionLabel>
            <BulletList items={data.bullCase} color={Theme.colors.bullishGreen} />
          </div>
        )}

        {/* Bear case */}
        {data.bearCase?.length > 0 && (
          <div style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: Theme.radius.sm,
            background: Theme.colors.bearishRedBg,
            border: `1px solid ${Theme.colors.bearishRedBorder}`,
          }}>
            <SectionLabel color={Theme.colors.bearishRed}>Bear Case</SectionLabel>
            <BulletList items={data.bearCase} color={Theme.colors.bearishRed} />
          </div>
        )}
      </div>

      {/* Context */}
      {data.context && (
        <div style={{
          padding: '10px 14px',
          borderRadius: Theme.radius.sm,
          background: Theme.colors.surfaceSubtle,
          border: `1px solid ${Theme.colors.borderSubtle}`,
        }}>
          <SectionLabel color={Theme.colors.accentPurple}>Recent Context</SectionLabel>
          <span style={{
            fontSize: '11px',
            color: Theme.colors.secondaryText,
            lineHeight: '1.6',
          }}>
            {data.context}
          </span>
        </div>
      )}
    </div>
  );
};
