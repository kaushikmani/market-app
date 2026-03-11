import React from 'react';
import { Theme } from '../models/Theme';
import { Signal, SignalType } from '../models/Stock';

const MATableHeader = () => (
    <div className="flex items-center" style={{
        padding: '10px 16px',
        background: Theme.colors.surfaceSubtle,
        borderBottom: `1px solid ${Theme.colors.cardBorder}`,
    }}>
        <div style={{ width: '70px', fontSize: '9px', fontWeight: 700, color: Theme.colors.tertiaryText, letterSpacing: '0.08em', textTransform: 'uppercase' }}>MA</div>
        <div style={{ flex: 1, fontSize: '9px', fontWeight: 700, color: Theme.colors.tertiaryText, letterSpacing: '0.08em', textAlign: 'center', textTransform: 'uppercase' }}>Value</div>
        <div style={{ width: '80px', fontSize: '9px', fontWeight: 700, color: Theme.colors.tertiaryText, letterSpacing: '0.08em', textAlign: 'center', textTransform: 'uppercase' }}>vs Price</div>
        <div style={{ width: '80px', fontSize: '9px', fontWeight: 700, color: Theme.colors.tertiaryText, letterSpacing: '0.08em', textAlign: 'right', textTransform: 'uppercase' }}>Signal</div>
    </div>
);

const MATableRow = ({ ma, isLast }) => {
    const signalColor = Theme.getSignalColor(ma.signal);
    const signalText = Signal.getDisplayText(ma.signal);

    return (
        <div className="flex items-center" style={{
            padding: '10px 16px',
            borderBottom: isLast ? 'none' : `1px solid ${Theme.colors.borderSubtle}`,
            transition: 'background 0.15s ease',
            cursor: 'default',
        }}
        onMouseEnter={e => e.currentTarget.style.background = Theme.colors.cardBackgroundHover}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
            <div style={{ width: '70px', fontSize: '12px', fontWeight: 700, color: Theme.colors.primaryText, fontFamily: 'var(--font-mono)' }}>
                {ma.displayName}
            </div>
            <div className="tabular-nums" style={{ flex: 1, fontSize: '12px', fontWeight: 500, color: Theme.colors.primaryText, textAlign: 'center' }}>
                ${ma.value.toFixed(2)}
            </div>
            <div className="tabular-nums" style={{ width: '80px', fontSize: '12px', fontWeight: 700, textAlign: 'center', color: signalColor }}>
                {ma.percentFromPrice >= 0 ? '+' : ''}{ma.percentFromPrice.toFixed(1)}%
            </div>
            <div className="flex items-center justify-end gap-2" style={{ width: '80px' }}>
                <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: signalColor,
                    boxShadow: `0 0 6px ${signalColor}`,
                }} />
                <div style={{ fontSize: '10px', fontWeight: 600, color: signalColor, letterSpacing: '0.02em' }}>
                    {signalText}
                </div>
            </div>
        </div>
    );
};

export const MovingAveragesSection = ({ movingAverages }) => {
    const bullishCount = movingAverages.filter(ma => ma.signal === SignalType.BULLISH).length;
    const overallSignal = bullishCount > movingAverages.length / 2 ? SignalType.BULLISH : SignalType.BEARISH;

    const badgeColor = overallSignal === SignalType.BULLISH ? 'bg-bullish' : 'bg-bearish';
    const badgeText = overallSignal === SignalType.BULLISH ? 'BULLISH' : 'BEARISH';
    const arrow = Signal.getArrowIcon(overallSignal);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
                <div style={{ fontSize: '14px', fontWeight: 700, color: Theme.colors.primaryText }}>
                    Moving Averages
                </div>
                <div className={`signal-badge ${badgeColor}`}>
                    <span>{arrow}</span>
                    <span>{badgeText}</span>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <MATableHeader />
                {movingAverages.map((ma, i) => (
                    <MATableRow key={ma.id} ma={ma} isLast={i === movingAverages.length - 1} />
                ))}
            </div>
        </div>
    );
};
