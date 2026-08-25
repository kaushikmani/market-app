import React from 'react';
import { Theme } from '../models/Theme';

function hasSessionPrice(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

const PriceCell = ({ label, value, color, isFirst }) => (
    <div style={{
        flex: 1,
        textAlign: 'center',
        padding: '16px 8px',
        borderLeft: isFirst ? 'none' : `1px solid ${Theme.colors.borderSubtle}`,
    }}>
        <div style={{
            fontSize: '9px',
            fontWeight: 700,
            color: Theme.colors.tertiaryText,
            letterSpacing: '0.1em',
            marginBottom: '6px',
            textTransform: 'uppercase',
        }}>
            {label}
        </div>
        <div className="tabular-nums" style={{
            fontSize: '17px',
            fontWeight: 700,
            color: color,
        }}>
            {hasSessionPrice(value) ? `$${value.toFixed(2)}` : '—'}
        </div>
    </div>
);

export const PriceHeader = ({ priceData }) => {
    const open = priceData?.open;
    const close = priceData?.close;
    const closeColor = (hasSessionPrice(open) && hasSessionPrice(close))
        ? (close >= open ? Theme.colors.bullishGreen : Theme.colors.bearishRed)
        : Theme.colors.primaryText;

    return (
        <div className="card" style={{
            padding: 0,
            overflow: 'hidden',
        }}>
            <div className="flex items-center">
                <PriceCell label="Open" value={open} color={Theme.colors.primaryText} isFirst />
                <PriceCell label="High" value={priceData?.high} color={Theme.colors.bullishGreen} />
                <PriceCell label="Low" value={priceData?.low} color={Theme.colors.bearishRed} />
                <PriceCell label="Close" value={close} color={closeColor} />
            </div>
        </div>
    );
};
