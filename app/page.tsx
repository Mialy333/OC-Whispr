'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import SignalCard from '@/components/SignalCard';
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

export default function Home() {
  const { ready, authenticated, login, user } = usePrivy();
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fid = (user?.farcaster?.fid as number | undefined) ?? 0;
  const wallet = user?.wallet?.address ?? '';

  useEffect(() => {
    if (!authenticated || !fid) return;
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
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-100">Alpha Feed</h1>
          <p className="mt-2 text-sm text-zinc-500">Live Web3/DeFi signals, curated by AI</p>
        </div>
        <button
          onClick={login}
          className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500 active:scale-95 transition-transform"
        >
          Connect with Privy
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6">
      {/* Header */}
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-zinc-100">Alpha Feed</h1>
          {wallet && (
            <span className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1 font-mono text-xs text-zinc-400">
              {truncateAddress(wallet)}
            </span>
          )}
        </div>

        {/* Feed */}
        <div className="mt-6 flex flex-col gap-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-violet-400" />
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
              {error}
            </p>
          )}

          {feed && !loading && (
            <>
              {feed.free.map((signal) => (
                <SignalCard key={signal.id} signal={signal} locked={false} fid={fid} />
              ))}

              {feed.locked.length > 0 && (
                <p className="px-1 font-mono text-xs text-zinc-600 uppercase tracking-widest">
                  Locked · Cast to unlock
                </p>
              )}

              {feed.locked.map((signal) => (
                <SignalCard key={signal.id} signal={signal} locked={true} fid={fid} />
              ))}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
