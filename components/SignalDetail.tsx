'use client';

import { useEffect, useState } from 'react';
import { SA, SeverityChip } from '@/components/ui';
import type { AlphaSignal } from '@/types';

const mono  = { fontFamily: SA.mono  } as const;
const serif = { fontFamily: SA.serif } as const;

interface Analysis { explanation: string; investorType: string; }

interface Props {
  signal: AlphaSignal;
  onAdvisor: () => void;
  onBack: () => void;
}

export default function SignalDetail({ signal, onAdvisor, onBack }: Props) {
  const [analysis, setAnalysis]     = useState<Analysis | null>(null);
  const [analysisLoading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setAnalysis(null);
    fetch('/api/signal-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: signal.id, signal }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d && !d.error) setAnalysis(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [signal.id, signal]);

  const ts = new Date(signal.timestamp).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  return (
    <div style={{ padding: '14px 14px 40px', background: 'var(--bg-primary)', minHeight: '100%' }}>

      {/* 1. Back */}
      <button
        onClick={onBack}
        style={{
          ...mono, fontSize: 10, color: 'var(--text-muted)',
          background: 'transparent', border: 'none',
          cursor: 'pointer', padding: '0 0 16px', letterSpacing: 0.5,
        }}
      >
        ← FEED
      </button>

      {/* 2. Severity + source + timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <SeverityChip level={signal.severity} />
        <span style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
          {signal.source}
        </span>
        <span style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {ts}
        </span>
      </div>

      {/* 3. Protocol name */}
      <div style={{ ...serif, fontSize: 13, color: 'var(--text-muted)', letterSpacing: 0.3, marginBottom: 4 }}>
        {signal.protocolName}
      </div>
      <h2 style={{
        ...serif, fontSize: 'clamp(22px, 6vw, 28px)', fontWeight: 700,
        color: 'var(--text-primary)', margin: '0 0 14px',
        lineHeight: 1.1, letterSpacing: -0.5,
      }}>
        {signal.title}
      </h2>

      {/* 4. Data point pill */}
      <div style={{
        display: 'inline-block',
        ...mono, fontSize: 11, fontWeight: 700,
        color: SA.phosphorGlow,
        background: SA.terminal,
        padding: '4px 10px',
        marginBottom: 16,
        letterSpacing: 0.5,
      }}>
        {signal.dataPoint}
      </div>

      {/* 5. Summary */}
      <p style={{
        ...serif, fontSize: 15, lineHeight: 1.7,
        color: 'var(--text-secondary)', margin: '0 0 20px',
      }}>
        {signal.summary}
      </p>

      {/* 6. What this means */}
      <div style={{
        border: '1px solid var(--border)', borderRadius: 10,
        padding: '14px', marginBottom: 20,
        background: 'var(--bg-secondary)',
      }}>
        <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' }}>
          WHAT THIS MEANS
        </div>

        {analysisLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[80, 95, 60].map((w, i) => (
              <div key={i} style={{
                height: 11, width: `${w}%`, borderRadius: 3,
                background: 'var(--border)', opacity: 0.6,
              }} />
            ))}
          </div>
        ) : analysis ? (
          <>
            <p style={{ ...serif, fontSize: 14, lineHeight: 1.65, color: 'var(--text-primary)', margin: '0 0 10px' }}>
              {analysis.explanation}
            </p>
            {analysis.investorType && (
              <div style={{
                borderTop: '0.5px solid var(--border)', paddingTop: 9,
                display: 'flex', gap: 7, alignItems: 'flex-start',
              }}>
                <span style={{ ...mono, fontSize: 9, color: SA.aqua, fontWeight: 700, flexShrink: 0, letterSpacing: 0.5 }}>
                  FOR
                </span>
                <span style={{ ...mono, fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {analysis.investorType}
                </span>
              </div>
            )}
          </>
        ) : (
          <p style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>
            Analysis unavailable — signal data cached.
          </p>
        )}
      </div>

      {/* 7. Divider */}
      <div style={{ borderTop: '0.5px solid var(--border)', marginBottom: 20 }} />

      {/* 8. CTA */}
      <button
        onClick={onAdvisor}
        style={{
          width: '100%',
          padding: '14px',
          background: 'var(--bg-terminal, #0C1A0C)',
          border: `1.5px solid ${SA.phosphorGlow}`,
          borderRadius: 12,
          color: SA.phosphorGlow,
          ...mono, fontSize: 12, fontWeight: 700,
          letterSpacing: 0.8, textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        GET STRATEGY FOR THIS SIGNAL →
      </button>
    </div>
  );
}
