import React, { useState, useEffect, useRef } from 'react';
import { ApiService } from '../services/ApiService';
import { Theme } from '../models/Theme';

const POLL_MS = 30_000; // check every 30 seconds

export const AlertToast = () => {
  const [toasts, setToasts] = useState([]);
  const seenRef = useRef(new Set());

  useEffect(() => {
    const check = async () => {
      try {
        const { triggers } = await ApiService.getTriggeredAlerts();
        if (!triggers?.length) return;
        const fresh = triggers.filter(t => !seenRef.current.has(t.id));
        if (!fresh.length) return;
        fresh.forEach(t => seenRef.current.add(t.id));
        setToasts(prev => [...prev, ...fresh]);

        // Browser notification (if permission granted)
        if (Notification.permission === 'granted') {
          fresh.forEach(t => new Notification('Alert Triggered', { body: t.message, icon: '/favicon.ico' }));
        }

        // Dismiss from server
        fresh.forEach(t => ApiService.dismissTriggeredAlert(t.id).catch(() => {}));
      } catch { /* silent */ }
    };

    // Request browser notification permission on first render
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    check();
    const interval = setInterval(check, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: '360px',
    }}>
      {toasts.map(toast => (
        <AlertToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  );
};

const AlertToastItem = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 10_000); // auto-dismiss after 10s
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div style={{
      background: Theme.colors.cardBackground,
      border: `1px solid ${Theme.colors.accentAmber}`,
      borderLeft: `4px solid ${Theme.colors.accentAmber}`,
      borderRadius: Theme.radius.sm,
      padding: '12px 14px',
      boxShadow: Theme.shadows.md,
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      animation: 'slideInRight 0.2s ease',
    }}>
      <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>🔔</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: Theme.colors.accentAmber, marginBottom: '3px', letterSpacing: '0.04em' }}>
          ALERT TRIGGERED
        </div>
        <div style={{ fontSize: '12px', color: Theme.colors.primaryText, lineHeight: 1.5 }}>
          {toast.message.replace('[Alert] ', '')}
        </div>
        <div style={{ fontSize: '10px', color: Theme.colors.tertiaryText, marginTop: '4px' }}>
          {new Date(toast.ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </div>
      </div>
      <span
        onClick={onDismiss}
        style={{ fontSize: '14px', color: Theme.colors.tertiaryText, cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}
      >
        ×
      </span>
    </div>
  );
};
