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
        fontSize: '14px',
        fontWeight: 700,
        color: Theme.colors.primaryText,
        letterSpacing: '0.02em',
      }}>
        {title}
      </h2>
      {subtitle && (
        <span style={{
          fontSize: '11px',
          fontWeight: 500,
          color: Theme.colors.tertiaryText,
        }}>
          {subtitle}
        </span>
      )}
    </div>
  </div>
);
