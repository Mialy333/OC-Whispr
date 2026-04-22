'use client';

import { useState } from 'react';
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

const FOLLOW_URL = 'https://warpcast.com/morningwhispr';

export default function SignalCard({ signal, locked, fid: _fid, dark = false, onOpen }: Props) {
  const [followed, setFollowed] = useState(false);

  const ink  = dark ? SA.paperDeep : SA.ink;
  const muted = SA.ash;
  const ruleC = dark ? '#332E22' : SA.rule;
  const isLocked = locked && !followed;

  const ts = new Date(signal.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  const chart = seededChart(signal.id);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const ctx = await sdk.context;
      if (ctx !== null) {
        await sdk.actions.openUrl(FOLLOW_URL);
      } else {
        window.open(FOLLOW_URL, '_blank', 'noopener,noreferrer');
      }
    } catch {
      window.open(FOLLOW_URL, '_blank', 'noopener,noreferrer');
    }
    setFollowed(true);
  };

  return (
    <div style={{
      padding: 'clamp(12px, 4vw, 20px) clamp(14px, 4.5vw, 20px) clamp(10px, 3.5vw, 16px)',
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
          flex: 1, fontFamily: SA.serif, fontSize: 'clamp(14px, 4vw, 18px)', fontWeight: 500,
          lineHeight: 1.12, margin: 0, letterSpacing: -0.4, color: ink,
          filter: isLocked ? 'blur(4.5px)' : 'none',
          transition: 'filter .4s',
          userSelect: isLocked ? 'none' : 'auto',
        }}>
          {isLocked ? 'Lorem ipsum dolor sit amet consectetur adipiscing elit.' : signal.title}
        </h3>
        <SeverityChip level={signal.severity} />
      </div>

      {/* Data chip + sparkline + follow CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
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
        {isLocked && (
          <button onClick={handleFollow} style={{
            marginLeft: 'auto',
            border: '1px solid var(--accent-phosphore)', background: 'transparent',
            color: 'var(--accent-phosphore)', fontFamily: SA.mono, fontSize: 11, fontWeight: 700,
            letterSpacing: 0.4, padding: '3px 10px', borderRadius: 0, cursor: 'pointer',
          }}>FOLLOW TO UNLOCK</button>
        )}
      </div>

      {/* Follow prompt under data row when locked */}
      {isLocked && (
        <div style={{
          marginTop: 8,
          fontFamily: SA.mono, fontSize: 9, color: muted, letterSpacing: 0.5,
        }}>
          Follow @morningwhispr on Farcaster to unlock
        </div>
      )}

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

      {/* Unlock flash overlay */}
      {followed && locked && (
        <div style={{
          pointerEvents: 'none', position: 'absolute', inset: 0,
          backgroundColor: 'rgba(42,168,75,0.06)',
          animation: 'sa-unlock-flash 1s ease-out forwards',
        }} />
      )}
    </div>
  );
}
