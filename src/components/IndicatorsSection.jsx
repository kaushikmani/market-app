import React from 'react';
import { Theme } from '../models/Theme';
import { Signal, SignalType } from '../models/Stock';

const IndicatorCard = ({ title, value, status, signal, showArrowAsValue }) => {
    const color = Theme.getSignalColor(signal);
    const bgColor = signal === SignalType.BULLISH
        ? Theme.colors.bullishGreenBg
        : signal === SignalType.BEARISH
            ? Theme.colors.bearishRedBg
            : 'rgba(110, 110, 136, 0.04)';
    const borderColor = signal === SignalType.BULLISH
        ? Theme.colors.bullishGreenBorder
        : signal === SignalType.BEARISH
            ? Theme.colors.bearishRedBorder
            : Theme.colors.cardBorder;

    return (
        <div className="card" style={{
            flex: 1,
            padding: '16px 12px',
            textAlign: 'center',
            background: bgColor,
            borderColor: borderColor,
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
            <div style={{
                fontWeight: 800,
                color: color,
                fontSize: showArrowAsValue ? '26px' : '22px',
                lineHeight: 1.2,
                marginBottom: '6px',
            }}>
                {value}
            </div>
            <div style={{
                fontSize: '10px',
                fontWeight: 600,
                color: color,
                opacity: 0.7,
            }}>
                {status}
            </div>
        </div>
    );
};

export const IndicatorsSection = ({ indicators }) => {
    const overallSignal = indicators.overallSignal;
    const badgeColor = overallSignal === SignalType.BULLISH ? 'bg-bullish' : 'bg-bearish';
    const badgeText = overallSignal === SignalType.BULLISH ? 'BULLISH' : 'BEARISH';
    const arrow = Signal.getArrowIcon(overallSignal);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
                <div style={{ fontSize: '14px', fontWeight: 700, color: Theme.colors.primaryText }}>
                    Indicators
                </div>
                <div className={`signal-badge ${badgeColor}`}>
                    <span>{arrow}</span>
                    <span>{badgeText}</span>
                </div>
            </div>

            <div className="flex gap-3">
                <IndicatorCard
                    title={`RSI (${indicators.rsi.period})`}
                    value={indicators.rsi.value.toFixed(0)}
                    status={indicators.rsi.status}
                    signal={indicators.rsi.signal}
                />
                <IndicatorCard
                    title="BB %B"
                    value={indicators.bollingerBandPercent.value.toFixed(0)}
                    status={indicators.bollingerBandPercent.status}
                    signal={indicators.bollingerBandPercent.signal}
                />
                <IndicatorCard
                    title="MACD"
                    value={Signal.getArrowIcon(indicators.macd.signal)}
                    status={indicators.macd.status}
                    signal={indicators.macd.signal}
                    showArrowAsValue={true}
                />
            </div>
        </div>
    );
};
