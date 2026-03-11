export function LoadingSpinner({ size = 24, message = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '16px' }}>
      <div style={{
        width: size,
        height: size,
        border: `3px solid rgba(59, 130, 246, 0.2)`,
        borderTop: `3px solid #3b82f6`,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      {message && <span style={{ color: '#64748b', fontSize: '13px' }}>{message}</span>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default LoadingSpinner;
