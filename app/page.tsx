'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import SignalCard from '@/components/SignalCard';
import ThemeToggle from '@/components/ThemeToggle';
import type { AlphaSignal } from '@/types';

interface FeedResponse {
  free: AlphaSignal[];
  locked: AlphaSignal[];
  total: number;
}

function truncateAddress(addr: string): string {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const fmt = () => {
      const now = new Date();
      setTime(now.toLocaleString('en-US', {
        month: 'short', day: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      }));
    };
    fmt();
    const id = setInterval(fmt, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
      {time}
    </span>
  );
}

const mono = { fontFamily: 'var(--font-mono)' } as const;
const display = { fontFamily: 'var(--font-display)' } as const;

export default function Home() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fid = (user?.farcaster?.fid as number | undefined) ?? 0;
  const wallet = user?.wallet?.address ?? '';

  useEffect(() => {
    if (!authenticated) return;
    setLoading(true);
    setError('');
    fetch(`/api/feed?fid=${fid}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setFeed(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authenticated, fid]);

  if (!ready) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>LOADING…</span>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main
        className="grid-bg"
        style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 24, backgroundColor: 'var(--bg-primary)', position: 'relative' }}
      >
        <div style={{ position: 'absolute', top: 16, right: 16 }}>
          <ThemeToggle />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ ...display, fontSize: 48, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.1 }}>
            STREAM ALPHA
          </h1>
          <p style={{ ...mono, fontSize: 14, color: 'var(--text-muted)', marginTop: 16, letterSpacing: '0.02em' }}>
            AI-curated Web3 signals. Personalized by your network.
          </p>
        </div>
        <button
          onClick={login}
          style={{
            ...mono,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.1em',
            backgroundColor: 'var(--text-primary)',
            color: 'var(--bg-primary)',
            border: 'none',
            padding: '14px 36px',
            cursor: 'pointer',
            borderRadius: 0,
            textTransform: 'uppercase' as const,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          CONNECT
        </button>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', padding: '0 24px 48px' }}>
      {/* Header */}
      <header style={{
        maxWidth: 680,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 0',
        borderBottom: '1px solid var(--border)',
        gap: 12,
      }}>
        <span style={{ ...mono, fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-primary)', textTransform: 'uppercase' as const }}>
          STREAM ALPHA
        </span>
        <LiveClock />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {wallet && (
            <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '2px 8px' }}>
              {truncateAddress(wallet)}
            </span>
          )}
          <ThemeToggle />
          <button
            onClick={logout}
            style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border)', padding: '2px 8px', cursor: 'pointer', letterSpacing: '0.08em' }}
          >
            EXIT
          </button>
        </div>
      </header>

      {/* Feed */}
      <div style={{ maxWidth: 680, margin: '0 auto', paddingTop: 32 }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <span style={{ ...mono, fontSize: 11, color: 'var(--accent-phosphore)', letterSpacing: '0.1em' }}>LOADING SIGNALS…</span>
          </div>
        )}

        {error && (
          <p style={{ ...mono, fontSize: 11, color: 'var(--signal-high)', border: '1px solid var(--signal-high)', padding: '12px 16px' }}>
            ERR: {error}
          </p>
        )}

        {feed && !loading && (
          <>
            {feed.free.length > 0 && (
              <p style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 12 }}>
                LIVE SIGNALS
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {feed.free.map((signal) => (
                <SignalCard key={signal.id} signal={signal} locked={false} fid={fid} />
              ))}
            </div>

            {feed.locked.length > 0 && (
              <p style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '24px 0 12px' }}>
                LOCKED — CAST TO UNLOCK
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {feed.locked.map((signal) => (
                <SignalCard key={signal.id} signal={signal} locked={true} fid={fid} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
