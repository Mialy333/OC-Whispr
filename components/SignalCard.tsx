'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AlphaSignal } from '@/types';

interface Props {
  signal: AlphaSignal;
  locked: boolean;
  fid: number;
}

type UnlockState = 'idle' | 'loading-cast' | 'modal' | 'polling' | 'unlocked';

const SEVERITY_COLOR: Record<AlphaSignal['severity'], string> = {
  high: 'var(--signal-high)',
  medium: 'var(--signal-medium)',
  low: 'var(--signal-low)',
};

const MAX_POLLS = 10;

const mono = { fontFamily: 'var(--font-mono)' } as const;
const display = { fontFamily: 'var(--font-display)' } as const;

function Spinner() {
  return (
    <span style={{ ...mono, fontSize: 11, color: 'var(--accent-phosphore)', letterSpacing: '0.1em', animation: 'pulse 1s infinite' }}>
      ■ ■ ■
    </span>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 28, height: 28, color: 'var(--text-muted)' }}>
      <rect x="3" y="11" width="18" height="11" rx="0" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
  const [hovered, setHovered] = useState(false);

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
      if (data.verified) setState('unlocked');
    } catch {
      // network glitch — keep polling
    }
  }, [fid, signal.id, keyword]);

  useEffect(() => {
    if (state !== 'polling') return;
    if (pollCount >= MAX_POLLS) { setState('modal'); return; }
    const timer = setTimeout(async () => {
      await pollVerify();
      setPollCount((c) => c + 1);
    }, 3000);
    return () => clearTimeout(timer);
  }, [state, pollCount, pollVerify]);

  const ts = new Date(signal.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const severityColor = SEVERITY_COLOR[signal.severity];
  const isLocked = state !== 'unlocked';
  const borderColor = hovered && isLocked ? 'var(--accent-phosphore)' : 'var(--border)';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${borderColor}`,
        backgroundColor: 'var(--bg-secondary)',
        padding: 20,
        transition: 'border-color 0.2s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 6px' }}>
            {signal.source} · {signal.protocolName}
          </p>
          <h3 style={{ ...display, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.25 }}>
            {signal.title}
          </h3>
          {signal.boosted && (
            <p style={{ ...mono, fontSize: 10, color: 'var(--accent-phosphore)', marginTop: 4, letterSpacing: '0.08em' }}>
              ◆ TRENDING IN YOUR NETWORK
            </p>
          )}
        </div>
        <span style={{
          ...mono,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: severityColor,
          border: `1px solid ${severityColor}`,
          padding: '2px 8px',
          flexShrink: 0,
          textTransform: 'uppercase' as const,
        }}>
          {signal.severity}
        </span>
      </div>

      {/* Data point */}
      <div style={{
        marginTop: 12,
        display: 'inline-block',
        backgroundColor: 'var(--bg-terminal)',
        padding: '4px 10px',
        filter: isLocked ? 'blur(4px)' : 'none',
        transition: 'filter 0.3s',
        userSelect: isLocked ? 'none' : 'auto',
      }}>
        <span style={{ ...mono, fontSize: 13, color: 'var(--accent-phosphore)', letterSpacing: '0.04em' }}>
          {signal.dataPoint}
        </span>
      </div>

      {/* Summary */}
      <div style={{ position: 'relative', marginTop: 12 }}>
        <p style={{
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          margin: 0,
          filter: isLocked ? 'blur(6px)' : 'none',
          transition: 'filter 0.3s',
          userSelect: isLocked ? 'none' : 'auto',
        }}>
          {signal.summary}
        </p>

        {/* Locked overlay */}
        {isLocked && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}>
            {state === 'idle' && (
              <>
                <LockIcon />
                <span style={{ ...mono, fontSize: 11, color: 'var(--accent-phosphore)', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
                  CAST TO UNLOCK
                </span>
                <button
                  onClick={handleUnlockClick}
                  style={{
                    ...mono,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    backgroundColor: 'var(--text-primary)',
                    color: 'var(--bg-primary)',
                    border: 'none',
                    padding: '8px 20px',
                    cursor: 'pointer',
                    borderRadius: 0,
                    textTransform: 'uppercase' as const,
                  }}
                >
                  UNLOCK
                </button>
              </>
            )}
            {state === 'loading-cast' && <Spinner />}
            {state === 'polling' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Spinner />
                <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                  WAITING FOR CAST · {MAX_POLLS - pollCount} CHECKS LEFT
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        {error && <span style={{ ...mono, fontSize: 10, color: 'var(--signal-high)' }}>ERR: {error}</span>}
        <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', letterSpacing: '0.06em' }}>{ts}</span>
      </div>

      {/* Unlock flash */}
      {state === 'unlocked' && locked && (
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, backgroundColor: 'rgba(0,255,65,0.04)', animation: 'pulse 1s' }} />
      )}

      {/* Cast modal */}
      {state === 'modal' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          backgroundColor: 'var(--bg-secondary)',
          padding: 20,
          backdropFilter: 'blur(4px)',
        }}>
          <p style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: 0 }}>
            CAST PREVIEW
          </p>
          <textarea
            value={castText}
            onChange={(e) => setCastText(e.target.value)}
            maxLength={280}
            rows={4}
            style={{
              ...mono,
              fontSize: 12,
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-terminal)',
              border: '1px solid var(--border)',
              padding: 12,
              resize: 'none',
              outline: 'none',
              width: '100%',
              lineHeight: 1.6,
            }}
          />
          <p style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', margin: 0 }}>
            {castText.length}/280
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setState('idle')}
              style={{
                ...mono,
                flex: 1,
                fontSize: 11,
                letterSpacing: '0.08em',
                backgroundColor: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                padding: '10px',
                cursor: 'pointer',
                borderRadius: 0,
              }}
            >
              CANCEL
            </button>
            <button
              onClick={handleCastAndUnlock}
              style={{
                ...mono,
                flex: 1,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                backgroundColor: 'var(--text-primary)',
                color: 'var(--bg-primary)',
                border: 'none',
                padding: '10px',
                cursor: 'pointer',
                borderRadius: 0,
                textTransform: 'uppercase' as const,
              }}
            >
              CAST & UNLOCK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
