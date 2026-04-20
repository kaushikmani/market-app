import React from 'react';

let kickerCounter = 0;
const kickerNumbers = new WeakMap();

function getNum(key) {
  if (!key) return null;
  if (!kickerNumbers.has(key)) {
    kickerCounter += 1;
    kickerNumbers.set(key, String(kickerCounter).padStart(2, '0'));
  }
  return kickerNumbers.get(key);
}

export const SectionDivider = ({ title, subtitle, num }) => (
  <div className="kicker">
    {num && <span className="num">{num}</span>}
    <h2 className="title">{title}</h2>
    {subtitle && (
      <span style={{
        marginLeft: 'auto',
        fontFamily: 'var(--font-geist-mono)',
        fontSize: 10.5,
        color: 'var(--text-tertiary)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}>
        {subtitle}
      </span>
    )}
  </div>
);

// suppress unused warning
void getNum;
