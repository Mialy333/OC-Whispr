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

const PAPER = '#F2ECDF';
const INK   = '#1A1814';

export default function FramePage() {
  const [fid, setFid]         = useState<number | null>(null);
  const [feed, setFeed]       = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [view, setView]       = useState<View>('feed');

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // Show content immediately, then signal ready
        setLoading(false);
        await sdk.actions.ready();

        // Fetch context and feed in background after frame is visible
        const ctx = await sdk.context;
        const userFid = ctx?.user?.fid ?? null;
        if (cancelled) return;

        if (userFid) {
          setFid(userFid);
          await sdk.actions.addFrame().catch(() => {});
          const res  = await fetch(`/api/feed?fid=${userFid}`);
          const data = await res.json();
          if (cancelled) return;
          if (data.error) throw new Error(data.error);
          setFeed(data);
        } else {
          // Not in frame context — still show placeholder feed
          const res  = await fetch(`/api/feed?fid=0`);
          const data = await res.json().catch(() => null);
          if (!cancelled && data && !data.error) setFeed(data);
        }
      } catch (e) {
        if (!cancelled) {
          setLoading(false);
          setError(e instanceof Error ? e.message : 'Failed to load feed');
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{
      width: '100%',
      maxWidth: '424px',
      margin: '0 auto',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: PAPER,
      color: INK,
      fontFamily: SA.mono,
    }}>
      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', background: PAPER }}>
        {loading ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            minHeight: '60vh', gap: 12,
          }}>
            <div style={{ fontFamily: SA.serif, fontSize: 20, fontStyle: 'italic', color: INK }}>
              Alpha Whispr
            </div>
            <div style={{ fontFamily: SA.mono, fontSize: 10, color: SA.ash, letterSpacing: 2 }}>
              LOADING…
            </div>
          </div>
        ) : view === 'feed' ? (
          <div className="feed-container">
            {error && (
              <div style={{ padding: '10px 14px' }}>
                <span style={{ fontFamily: SA.mono, fontSize: 10, color: SA.rust }}>ERR: {error}</span>
              </div>
            )}
            {feed?.free.map((signal) => (
              <SignalCard key={signal.id} signal={signal} locked={false} fid={fid ?? 0} />
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
              <SignalCard key={signal.id} signal={signal} locked={true} fid={fid ?? 0} />
            ))}
            {!error && !feed && (
              <div style={{ padding: '32px 14px', textAlign: 'center' }}>
                <span style={{ fontFamily: SA.mono, fontSize: 10, color: SA.ash, letterSpacing: 2 }}>
                  NO SIGNALS YET
                </span>
              </div>
            )}
          </div>
        ) : view === 'advisor' ? (
          <AdvisorFlow fid={fid ?? undefined} onBack={() => setView('feed')} />
        ) : fid ? (
          <ProfileView fid={fid} />
        ) : (
          <div style={{ padding: '32px 14px', textAlign: 'center' }}>
            <span style={{ fontFamily: SA.mono, fontSize: 10, color: SA.ash, letterSpacing: 2 }}>
              OPEN IN FARCASTER
            </span>
          </div>
        )}
      </div>

      {/* Bottom navbar — always visible */}
      <nav className="bottom-nav" style={{
        flexShrink: 0,
        height: '48px',
        display: 'flex',
        alignItems: 'stretch',
        background: PAPER,
        borderTop: `1px solid ${SA.rule}`,
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
                ? `2px solid ${SA.phosphorGlow}`
                : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: SA.mono,
              fontSize: 9,
              letterSpacing: 0.5,
              color: view === tab.id ? SA.phosphorGlow : SA.ash,
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
