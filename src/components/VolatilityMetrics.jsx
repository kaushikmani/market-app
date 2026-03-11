import React from 'react';
import { Theme } from '../models/Theme';

const MetricCard = ({ title, value, subtitle, accentColor }) => (
    <div className="card" style={{
        flex: 1,
        padding: '16px 12px',
        textAlign: 'center',
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: Theme.radius.lg,
    }}>
        <div style={{
            fontSize: '9px',
            fontWeight: 700,
            color: Theme.colors.tertiaryText,
            letterSpacing: '0.08em',
            marginBottom: '8px',
            textTransform: 'uppercase',
        }}>
            {title}
        </div>
        <div className="tabular-nums" style={{
            fontSize: '18px',
            fontWeight: 800,
            color: accentColor,
            marginBottom: '4px',
        }}>
            {value}
        </div>
        <div style={{
            fontSize: '9px',
            fontWeight: 500,
            color: Theme.colors.tertiaryText,
        }}>
            {subtitle}
        </div>
    </div>
);

export const VolatilityMetrics = ({ metrics }) => {
    return (
        <div className="flex gap-3">
            <MetricCard
                title="ADR%"
                value={`${metrics.averageDailyRange.toFixed(2)}%`}
                subtitle="Avg Daily Range"
                accentColor={Theme.colors.accentBlue}
            />
            <MetricCard
                title="ATR from 50"
                value={`+${metrics.atrFromFifty.toFixed(2)}`}
                subtitle="ATR Multiple"
                accentColor={Theme.colors.accentPurple}
            />
            <MetricCard
                title="% from 50"
                value={`+${metrics.percentFromFiftySMA.toFixed(2)}%`}
                subtitle="From 50 SMA"
                accentColor={Theme.colors.bullishGreen}
            />
        </div>
    );
};
