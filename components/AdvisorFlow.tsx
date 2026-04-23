'use client';

import { useState } from 'react';
import { SA, PButton } from '@/components/ui';
import type { UserProfile, AdvisorResponse, YieldAdvice } from '@/types/advisor';

const mono  = { fontFamily: SA.mono  } as const;
const serif = { fontFamily: SA.serif } as const;

// Hardcoded to match #F2ECDF frame shell — CSS vars don't resolve reliably in Warpcast webview
const PAPER    = '#F2ECDF';
const PAPER_D  = '#E8DFCC';
const INK      = '#1A1814';
const ASH      = '#7A7364';
const RULE     = '#9E9378';
const AQUA     = '#3E6FA8';
const PHOSPHOR = '#2AA84B';

type RiskTolerance = UserProfile['riskTolerance'];
type Asset = UserProfile['preferredAssets'][number];

const RISK_OPTS: { label: string; value: RiskTolerance; desc: string }[] = [
  { label: 'Conservative', value: 'conservative', desc: 'Stable yields, low risk'  },
  { label: 'Moderate',     value: 'moderate',     desc: 'Balanced risk / reward'   },
  { label: 'Degen',        value: 'degen',        desc: 'Max yield, high risk'     },
];

const CAPITAL_OPTS = [
  { label: '< $1K',    value: 500   },
  { label: '$1K–$10K', value: 5000  },
  { label: '$10K+',    value: 25000 },
];

const ASSET_OPTS: { label: string; value: Asset }[] = [
  { label: 'Stablecoin', value: 'stablecoin' },
  { label: 'RWA',        value: 'rwa'        },
  { label: 'DeFi',       value: 'defi'       },
  { label: 'Staking',    value: 'staking'    },
];

const RISK_COLOR: Record<YieldAdvice['riskLevel'], string> = {
  low:    PHOSPHOR,
  medium: SA.amber,
  high:   SA.rust,
};

