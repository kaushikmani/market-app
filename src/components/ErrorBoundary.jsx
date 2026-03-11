import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '24px',
          margin: '16px',
          color: '#f1f5f9',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚠️</div>
          <h3 style={{ color: '#ef4444', margin: '0 0 8px', fontSize: '16px' }}>Something went wrong</h3>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 20px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
