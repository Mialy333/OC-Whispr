'use client';

import { useState } from 'react';
import { SA, PButton } from '@/components/ui';
import type { UserProfile, AdvisorResponse, YieldAdvice } from '@/types/advisor';

const mono = { fontFamily: SA.mono } as const;
const serif = { fontFamily: SA.serif } as const;

type RiskTolerance = UserProfile['riskTolerance'];
type Asset = UserProfile['preferredAssets'][number];

const RISK_OPTS: { label: string; value: RiskTolerance; desc: string }[] = [
  { label: 'Conservative', value: 'conservative', desc: 'Stable yields, low risk'    },
  { label: 'Moderate',     value: 'moderate',     desc: 'Balanced risk / reward'     },
  { label: 'Degen',        value: 'degen',        desc: 'Max yield, high risk'       },
];

const CAPITAL_OPTS = [
  { label: '< $1K',     value: 500   },
  { label: '$1K–$10K',  value: 5000  },
  { label: '$10K+',     value: 25000 },
];

const ASSET_OPTS: { label: string; value: Asset }[] = [
  { label: 'Stablecoin', value: 'stablecoin' },
  { label: 'RWA',        value: 'rwa'        },
  { label: 'DeFi',       value: 'defi'       },
  { label: 'Staking',    value: 'staking'    },
];

const RISK_COLOR: Record<YieldAdvice['riskLevel'], string> = {
  low:    SA.phosphorGlow,
  medium: SA.amber,
  high:   SA.rust,
};

interface Props {
  fid?: number;
  onBack: () => void;
}

