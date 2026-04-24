'use client';

import { useState } from 'react';
import { useSendTransaction } from '@privy-io/react-auth';
import { parseEther } from 'viem';
import { SA } from '@/components/ui';

const mono = { fontFamily: SA.mono } as const;

const TIPS = [
  { label: 'Coffee', amount: '0.001', emoji: '☕' },
  { label: 'Pizza',  amount: '0.005', emoji: '🍕' },
  { label: 'Rocket', amount: '0.01',  emoji: '🚀' },
] as const;

const DONATION_ADDRESS =
  (process.env.NEXT_PUBLIC_DONATION_ADDRESS as `0x${string}` | undefined) ?? '0x0000000000000000000000000000000000000000';

type State = 'idle' | 'picking' | 'pending' | 'success' | 'error';

interface Props { compact?: boolean; }

export default function TipButton({ compact = false }: Props) {
  const { sendTransaction } = useSendTransaction();
  const [state, setState]   = useState<State>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const send = async (amount: string) => {
    setState('pending');
    try {
      const { hash } = await sendTransaction({
        to:      DONATION_ADDRESS,
        value:   parseEther(amount),
        chainId: 8453,
      });
      setTxHash(hash);
      setState('success');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Transaction failed');
      setState('error');
    }
  };

  // ── Compact (header) variant ───────────────────────────────────────────────
  if (compact) {
    if (state === 'pending') {
      return (
        <span style={{ ...mono, fontSize: 9, color: SA.terminalGreen, letterSpacing: 0.5 }}>
          …
        </span>
      );
    }
    if (state === 'success') {
      return (
        <span style={{ ...mono, fontSize: 9, color: SA.phosphorGlow, letterSpacing: 0.5 }}>
          ✓
        </span>
      );
    }

    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setState(state === 'picking' ? 'idle' : 'picking')}
          style={{
            ...mono, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase',
            color: state === 'picking' ? SA.amber : 'var(--text-muted)',
            background: 'transparent',
            border: `1px solid ${state === 'picking' ? SA.amber : 'var(--border)'}`,
            borderRadius: 4, padding: '2px 8px', height: 18,
            cursor: 'pointer', lineHeight: 1,
          }}
        >
          ☕ TIP
        </button>

        {state === 'picking' && (
          <div style={{
            position: 'absolute', top: 22, right: 0,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 8, padding: 8,
            zIndex: 50, minWidth: 110,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}>
            {TIPS.map(({ label, amount, emoji }) => (
              <button
                key={amount}
                onClick={() => send(amount)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  width: '100%', padding: '6px 8px',
                  background: 'transparent',
                  border: 'none', borderRadius: 6,
                  cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-tertiary, rgba(0,0,0,0.06))'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 13 }}>{emoji}</span>
                <span style={{ ...mono, fontSize: 10, color: 'var(--text-primary)', fontWeight: 600 }}>{label}</span>
                <span style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>{amount}</span>
              </button>
            ))}
            {errMsg && (
              <div style={{ ...mono, fontSize: 8, color: SA.rust, padding: '4px 8px 0', borderTop: '0.5px solid var(--border)', marginTop: 4 }}>
                ⚠ {errMsg}
                <button onClick={() => { setErrMsg(null); setState('picking'); }} style={{ ...mono, fontSize: 8, color: SA.aqua, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 6 }}>retry</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Full variant ───────────────────────────────────────────────────────────
  if (state === 'success') {
    return (
      <div style={{
        border: `1px solid ${SA.phosphorGlow}`,
        borderRadius: 12, padding: '12px 14px',
        background: 'var(--bg-terminal, #0C1A0C)',
        textAlign: 'center',
      }}>
        <div style={{ ...mono, fontSize: 11, color: SA.phosphorGlow, fontWeight: 700, marginBottom: 4 }}>
          ✓ TIP SENT
        </div>
        {txHash && (
          <div style={{ ...mono, fontSize: 9, color: SA.terminalGreen, opacity: 0.7, wordBreak: 'break-all' }}>
            {txHash.slice(0, 12)}…{txHash.slice(-6)}
          </div>
        )}
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div style={{ border: `1px solid ${SA.rust}`, borderRadius: 12, padding: '12px 14px', background: 'var(--bg-secondary)' }}>
        <div style={{ ...mono, fontSize: 10, color: SA.rust, marginBottom: 8 }}>⚠ {errMsg ?? 'Transaction failed'}</div>
        <button
          onClick={() => { setState('idle'); setErrMsg(null); }}
          style={{
            ...mono, fontSize: 10, color: 'var(--text-muted)',
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 8, padding: '4px 12px', cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (state === 'pending') {
    return (
      <div style={{
        border: `1px solid rgba(0,255,65,0.2)`, borderRadius: 12,
        padding: '12px 14px', background: 'var(--bg-terminal, #0C1A0C)',
        textAlign: 'center',
      }}>
        <div style={{ ...mono, fontSize: 10, color: SA.terminalGreen, letterSpacing: 1 }}>
          › Sending on Base…
        </div>
      </div>
    );
  }

  if (state === 'picking') {
    return (
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', background: 'var(--bg-secondary)' }}>
        <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' }}>
          Tip on Base
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {TIPS.map(({ label, amount, emoji }) => (
            <button
              key={amount}
              onClick={() => send(amount)}
              style={{
                flex: 1, padding: '10px 0',
                border: `1.5px solid ${SA.phosphorGlow}`,
                borderRadius: 10, background: 'var(--bg-primary)',
                cursor: 'pointer', textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 16 }}>{emoji}</div>
              <div style={{ ...mono, fontSize: 9, color: SA.phosphorGlow, fontWeight: 700, marginTop: 3 }}>{label}</div>
              <div style={{ ...mono, fontSize: 8, color: 'var(--text-muted)', marginTop: 2 }}>{amount} ETH</div>
            </button>
          ))}
        </div>
        <button
          onClick={() => setState('idle')}
          style={{
            ...mono, fontSize: 9, color: 'var(--text-muted)',
            background: 'transparent', border: 'none',
            cursor: 'pointer', marginTop: 8, letterSpacing: 0.5,
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setState('picking')}
      style={{
        width: '100%', padding: '11px',
        border: `1.5px solid ${SA.amber}`,
        background: 'transparent', borderRadius: 12, cursor: 'pointer',
        ...mono, fontSize: 11, fontWeight: 700,
        color: SA.amber, letterSpacing: 0.5,
      }}
    >
      ☕ Tip the builder on Base
    </button>
  );
}
