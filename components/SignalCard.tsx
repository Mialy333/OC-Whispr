'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AlphaSignal } from '@/types';

interface Props {
  signal: AlphaSignal;
  locked: boolean;
  fid: number;
}

type UnlockState = 'idle' | 'loading-cast' | 'modal' | 'polling' | 'unlocked';

const SEVERITY_BADGE: Record<AlphaSignal['severity'], string> = {
  high: 'bg-red-500/20 text-red-400 border border-red-500/40',
  medium: 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
  low: 'bg-blue-500/20 text-blue-400 border border-blue-500/40',
};

const SEVERITY_LABEL: Record<AlphaSignal['severity'], string> = {
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
};

const MAX_POLLS = 10;

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-zinc-400">
      <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3A5.25 5.25 0 0 0 12 1.5Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
    </svg>
  );
}

export default function SignalCard({ signal, locked, fid }: Props) {
  const [state, setState] = useState<UnlockState>(locked ? 'idle' : 'unlocked');
  const [castText, setCastText] = useState('');
  const [castUrl, setCastUrl] = useState('');
  const [keyword, setKeyword] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const [error, setError] = useState('');

  const handleUnlockClick = async () => {
    setState('loading-cast');
    setError('');
    try {
      const res = await fetch('/api/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, signalId: signal.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate cast');
      setCastText(data.castText ?? '');
      setCastUrl(data.castUrl ?? '');
      setKeyword(data.keyword ?? '');
      setState('modal');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setState('idle');
    }
  };

  const handleCastAndUnlock = () => {
    window.open(castUrl, '_blank', 'noopener,noreferrer');
    setPollCount(0);
    setState('polling');
  };

  const pollVerify = useCallback(async () => {
    try {
      const res = await fetch('/api/verify-cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, signalId: signal.id, keyword }),
      });
      const data = await res.json();
      if (data.verified) {
        setState('unlocked');
      }
    } catch {
      // network glitch — keep polling
    }
  }, [fid, signal.id, keyword]);

  useEffect(() => {
    if (state !== 'polling') return;
    if (pollCount >= MAX_POLLS) {
      setState('modal');
      return;
    }
    const timer = setTimeout(async () => {
      await pollVerify();
      setPollCount((c) => c + 1);
    }, 3000);
    return () => clearTimeout(timer);
  }, [state, pollCount, pollVerify]);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-zinc-900 p-4 transition-all duration-500 ${
        state === 'unlocked' ? 'border-zinc-700' : 'border-zinc-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="truncate font-mono text-xs text-zinc-500 uppercase tracking-widest">
            {signal.source} · {signal.protocolName}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-zinc-100 leading-snug">{signal.title}</h3>
          {signal.boosted && (
            <p className="mt-1 text-zinc-500" style={{ fontSize: '11px' }}>
              👥 Followed by people you follow
            </p>
          )}
        </div>
        <span className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-bold ${SEVERITY_BADGE[signal.severity]}`}>
          {SEVERITY_LABEL[signal.severity]}
        </span>
      </div>

      <p className="mt-2 font-mono text-xs text-emerald-400">{signal.dataPoint}</p>

      {/* Body — blurred when locked */}
      <div className="relative mt-3">
        <p className={`text-sm text-zinc-300 leading-relaxed transition-all duration-300 ${state !== 'unlocked' ? 'blur-sm select-none' : ''}`}>
          {signal.summary}
        </p>

        {state !== 'unlocked' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            {state === 'idle' && (
              <>
                <LockIcon />
                <button
                  onClick={handleUnlockClick}
                  className="mt-1 rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 active:scale-95 transition-transform"
                >
                  Unlock with a cast
                </button>
              </>
            )}
            {state === 'loading-cast' && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Spinner /> Generating cast…
              </div>
            )}
            {state === 'polling' && (
              <div className="flex flex-col items-center gap-2 text-xs text-zinc-400">
                <Spinner />
                <span>Waiting for cast…</span>
                <span className="text-zinc-600">{MAX_POLLS - pollCount} checks left</span>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {/* Unlock flash */}
      {state === 'unlocked' && locked && (
        <div className="pointer-events-none absolute inset-0 animate-pulse rounded-xl bg-violet-500/10" />
      )}

      {/* Cast preview modal */}
      {state === 'modal' && (
        <div className="absolute inset-0 z-10 flex flex-col gap-3 rounded-xl bg-zinc-900/98 p-4 backdrop-blur-sm">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Cast Preview</p>
          <textarea
            value={castText}
            onChange={(e) => setCastText(e.target.value)}
            maxLength={280}
            rows={4}
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 p-3 font-mono text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <p className="text-right font-mono text-xs text-zinc-600">{castText.length}/280</p>
          <div className="flex gap-2">
            <button
              onClick={() => setState('idle')}
              className="flex-1 rounded-lg border border-zinc-700 py-2 text-xs text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCastAndUnlock}
              className="flex-1 rounded-lg bg-violet-600 py-2 text-xs font-semibold text-white hover:bg-violet-500 active:scale-95 transition-transform"
            >
              Cast &amp; Unlock
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
