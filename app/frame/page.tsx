'use client';

import { useEffect, useState } from 'react';
import sdk from '@farcaster/miniapp-sdk';
import SignalCard from '@/components/SignalCard';
import AdvisorFlow from '@/components/AdvisorFlow';
import ProfileView from '@/components/ProfileView';
import { SA } from '@/components/ui';
import type { AlphaSignal } from '@/types';

type View = 'feed' | 'advisor' | 'profile';

const TABS: { id: View; icon: string; label: string }[] = [
  { id: 'feed',    icon: '▤', label: 'Feed'    },
  { id: 'advisor', icon: '◈', label: 'Advisor' },
  { id: 'profile', icon: '◉', label: 'Profile' },
];

interface FeedResponse {
  free: AlphaSignal[];
  locked: AlphaSignal[];
  total: number;
}

export default function FramePage() {
  const [fid, setFid]     = useState<number | null>(null);
  const [feed, setFeed]   = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView]   = useState<View>('feed');

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const ctx = await sdk.context;
        const userFid = ctx?.user?.fid ?? null;
        if (!cancelled) setFid(userFid);

        if (!userFid) {
          if (!cancelled) setLoading(false);
          return;
        }

        const res = await fetch(`/api/feed?fid=${userFid}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setFeed(data);

        await sdk.actions.ready();
        await sdk.actions.addFrame().catch(() => {});
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load feed');
        await sdk.actions.ready().catch(() => {});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  if (!loading && fid === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-4">
        <p className="text-2xl">🔍</p>
        <p className="text-sm font-semibold text-zinc-100">Alpha Whispr</p>
        <p className="text-center text-xs text-zinc-500">
          Open this link inside Farcaster to access your personalized alpha feed.
        </p>
        <a
          href="https://warpcast.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 rounded-lg bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-500 transition-colors"
        >
          Open in Farcaster
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-violet-400" />
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: '424px',
      margin: '0 auto',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: SA.mono,
    }}>
      {/* Scrollable content area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {view === 'feed' && (
          <div className="feed-container">
            {error && (
              <div style={{ padding: '10px 14px' }}>
                <span style={{ fontFamily: SA.mono, fontSize: 10, color: SA.rust }}>ERR: {error}</span>
              </div>
            )}
            {feed?.free.map((signal) => (
              <SignalCard key={signal.id} signal={signal} locked={false} fid={fid!} />
            ))}
            {(feed?.locked.length ?? 0) > 0 && (
              <p style={{
                fontFamily: SA.mono, fontSize: 9, color: SA.ash,
                textTransform: 'uppercase', letterSpacing: 2, padding: '8px 14px',
              }}>
                Locked · Cast to unlock
              </p>
            )}
            {feed?.locked.map((signal) => (
              <SignalCard key={signal.id} signal={signal} locked={true} fid={fid!} />
            ))}
            {!error && !feed && (
              <div style={{ padding: '32px 14px', textAlign: 'center' }}>
                <span style={{ fontFamily: SA.mono, fontSize: 10, color: SA.ash, letterSpacing: 2 }}>
                  NO SIGNALS YET
                </span>
              </div>
            )}
          </div>
        )}

        {view === 'advisor' && (
          <AdvisorFlow fid={fid ?? undefined} onBack={() => setView('feed')} />
        )}

        {view === 'profile' && fid && (
          <ProfileView fid={fid} />
        )}
      </div>

      {/* Bottom navbar — always visible */}
      <nav className="bottom-nav" style={{
        flexShrink: 0,
        height: '48px',
        display: 'flex',
        alignItems: 'stretch',
        backgroundColor: 'var(--bg-primary)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              background: 'transparent',
              border: 'none',
              borderTop: view === tab.id
                ? '2px solid var(--accent-phosphore)'
                : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: SA.mono,
              fontSize: 9,
              letterSpacing: 0.5,
              color: view === tab.id ? 'var(--accent-phosphore)' : 'var(--text-muted)',
              transition: 'color .15s',
              paddingTop: 2,
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
