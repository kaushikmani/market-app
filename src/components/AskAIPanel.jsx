import React, { useState, useRef, useEffect } from 'react';
import { ApiService } from '../services/ApiService';
import { Theme } from '../models/Theme';

const QUICK_QUESTIONS = [
  'Is this extended or at a good entry?',
  'What does the SMA setup look like?',
  'Any red flags in this chart?',
  'What would make this a buy vs. avoid?',
  'How does this compare to its sector?',
  'How has this stock moved on past earnings?',
  'What is the expected move for earnings?',
  'What are analysts expecting this quarter?',
];

function buildContext(ticker, smaData, earningsHistory) {
  const lines = [];
  if (smaData?.price) lines.push(`Current price: $${smaData.price}`);
  if (smaData?.rsi)   lines.push(`RSI (14): ${smaData.rsi.toFixed(1)}`);
  if (smaData?.smas) {
    const smaLines = Object.entries(smaData.smas)
      .map(([p, s]) => `SMA${p}: $${s.value} (${s.pctFromPrice > 0 ? '+' : ''}${s.pctFromPrice}% from price)`)
      .join(', ');
    lines.push(`SMAs: ${smaLines}`);
  }
  if (earningsHistory?.history?.length > 0) {
    const lines2 = earningsHistory.history.slice(0, 6).map(h =>
      `  ${h.date}: ${h.oneDayMove > 0 ? '+' : ''}${h.oneDayMove}% (prev close $${h.prevClose?.toFixed(2)})`
    );
    lines.push(`Past earnings moves:\n${lines2.join('\n')}`);
    if (earningsHistory.expectedMove) {
      lines.push(`Avg expected move (last 4 earnings): ±${earningsHistory.expectedMove}%`);
    }
  }
  return lines.join('\n');
}

export function AskAIPanel({ ticker, smaData, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [earningsHistory, setEarningsHistory] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (!ticker) return;
    ApiService.getEarningsHistory(ticker).then(setEarningsHistory).catch(() => {});
  }, [ticker]);

  const ask = async (question) => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const context = buildContext(ticker, smaData, finvizQuote, earningsHistory);
      const data = await ApiService.askAI({ ticker, question: q, context });
      setMessages(prev => [...prev, { role: 'ai', text: data.answer || 'No response.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Error reaching AI. Try again.', error: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '380px', height: '100vh',
          background: Theme.colors.appBackground,
          borderLeft: `1px solid ${Theme.colors.cardBorder}`,
          display: 'flex', flexDirection: 'column',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 18px',
          borderBottom: `1px solid ${Theme.colors.cardBorder}`,
          background: Theme.colors.cardBackground,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: Theme.colors.primaryText }}>
              Ask AI
              <span style={{
                marginLeft: '8px', fontSize: '12px', fontWeight: 800,
                fontFamily: 'var(--font-mono)', color: Theme.colors.accentBlue,
                letterSpacing: '0.06em',
              }}>
                {ticker}
              </span>
            </div>
            <div style={{ fontSize: '9px', color: Theme.colors.tertiaryText, marginTop: '2px' }}>
              Powered by Gemini · context-aware
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: `1px solid ${Theme.colors.cardBorder}`,
              borderRadius: Theme.radius.sm, color: Theme.colors.secondaryText, cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '12px', color: Theme.colors.secondaryText, marginBottom: '16px' }}>
                Ask anything about {ticker}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {QUICK_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    style={{
                      padding: '8px 12px', fontSize: '11px', fontWeight: 500,
                      fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
                      background: Theme.colors.cardBackground,
                      border: `1px solid ${Theme.colors.cardBorder}`,
                      borderRadius: Theme.radius.sm,
                      color: Theme.colors.secondaryText,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = Theme.colors.accentBlueBorder; e.currentTarget.style.color = Theme.colors.accentBlue; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = Theme.colors.cardBorder; e.currentTarget.style.color = Theme.colors.secondaryText; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '88%',
                padding: '9px 12px',
                borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                background: m.role === 'user'
                  ? Theme.colors.accentBlueDim
                  : m.error ? 'rgba(255,92,92,0.08)' : Theme.colors.cardBackground,
                border: `1px solid ${m.role === 'user' ? Theme.colors.accentBlueBorder : m.error ? 'rgba(255,92,92,0.2)' : Theme.colors.cardBorder}`,
                fontSize: '12px', lineHeight: '1.55',
                color: m.role === 'user' ? Theme.colors.accentBlue : Theme.colors.primaryText,
              }}>
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '9px 14px', borderRadius: '12px 12px 12px 3px',
                background: Theme.colors.cardBackground, border: `1px solid ${Theme.colors.cardBorder}`,
                fontSize: '12px', color: Theme.colors.tertiaryText,
              }}>
                <span style={{ letterSpacing: '0.1em' }}>···</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '12px 14px',
          borderTop: `1px solid ${Theme.colors.cardBorder}`,
          display: 'flex', gap: '8px', flexShrink: 0,
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); } }}
            placeholder={`Ask about ${ticker}...`}
            style={{
              flex: 1, background: Theme.colors.inputBackground,
              border: `1px solid ${Theme.colors.cardBorder}`,
              borderRadius: Theme.radius.sm, color: Theme.colors.primaryText,
              padding: '9px 12px', fontSize: '12px', fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button
            onClick={() => ask(input)}
            disabled={loading || !input.trim()}
            style={{
              padding: '9px 14px', fontSize: '12px', fontWeight: 700,
              fontFamily: 'inherit', cursor: loading || !input.trim() ? 'default' : 'pointer',
              background: loading || !input.trim() ? Theme.colors.cardBackground : Theme.colors.accentBlue,
              border: `1px solid ${loading || !input.trim() ? Theme.colors.cardBorder : Theme.colors.accentBlue}`,
              borderRadius: Theme.radius.sm,
              color: loading || !input.trim() ? Theme.colors.tertiaryText : '#fff',
              transition: 'all 0.15s',
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
