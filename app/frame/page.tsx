'use client';

import { useEffect, useState } from 'react';
import sdk from '@farcaster/miniapp-sdk';
import SignalCard from '@/components/SignalCard';
import type { AlphaSignal } from '@/types';

interface FeedResponse {
  free: AlphaSignal[];
  locked: AlphaSignal[];
  total: number;
}

export default function FramePage() {
  const [fid, setFid] = useState<number | null>(null);
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const ctx = await sdk.context;
        const userFid = ctx?.user?.fid ?? null;
        if (!cancelled) setFid(userFid);

        // No FID means opened outside Farcaster — show fallback, don't signal ready
        if (!userFid) {
          if (!cancelled) setLoading(false);
          return;
        }

        const res = await fetch(`/api/feed?fid=${userFid}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setFeed(data);

        // Signal ready after feed is loaded — removes Farcaster loading screen
        await sdk.actions.ready();
        // Prompt user to add the miniapp (enables back gesture on mobile)
        await sdk.actions.addFrame().catch(() => {});
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load feed');
        // Still call ready on error so Farcaster doesn't hang
        await sdk.actions.ready().catch(() => {});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // Opened outside Farcaster
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

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <p className="text-xs text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-3 py-4">
      <div className="w-full flex flex-col" style={{ gap: 'clamp(8px, 2vw, 12px)' }}>
        {feed?.free.map((signal) => (
          <SignalCard key={signal.id} signal={signal} locked={false} fid={fid!} />
        ))}

        {(feed?.locked.length ?? 0) > 0 && (
          <p className="px-1 font-mono text-xs text-zinc-600 uppercase tracking-widest">
            Locked · Cast to unlock
          </p>
        )}

        {feed?.locked.map((signal) => (
          <SignalCard key={signal.id} signal={signal} locked={true} fid={fid!} />
        ))}
      </div>
    </div>
  );
}
