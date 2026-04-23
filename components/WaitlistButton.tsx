'use client';

import { useState } from 'react';
import { SA } from '@/components/ui';

type State = 'idle' | 'expanded' | 'success' | 'error';

export default function WaitlistButton() {
  const [state, setState]       = useState<State>('idle');
  const [email, setEmail]       = useState('');
  const [position, setPosition] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSubmitting(true);
    try {
      const res  = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setState('error');
      } else {
        setPosition(data.position);
        setState('success');
      }
    } catch {
      setState('error');
    } finally {
      setSubmitting(false);
    }
  };

  const btnBase: React.CSSProperties = {
    border: '1px solid var(--accent-phosphore)',
    background: 'transparent',
    color: 'var(--accent-phosphore)',
    fontFamily: SA.mono, fontSize: 11, fontWeight: 700,
    letterSpacing: 0.4, padding: '4px 12px',
    borderRadius: 0, cursor: 'pointer',
    textTransform: 'uppercase' as const,
  };

  if (state === 'success') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ fontFamily: SA.mono, fontSize: 11, fontWeight: 700, color: 'var(--accent-phosphore)', letterSpacing: 0.4 }}>
          ✓ YOU&apos;RE ON THE LIST
        </div>
        {position !== null && (
          <div style={{ fontFamily: SA.mono, fontSize: 10, color: 'var(--accent-phosphore)', letterSpacing: 0.3 }}>
            Position #{position}
          </div>
        )}
      </div>
    );
  }

  if (state === 'idle') {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setState('expanded'); }}
        style={btnBase}
      >
        JOIN WAITLIST
      </button>
    );
  }

  // expanded / error
  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}
    >
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (state === 'error') setState('expanded'); }}
          placeholder="your@email.com"
          autoFocus
          style={{
            flex: 1, minWidth: 0,
            fontFamily: SA.mono, fontSize: 12,
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--accent-phosphore)',
            color: 'var(--text-primary)',
            outline: 'none',
            padding: '3px 0',
          }}
        />
        <button
          type="submit"
          disabled={submitting}
          style={{ ...btnBase, fontSize: 10, padding: '3px 10px', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? '…' : 'CONFIRM'}
        </button>
      </div>
      {state === 'error' && (
        <div style={{ fontFamily: SA.mono, fontSize: 9.5, color: 'var(--signal-high)', letterSpacing: 0.3 }}>
          Invalid email
        </div>
      )}
    </form>
  );
}