interface Props { fid?: number; onBack: () => void; }

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
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('API error');
      setResult(await res.json());
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const selBtn = (selected: boolean, accent = AQUA): React.CSSProperties => ({
    border:     `1.5px solid ${selected ? accent : RULE}`,
    background: selected ? (accent === PHOSPHOR ? 'rgba(42,168,75,0.12)' : 'rgba(62,111,168,0.12)') : PAPER,
    borderRadius: 10,
    cursor:     'pointer',
    transition: 'all .15s',
  });

  // ── Results ────────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div style={{ padding: '14px 14px 24px', background: PAPER, minHeight: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <button onClick={onBack} style={{
            ...mono, fontSize: 10, color: ASH, background: PAPER,
            border: `1px solid ${RULE}`, borderRadius: 8, padding: '4px 11px', cursor: 'pointer',
          }}>← Feed</button>
          <span style={{ ...mono, fontSize: 9, color: ASH, letterSpacing: 1.5 }}>YIELD STRATEGY</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {result.advice.map((advice, i) => (
            <div key={i} style={{
              border: `1px solid ${RULE}`, borderRadius: 12,
              padding: '14px', background: PAPER_D,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <h3 style={{ ...serif, fontSize: 18, fontWeight: 700, color: INK, margin: 0, lineHeight: 1.1 }}>
                  {advice.protocol}
                </h3>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0, paddingTop: 2 }}>
                  <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: PHOSPHOR, border: `1px solid ${PHOSPHOR}`, padding: '2px 7px', borderRadius: 4 }}>
                    {advice.estimatedApy}
                  </span>
                  <span style={{ ...mono, fontSize: 9, color: RISK_COLOR[advice.riskLevel], border: `1px solid ${RISK_COLOR[advice.riskLevel]}`, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
                    {advice.riskLevel}
                  </span>
                </div>
              </div>

              <div style={{ ...mono, fontSize: 11, color: INK, marginBottom: 6, lineHeight: 1.5, fontWeight: 600 }}>
                {advice.strategy}
              </div>
              <div style={{ ...serif, fontSize: 13, color: INK, lineHeight: 1.55, marginBottom: 10, opacity: 0.85 }}>
                {advice.rationale}
              </div>

              <div style={{ borderTop: `0.5px solid ${RULE}`, paddingTop: 9, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <span style={{ ...mono, fontSize: 9, color: AQUA, fontWeight: 700, flexShrink: 0, marginTop: 1, letterSpacing: 0.5 }}>NEXT</span>
                <span style={{ ...mono, fontSize: 11, color: INK, lineHeight: 1.45 }}>{advice.actionStep}</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => { setResult(null); setStep(1); setRisk(null); setCapital(null); setAssets([]); }}
          style={{
            ...mono, width: '100%', marginTop: 14, padding: '10px',
            border: `1px solid ${RULE}`, borderRadius: 10,
            background: PAPER, cursor: 'pointer',
            fontSize: 10, color: ASH, letterSpacing: 1,
          }}
        >
          REFINE PROFILE
        </button>
      </div>
    );
  }

  // ── Profile form ───────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '14px 14px 24px', background: PAPER, minHeight: '100%' }}>
      {/* Back + progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={onBack} style={{
          ...mono, fontSize: 10, color: ASH, background: PAPER,
          border: `1px solid ${RULE}`, borderRadius: 8, padding: '4px 11px', cursor: 'pointer',
        }}>← Feed</button>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{
              width: n === step ? 18 : 5, height: 5, borderRadius: 3,
              background: n === step ? AQUA : n < step ? PHOSPHOR : RULE,
              transition: 'all .2s',
            }} />
          ))}
        </div>
        <span style={{ ...mono, fontSize: 9, color: ASH, letterSpacing: 1 }}>
          {step}/3
        </span>
      </div>

      {/* Step 1: Risk */}
      {step === 1 && (
        <>
          <h2 style={{ ...serif, fontSize: 28, fontWeight: 400, color: INK, margin: '0 0 18px', lineHeight: 1.05, letterSpacing: -0.5 }}>
            What&apos;s your style?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {RISK_OPTS.map(({ label, value, desc }) => (
              <button key={value} onClick={() => setRisk(value)}
                style={{ ...selBtn(risk === value), padding: '13px 14px', textAlign: 'left', width: '100%' }}>
                <div style={{ ...serif, fontSize: 17, color: risk === value ? AQUA : INK, marginBottom: 2 }}>{label}</div>
                <div style={{ ...mono, fontSize: 10, color: ASH, lineHeight: 1.4 }}>{desc}</div>
              </button>
            ))}
          </div>
          <PButton primary onClick={() => setStep(2)} disabled={!risk}
            style={{ width: '100%', padding: '11px', marginTop: 20, borderRadius: 12, fontSize: 12 }}>
            Next →
          </PButton>
        </>
      )}

      {/* Step 2: Capital */}
      {step === 2 && (
        <>
          <h2 style={{ ...serif, fontSize: 28, fontWeight: 400, color: INK, margin: '0 0 18px', lineHeight: 1.05, letterSpacing: -0.5 }}>
            How much deploying?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CAPITAL_OPTS.map(({ label, value }) => (
              <button key={value} onClick={() => setCapital(value)}
                style={{ ...selBtn(capital === value), padding: '16px 14px', textAlign: 'left', width: '100%' }}>
                <div style={{ ...serif, fontSize: 22, color: capital === value ? AQUA : INK }}>{label}</div>
              </button>
            ))}
          </div>
          <PButton primary onClick={() => setStep(3)} disabled={!capital}
            style={{ width: '100%', padding: '11px', marginTop: 20, borderRadius: 12, fontSize: 12 }}>
            Next →
          </PButton>
        </>
      )}

      {/* Step 3: Preferences */}
      {step === 3 && (
        <>
          <h2 style={{ ...serif, fontSize: 28, fontWeight: 400, color: INK, margin: '0 0 6px', lineHeight: 1.05, letterSpacing: -0.5 }}>
            What interests you?
          </h2>
          <p style={{ ...mono, fontSize: 9, color: ASH, letterSpacing: 1, margin: '0 0 16px' }}>
            SELECT ALL THAT APPLY
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ASSET_OPTS.map(({ label, value }) => {
              const sel = assets.includes(value);
              return (
                <button key={value} onClick={() => toggleAsset(value)}
                  style={{ ...selBtn(sel, PHOSPHOR), padding: '15px 10px', textAlign: 'center' }}>
                  <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: sel ? PHOSPHOR : INK }}>
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
            style={{ width: '100%', padding: '11px', marginTop: 20, borderRadius: 12, fontSize: 12 }}>
            {loading ? 'Analyzing…' : 'Get my alpha →'}
          </PButton>
        </>
      )}
    </div>
  );
}
