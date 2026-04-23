'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
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

// ── Auth gate ──────────────────────────────────────────────────────────────
function AuthGate({ onLogin, loading }: { onLogin: () => void; loading: boolean }) {
  return (
    <div style={{
      minHeight: '100vh', background: PAPER, color: INK,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', gap: 0,
    }}>
      {/* Masthead */}
      <div style={{
        fontFamily: SA.serif, fontSize: 32, fontWeight: 400,
        letterSpacing: -1, color: INK, marginBottom: 8, lineHeight: 1,
      }}>
        Alpha Whispr
      </div>
      <div style={{
        fontFamily: SA.mono, fontSize: 9, color: SA.ash,
        letterSpacing: 3, textTransform: 'uppercase', marginBottom: 40,
      }}>
        Heard before spoken
      </div>

      {/* Value prop */}
      <div style={{
        border: `1px solid ${SA.rule}`, borderRadius: 14,
        padding: '20px 18px', marginBottom: 28, width: '100%', maxWidth: 320,
        background: '#EDE6D3',
      }}>
        {([
          ['▤', 'Live DeFi & RWA signal feed'],
          ['◈', 'AI yield advisor, personalized'],
          ['◉', 'Cast-to-unlock alpha reports'],
        ] as [string, string][]).map(([icon, text], i, arr) => (
          <div key={text} style={{
            display: 'flex', gap: 12, alignItems: 'center',
            padding: '7px 0',
            borderBottom: i < arr.length - 1 ? `0.5px solid ${SA.rule}` : 'none',
          }}>
            <span style={{ fontFamily: SA.mono, fontSize: 14, color: SA.phosphorGlow, width: 18, textAlign: 'center' }}>{icon}</span>
            <span style={{ fontFamily: SA.mono, fontSize: 11, color: INK }}>{text}</span>
          </div>
        ))}
      </div>

      {/* Connect button */}
      <button
        onClick={onLogin}
        disabled={loading}
        style={{
          width: '100%', maxWidth: 320,
          padding: '14px',
          background: SA.aqua, color: '#fff',
          border: 'none', borderRadius: 14,
          fontFamily: SA.mono, fontSize: 12, fontWeight: 700,
          letterSpacing: 0.5, cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1,
          marginBottom: 14,
        }}
      >
        {loading ? 'Connecting…' : 'Connect with Privy →'}
      </button>

      {/* Privy badge */}
      <div style={{
        fontFamily: SA.mono, fontSize: 9, color: SA.ash,
        letterSpacing: 0.5, textAlign: 'center',
      }}>
        Secured by{' '}
        <span style={{ color: SA.aqua, fontWeight: 700 }}>Privy</span>
        {' '}· Farcaster · Wallet
      </div>
    </div>
  );
}

// ── Main frame page ────────────────────────────────────────────────────────
export default function FramePage() {
  const { ready: privyReady, authenticated, login, user } = usePrivy();
  const [loginLoading, setLoginLoading] = useState(false);
  const [fid, setFid]           = useState<number | null>(null);
  const [feed, setFeed]         = useState<FeedResponse | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [error, setError]       = useState('');
  const [view, setView]         = useState<View>('feed');

  // Signal ready to Warpcast immediately — before any auth check
  useEffect(() => {
    sdk.actions.ready().catch(() => {});
  }, []);

  // Load feed after Privy auth resolves
  useEffect(() => {
    if (!privyReady || !authenticated) return;

    let cancelled = false;
    const loadFeed = async () => {
      setFeedLoading(true);
      try {
        // Prefer FID from Privy's linked Farcaster account
        let resolvedFid: number | null = user?.farcaster?.fid ?? null;

        // Fall back to Farcaster SDK context
        if (!resolvedFid) {
          const ctx = await sdk.context;
          resolvedFid = ctx?.user?.fid ?? null;
        }

        if (cancelled) return;
        if (resolvedFid) {
          setFid(resolvedFid);
          sdk.actions.addFrame().catch(() => {});
        }

        const res  = await fetch(`/api/feed?fid=${resolvedFid ?? 0}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setFeed(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load feed');
      } finally {
        if (!cancelled) setFeedLoading(false);
      }
    };

    loadFeed();
    return () => { cancelled = true; };
  }, [privyReady, authenticated, user?.farcaster?.fid]);

  const handleLogin = async () => {
    setLoginLoading(true);
    try { await login(); } finally { setLoginLoading(false); }
  };

  // Privy SDK initialising (brief, < 500ms usually)
  if (!privyReady) {
    return (
      <div style={{
        minHeight: '100vh', background: PAPER,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: SA.serif, fontSize: 20, fontStyle: 'italic', color: INK }}>
          Alpha Whispr
        </span>
      </div>
    );
  }

  // Not authenticated — show gate
  if (!authenticated) {
    return <AuthGate onLogin={handleLogin} loading={loginLoading} />;
  }

  // Authenticated — show app shell
  return (
    <div style={{
      width: '100%', maxWidth: '424px', margin: '0 auto',
      height: '100vh', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: PAPER, color: INK, fontFamily: SA.mono,
    }}>
      <div style={{ flex: 1, overflowY: 'auto', background: PAPER }}>
        {feedLoading ? (
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
              CONNECT FARCASTER IN PRIVY TO VIEW PROFILE
            </span>
          </div>
        )}
      </div>

      {/* Bottom navbar */}
      <nav style={{
        flexShrink: 0, height: '48px', display: 'flex', alignItems: 'stretch',
        background: PAPER, borderTop: `1px solid ${SA.rule}`,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 2,
              background: 'transparent', border: 'none',
              borderTop: view === tab.id ? `2px solid ${SA.phosphorGlow}` : '2px solid transparent',
              cursor: 'pointer', fontFamily: SA.mono, fontSize: 9, letterSpacing: 0.5,
              color: view === tab.id ? SA.phosphorGlow : SA.ash,
              transition: 'color .15s', paddingTop: 2,
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
