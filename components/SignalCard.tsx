'use client';

import { useState, useEffect, useCallback } from 'react';
import sdk from '@farcaster/miniapp-sdk';
import type { AlphaSignal } from '@/types';
import { SA, Sparkline, SeverityChip, seededChart } from '@/components/ui';

interface Props {
  signal: AlphaSignal;
  locked: boolean;
  fid: number;
  dark?: boolean;
  onOpen?: (s: AlphaSignal) => void;
}

type UnlockState = 'idle' | 'loading-cast' | 'modal' | 'polling' | 'unlocked';

const MAX_POLLS = 10;

export default function SignalCard({ signal, locked, fid, dark = false, onOpen }: Props) {
  const [state, setState] = useState<UnlockState>(locked ? 'idle' : 'unlocked');
  const [castText, setCastText] = useState('');
  const [castUrl, setCastUrl] = useState('');
  const [keyword, setKeyword] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const [error, setError] = useState('');

  const ink = dark ? SA.paperDeep : SA.ink;
  const muted = dark ? SA.ash : SA.ash;
  const ruleC = dark ? '#332E22' : SA.rule;
  const isLocked = state !== 'unlocked';

  const ts = new Date(signal.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  const chart = seededChart(signal.id);

  const handleUnlockClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleCastAndUnlock = async () => {
    try {
      const ctx = await sdk.context;
      if (ctx !== null) {
        await sdk.actions.openUrl(castUrl);
      } else {
        window.open(castUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      window.open(castUrl, '_blank', 'noopener,noreferrer');
    }
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
    } catch { /* keep polling */ }
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

  return (
    <div style={{
      padding: '14px 18px 12px',
      borderBottom: `0.5px solid ${ruleC}`,
      position: 'relative', cursor: 'pointer',
      background: signal.boosted && !isLocked
        ? (dark ? 'rgba(42,168,75,0.05)' : 'rgba(42,168,75,0.04)')
        : 'transparent',
    }} onClick={() => !isLocked && onOpen?.(signal)}>

      {/* Meta line */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: SA.mono, fontSize: 8.5, letterSpacing: 1, color: muted,
        textTransform: 'uppercase', marginBottom: 4,
      }}>
        <span>{signal.source}</span>
        <span>·</span>
        <span>{signal.protocolName}</span>
        {signal.boosted && (
          <>
            <span>·</span>
            <span style={{ color: SA.phosphorGlow, letterSpacing: 0.8 }}>◆ IN YOUR NETWORK</span>
          </>
        )}
        <span style={{ marginLeft: 'auto' }}>{ts}</span>
      </div>

      {/* Headline + severity */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <h3 style={{
          flex: 1, fontFamily: SA.serif, fontSize: 18, fontWeight: 500,
          lineHeight: 1.12, margin: 0, letterSpacing: -0.4, color: ink,
          filter: isLocked ? 'blur(4.5px)' : 'none',
          transition: 'filter .4s',
          userSelect: isLocked ? 'none' : 'auto',
        }}>
          {isLocked ? 'Lorem ipsum dolor sit amet consectetur adipiscing elit.' : signal.title}
        </h3>
        <SeverityChip level={signal.severity} />
      </div>

      {/* Data chip + sparkline + TVL + unlock button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <span style={{
          fontFamily: SA.mono, fontSize: 10, letterSpacing: 0.5,
          background: dark ? '#0C1A0C' : SA.terminal,
          color: SA.terminalGreen,
          padding: '2px 7px',
          filter: isLocked ? 'blur(4px)' : 'none',
          transition: 'filter .4s',
        }}>
          {isLocked ? '██████ ██.█%' : signal.dataPoint}
        </span>
        <Sparkline data={chart} w={64} h={18} color={SA.phosphorGlow} />
        {state === 'idle' && (
          <button onClick={handleUnlockClick} style={{
            marginLeft: 'auto',
            border: `1px solid ${SA.aqua}`, background: 'transparent',
            color: SA.aqua, fontFamily: SA.sans, fontSize: 10, fontWeight: 600,
            letterSpacing: 0.4, padding: '3px 10px', borderRadius: 10, cursor: 'pointer',
          }}>Cast to unlock</button>
        )}
        {state === 'loading-cast' && (
          <span style={{ marginLeft: 'auto', fontFamily: SA.mono, fontSize: 10, color: SA.phosphorGlow, animation: 'pulse 1s infinite' }}>■ ■ ■</span>
        )}
        {state === 'polling' && (
          <span style={{ marginLeft: 'auto', fontFamily: SA.mono, fontSize: 9, color: SA.ash, letterSpacing: 0.5 }}>
            CHECKING… {MAX_POLLS - pollCount}
          </span>
        )}
      </div>

      {/* Summary — only when unlocked */}
      {!isLocked && (
        <p style={{
          margin: '8px 0 0',
          fontFamily: SA.serif, fontSize: 12, lineHeight: 1.4,
          color: dark ? '#B8AA8E' : SA.graphite,
        }}>
          {signal.summary}
        </p>
      )}

      {error && (
        <p style={{ margin: '6px 0 0', fontFamily: SA.mono, fontSize: 10, color: SA.rust }}>ERR: {error}</p>
      )}

      {/* Unlock flash overlay */}
      {state === 'unlocked' && locked && (
        <div style={{
          pointerEvents: 'none', position: 'absolute', inset: 0,
          backgroundColor: 'rgba(42,168,75,0.06)',
          animation: 'sa-unlock-flash 1s ease-out forwards',
        }} />
      )}

      {/* Cast modal */}
      {state === 'modal' && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column', gap: 10,
            background: dark ? '#1A1814' : SA.paper,
            padding: 16,
            border: `1px solid ${SA.platinumLo}`,
          }}
        >
          <div style={{ fontFamily: SA.mono, fontSize: 9, letterSpacing: 1.5, color: SA.ash, textTransform: 'uppercase' }}>
            CAST PREVIEW — EDITABLE
          </div>
          <textarea
            value={castText}
            onChange={(e) => setCastText(e.target.value)}
            maxLength={280}
            rows={4}
            style={{
              fontFamily: SA.mono, fontSize: 11, lineHeight: 1.5,
              color: dark ? SA.paperDeep : SA.ink,
              background: dark ? '#0F1B10' : SA.platinumHi,
              border: `1px solid ${ruleC}`,
              padding: 10, resize: 'none', outline: 'none', width: '100%',
              borderRadius: 0,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: SA.mono, fontSize: 10, color: SA.ash }}>{castText.length}/280</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <PButtonInline onClick={() => setState('idle')}>Cancel</PButtonInline>
              <PButtonInline primary onClick={handleCastAndUnlock}>Cast & Unlock ↑</PButtonInline>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Tiny inline button to avoid circular import
function PButtonInline({ children, primary, onClick }: { children: React.ReactNode; primary?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      appearance: 'none',
      border: `1px solid ${primary ? SA.aquaDeep : SA.platinumLo}`,
      background: primary
        ? `linear-gradient(180deg, #6E9BD0 0%, ${SA.aqua} 55%, ${SA.aquaDeep} 100%)`
        : `linear-gradient(180deg, ${SA.platinumHi} 0%, ${SA.platinum} 55%, ${SA.platinumLo} 100%)`,
      color: primary ? '#fff' : SA.ink,
      fontFamily: SA.sans, fontWeight: 600, fontSize: 11,
      padding: '4px 12px', borderRadius: 10,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,.6)`,
      cursor: 'pointer',
      textShadow: primary ? '0 -1px 0 rgba(0,0,0,.25)' : 'none',
    }}>{children}</button>
  );
}
