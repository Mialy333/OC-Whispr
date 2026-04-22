'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div style={{
          minHeight: '100vh', backgroundColor: '#F2ECDF',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 24px',
        }}>
          <div style={{
            fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
            fontSize: 9, letterSpacing: 2, color: '#A83A26', textTransform: 'uppercase' as const,
          }}>
            ERR — RENDER FAILED
          </div>
          <div style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontSize: 16, color: '#1A1814', textAlign: 'center' as const, maxWidth: 300,
          }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              marginTop: 8, border: '1px solid #9E9378', background: 'transparent',
              fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
              fontSize: 10, letterSpacing: 1, color: '#3C3830',
              padding: '6px 16px', cursor: 'pointer',
            }}
          >
            RELOAD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
