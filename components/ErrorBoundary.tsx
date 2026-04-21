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
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-4">
          <p className="text-sm font-semibold text-zinc-100">Something went wrong</p>
          <p className="text-center text-xs text-zinc-500">{this.state.error.message}</p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            className="rounded-lg bg-violet-600 px-5 py-2 text-xs font-semibold text-white hover:bg-violet-500"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
