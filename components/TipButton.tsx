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

export default function TipButton() {
  const { sendTransaction }  = useSendTransaction();
  const [state, setState]    = useState<State>('idle');
  const [txHash, setTxHash]  = useState<string | null>(null);
  const [errMsg, setErrMsg]  = useState<string | null>(null);

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
