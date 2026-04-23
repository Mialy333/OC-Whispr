'use client';

import type { AlphaSignal } from '@/types';
import { SA, Sparkline, SeverityChip, seededChart } from '@/components/ui';
import WaitlistButton from '@/components/WaitlistButton';

interface Props {
  signal: AlphaSignal;
  locked: boolean;
  fid: number;
  dark?: boolean;
  onOpen?: (s: AlphaSignal) => void;
}

export default function SignalCard({ signal, locked, fid: _fid, dark = false, onOpen }: Props) {
  const ink   = dark ? SA.paperDeep : SA.ink;
  const muted = SA.ash;
  const ruleC = dark ? '#332E22' : SA.rule;

  const ts = new Date(signal.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  const chart = seededChart(signal.id);

  return (
    <div style={{
      padding: 'clamp(12px, 4vw, 20px) clamp(14px, 4.5vw, 20px) clamp(10px, 3.5vw, 16px)',
      borderBottom: `0.5px solid ${ruleC}`,
      position: 'relative', cursor: 'pointer',
      background: signal.boosted && !locked
        ? (dark ? 'rgba(42,168,75,0.05)' : 'rgba(42,168,75,0.04)')
        : 'transparent',
    }} onClick={() => !locked && onOpen?.(signal)}>

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
          filter: locked ? 'blur(4.5px)' : 'none',
          transition: 'filter .4s',
          userSelect: locked ? 'none' : 'auto',
        }}>
          {locked ? 'Lorem ipsum dolor sit amet consectetur adipiscing elit.' : signal.title}
        </h3>
        <SeverityChip level={signal.severity} />
      </div>

      {/* Data chip + sparkline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: SA.mono, fontSize: 10, letterSpacing: 0.5,
          background: dark ? '#0C1A0C' : SA.terminal,
          color: SA.terminalGreen,
          padding: '2px 7px',
          filter: locked ? 'blur(4px)' : 'none',
          transition: 'filter .4s',
        }}>
          {locked ? '██████ ██.█%' : signal.dataPoint}
        </span>
        <Sparkline data={chart} w={64} h={18} color={SA.phosphorGlow} />
      </div>

      {/* Premium locked state */}
      {locked && (
        <div style={{
          marginTop: 12,
          padding: '10px 12px',
          border: `1px solid ${dark ? '#332E22' : SA.rule}`,
          borderRadius: 8,
          background: dark ? 'rgba(26,24,20,0.6)' : 'rgba(242,236,223,0.8)',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{
            fontFamily: SA.mono, fontSize: 10, fontWeight: 700,
            color: muted, letterSpacing: 1, textTransform: 'uppercase',
          }}>
            🔒 PREMIUM
          </div>
          <div style={{
            fontFamily: SA.mono, fontSize: 9.5, color: muted,
            letterSpacing: 0.3, lineHeight: 1.45,
          }}>
            Full analysis available for Premium members
          </div>
          <WaitlistButton />
        </div>
      )}

      {/* Summary — only when unlocked */}
      {!locked && (
        <p style={{
          margin: '8px 0 0',
          fontFamily: SA.serif, fontSize: 12, lineHeight: 1.4,
          color: dark ? '#B8AA8E' : SA.graphite,
        }}>
          {signal.summary}
        </p>
      )}
    </div>
  );
}
