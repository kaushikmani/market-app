import React from 'react';
import { Theme } from '../models/Theme';

export const SectionDivider = ({ title, subtitle }) => (
  <div style={{ paddingTop: '12px', marginBottom: '4px' }}>
    <div style={{
      height: '1px',
      background: `linear-gradient(to right, ${Theme.colors.cardBorder}, transparent 80%)`,
      marginBottom: '16px',
    }} />
    <div className="flex items-baseline gap-3">
      <h2 style={{
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-weight-bold)',
        color: Theme.colors.secondaryText,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        {title}
      </h2>
      {subtitle && (
        <span style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--font-weight-normal)',
          color: Theme.colors.tertiaryText,
        }}>
          {subtitle}
        </span>
      )}
    </div>
  </div>
);