export default function AdvisorFlow({ fid, onBack }: Props) {
  const [step, setStep]       = useState<1 | 2 | 3>(1);
  const [risk, setRisk]       = useState<RiskTolerance | null>(null);
  const [capital, setCapital] = useState<number | null>(null);
  const [assets, setAssets]   = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [result, setResult]   = useState<AdvisorResponse | null>(null);

  const toggleAsset = (a: Asset) =>
    setAssets((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a]);

  const handleSubmit = async () => {
    if (!risk || !capital || assets.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const profile: UserProfile = {
        fid,
        riskTolerance:   risk,
        capitalUsd:      capital,
        preferredAssets: assets,
        timeHorizon:     risk === 'conservative' ? 'long' : risk === 'moderate' ? 'medium' : 'short',
      };
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('API error');
      setResult(await res.json());
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const selBtn = (selected: boolean, green = false): React.CSSProperties => ({
    border: `1.5px solid ${selected ? (green ? SA.phosphorGlow : SA.aqua) : 'var(--border)'}`,
    background: selected ? (green ? 'rgba(42,168,75,0.10)' : 'rgba(62,111,168,0.10)') : 'transparent',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all .15s',
  });

  // ── Results ──
  if (result) {
    return (
      <div style={{ padding: '14px 14px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <button onClick={onBack} style={{
            ...mono, fontSize: 10, color: 'var(--text-muted)', background: 'transparent',
            border: '1px solid var(--border)', borderRadius: 8, padding: '3px 10px', cursor: 'pointer',
          }}>← Feed</button>
          <span style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1 }}>YIELD STRATEGY</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {result.advice.map((advice, i) => (
            <div key={i} style={{
              border: '1px solid var(--border)', borderRadius: 12,
              padding: '14px', background: 'var(--bg-secondary)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <h3 style={{ ...serif, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.1 }}>
                  {advice.protocol}
                </h3>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0, paddingTop: 2 }}>
                  <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: SA.phosphorGlow, border: `1px solid ${SA.phosphorGlow}`, padding: '1px 6px', borderRadius: 4 }}>
                    {advice.estimatedApy}
                  </span>
                  <span style={{ ...mono, fontSize: 9, color: RISK_COLOR[advice.riskLevel], border: `1px solid ${RISK_COLOR[advice.riskLevel]}`, padding: '1px 5px', borderRadius: 4, textTransform: 'uppercase' }}>
                    {advice.riskLevel}
                  </span>
                </div>
              </div>
              <div style={{ ...mono, fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.4 }}>
                {advice.strategy}
              </div>
              <div style={{ ...serif, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>
                {advice.rationale}
              </div>
              <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 8, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <span style={{ ...mono, fontSize: 9, color: SA.aqua, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>NEXT</span>
                <span style={{ ...mono, fontSize: 10, color: 'var(--text-primary)', lineHeight: 1.4 }}>{advice.actionStep}</span>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => { setResult(null); setStep(1); setRisk(null); setCapital(null); setAssets([]); }} style={{
          ...mono, width: '100%', marginTop: 14, padding: '9px',
          border: '1px solid var(--border)', borderRadius: 10,
          background: 'transparent', cursor: 'pointer',
          fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.8,
        }}>
          REFINE PROFILE
        </button>
      </div>
    );
  }

  // ── Profile form ──
  return (
    <div style={{ padding: '14px 14px 24px' }}>
      {/* Back + progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={onBack} style={{
          ...mono, fontSize: 10, color: 'var(--text-muted)', background: 'transparent',
          border: '1px solid var(--border)', borderRadius: 8, padding: '3px 10px', cursor: 'pointer',
        }}>← Feed</button>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{
              width: n === step ? 16 : 5, height: 5, borderRadius: 3,
              background: n === step ? SA.aqua : n < step ? SA.phosphorGlow : SA.platinumLo,
              transition: 'all .2s',
            }} />
          ))}
        </div>
        <span style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', letterSpacing: 0.8 }}>
          {step}/3
        </span>
      </div>

      {/* Step 1: Risk */}
      {step === 1 && (
        <>
          <h2 style={{ ...serif, fontSize: 26, fontWeight: 400, color: 'var(--text-primary)', margin: '0 0 18px', lineHeight: 1.05, letterSpacing: -0.5 }}>
            What&apos;s your style?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {RISK_OPTS.map(({ label, value, desc }) => (
              <button key={value} onClick={() => setRisk(value)} style={{ ...selBtn(risk === value), padding: '12px 14px', textAlign: 'left', width: '100%' }}>
                <div style={{ ...serif, fontSize: 16, color: risk === value ? SA.aqua : 'var(--text-primary)' }}>{label}</div>
                <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
              </button>
            ))}
          </div>
          <PButton primary onClick={() => setStep(2)} disabled={!risk}
            style={{ width: '100%', padding: '10px', marginTop: 18, borderRadius: 12, fontSize: 12 }}>
            Next →
          </PButton>
        </>
      )}

      {/* Step 2: Capital */}
      {step === 2 && (
        <>
          <h2 style={{ ...serif, fontSize: 26, fontWeight: 400, color: 'var(--text-primary)', margin: '0 0 18px', lineHeight: 1.05, letterSpacing: -0.5 }}>
            How much deploying?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CAPITAL_OPTS.map(({ label, value }) => (
              <button key={value} onClick={() => setCapital(value)} style={{ ...selBtn(capital === value), padding: '14px', textAlign: 'left', width: '100%' }}>
                <div style={{ ...serif, fontSize: 20, color: capital === value ? SA.aqua : 'var(--text-primary)' }}>{label}</div>
              </button>
            ))}
          </div>
          <PButton primary onClick={() => setStep(3)} disabled={!capital}
            style={{ width: '100%', padding: '10px', marginTop: 18, borderRadius: 12, fontSize: 12 }}>
            Next →
          </PButton>
        </>
      )}

      {/* Step 3: Preferences */}
      {step === 3 && (
        <>
          <h2 style={{ ...serif, fontSize: 26, fontWeight: 400, color: 'var(--text-primary)', margin: '0 0 6px', lineHeight: 1.05, letterSpacing: -0.5 }}>
            What interests you?
          </h2>
          <p style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', letterSpacing: 0.8, margin: '0 0 16px' }}>
            SELECT ALL THAT APPLY
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ASSET_OPTS.map(({ label, value }) => {
              const sel = assets.includes(value);
              return (
                <button key={value} onClick={() => toggleAsset(value)} style={{ ...selBtn(sel, true), padding: '13px 10px', textAlign: 'center' }}>
                  <div style={{ ...mono, fontSize: 11, fontWeight: 600, color: sel ? SA.phosphorGlow : 'var(--text-primary)' }}>
                    {label}
                  </div>
                </button>
              );
            })}
          </div>
          {error && (
            <p style={{ ...mono, fontSize: 10, color: SA.rust, marginTop: 10 }}>⚠ {error}</p>
          )}
          <PButton primary onClick={handleSubmit} disabled={assets.length === 0 || loading}
            style={{ width: '100%', padding: '10px', marginTop: 18, borderRadius: 12, fontSize: 12 }}>
            {loading ? 'Analyzing…' : 'Get my alpha →'}
          </PButton>
        </>
      )}
    </div>
  );
}
