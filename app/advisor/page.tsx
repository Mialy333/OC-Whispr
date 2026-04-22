'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { SA, PButton, RainbowStripes } from '@/components/ui';
import type { UserProfile } from '@/types/advisor';

const mono = { fontFamily: SA.mono } as const;
const serif = { fontFamily: SA.serif } as const;

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const read = () => setDark(document.documentElement.getAttribute('data-theme') === 'dark');
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

type RiskTolerance = UserProfile['riskTolerance'];
type Asset = UserProfile['preferredAssets'][number];

const RISK_OPTS: { label: string; value: RiskTolerance; desc: string }[] = [
  { label: 'Conservative', value: 'conservative', desc: 'Stable yields, audited protocols' },
  { label: 'Moderate',     value: 'moderate',     desc: 'Balanced risk / reward' },
  { label: 'Degen',        value: 'aggressive',   desc: 'Max yield, high risk' },
];

const CAPITAL_OPTS: { label: string; value: number }[] = [
  { label: '< $1K',       value: 500   },
  { label: '$1K – $10K',  value: 5000  },
  { label: '$10K+',       value: 25000 },
];

const ASSET_OPTS: { label: string; value: Asset }[] = [
  { label: 'Stablecoin Yield', value: 'stablecoins' },
  { label: 'RWA',              value: 'rwa'          },
  { label: 'DeFi',             value: 'defi'         },
  { label: 'Liquid Staking',   value: 'eth'          },
];

export default function AdvisorPage() {
  const { ready, authenticated, login, user } = usePrivy();
  const router = useRouter();
  const dark = useDark();

  const [step, setStep]       = useState<1 | 2 | 3 | 4>(1);
  const [risk, setRisk]       = useState<RiskTolerance | null>(null);
  const [capital, setCapital] = useState<number | null>(null);
  const [assets, setAssets]   = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const ink    = dark ? '#F5F0E8' : SA.ink;
  const sec    = dark ? '#C8C2B4' : SA.graphite;
  const muted  = dark ? '#8C8479' : SA.ash;
  const border = dark ? '#332E22' : SA.rule;

  const handleConnect = async () => {
    if (!authenticated) await login();
    setStep(2);
  };

  const toggleAsset = (a: Asset) =>
    setAssets((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  const handleSubmit = async () => {
    if (!risk || !capital || assets.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const profile: UserProfile = {
        fid:              user?.farcaster?.fid ?? undefined,
        riskTolerance:    risk,
        capitalUsd:       capital,
        preferredAssets:  assets,
        timeHorizon:      risk === 'conservative' ? 'long' : risk === 'moderate' ? 'medium' : 'short',
      };
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      sessionStorage.setItem('advisorResult', JSON.stringify(data));
      router.push('/advisor/results');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const selBtn = (selected: boolean, green = false) => ({
    border: `1.5px solid ${selected ? (green ? SA.phosphorGlow : SA.aqua) : border}`,
    background: selected
      ? green
        ? `rgba(42,168,75,0.10)`
        : `rgba(62,111,168,0.10)`
      : 'transparent',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all .15s',
  });

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: dark ? '#0F0D0A' : '#D8D0C0',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    }}>
      <div style={{
        width: 424, minHeight: '100vh',
        backgroundColor: dark ? SA.ink : SA.paper,
        display: 'flex', flexDirection: 'column', color: ink,
      }}>

        {/* Progress dots */}
        <div style={{ padding: '18px 22px 0', display: 'flex', gap: 6, alignItems: 'center' }}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} style={{
              width: n === step ? 20 : 6, height: 6, borderRadius: 3,
              background: n === step ? SA.aqua : n < step ? SA.phosphorGlow : SA.platinumLo,
              transition: 'all .3s',
            }} />
          ))}
          <span style={{ ...mono, fontSize: 9, color: muted, marginLeft: 8, letterSpacing: 1 }}>
            STEP {step} OF 4
          </span>
        </div>

        {/* ── Step 1: Privy gate ── */}
        {step === 1 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 22px 28px' }}>
            <RainbowStripes h={4} w={48} />
            <h1 style={{ ...serif, fontSize: 34, fontWeight: 400, lineHeight: 1.05, letterSpacing: -1, color: ink, margin: '20px 0 14px' }}>
              Your personalized<br /><em>yield strategy.</em>
            </h1>
            <p style={{ ...serif, fontSize: 13.5, lineHeight: 1.6, color: sec, margin: 0 }}>
              Connect your wallet to get 3 yield strategies tailored to your risk profile, capital, and preferences — powered by Claude.
            </p>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <PButton primary onClick={handleConnect} disabled={!ready}
                style={{ width: '100%', padding: '11px', fontSize: 13, borderRadius: 14 }}>
                {authenticated ? 'Continue →' : 'Connect your wallet →'}
              </PButton>
              <button onClick={() => setStep(2)} style={{
                ...mono, background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: 10, color: muted, letterSpacing: 1, textTransform: 'uppercase',
                padding: '6px 0', textAlign: 'center',
              }}>
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Risk profile ── */}
        {step === 2 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 22px 28px' }}>
            <div style={{ ...mono, fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 12 }}>RISK PROFILE</div>
            <h1 style={{ ...serif, fontSize: 34, fontWeight: 400, lineHeight: 1.05, letterSpacing: -1, color: ink, margin: '0 0 28px' }}>
              What&apos;s your style?
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {RISK_OPTS.map(({ label, value, desc }) => (
                <button key={value} onClick={() => setRisk(value)} style={{
                  ...selBtn(risk === value), padding: '14px 18px', textAlign: 'left',
                }}>
                  <div style={{ ...serif, fontSize: 18, fontWeight: 500, color: risk === value ? SA.aqua : ink }}>
                    {label}
                  </div>
                  <div style={{ ...mono, fontSize: 10, color: muted, marginTop: 3, letterSpacing: 0.4 }}>
                    {desc}
                  </div>
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <PButton primary onClick={() => setStep(3)} disabled={!risk}
              style={{ width: '100%', padding: '11px', fontSize: 13, borderRadius: 14, marginTop: 24 }}>
              Next →
            </PButton>
          </div>
        )}

        {/* ── Step 3: Capital range ── */}
        {step === 3 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 22px 28px' }}>
            <div style={{ ...mono, fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 12 }}>CAPITAL</div>
            <h1 style={{ ...serif, fontSize: 34, fontWeight: 400, lineHeight: 1.05, letterSpacing: -1, color: ink, margin: '0 0 28px' }}>
              How much are you<br /><em>deploying?</em>
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CAPITAL_OPTS.map(({ label, value }) => (
                <button key={value} onClick={() => setCapital(value)} style={{
                  ...selBtn(capital === value), padding: '18px 18px', textAlign: 'left',
                }}>
                  <div style={{ ...serif, fontSize: 22, fontWeight: 400, color: capital === value ? SA.aqua : ink }}>
                    {label}
                  </div>
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <PButton primary onClick={() => setStep(4)} disabled={!capital}
              style={{ width: '100%', padding: '11px', fontSize: 13, borderRadius: 14, marginTop: 24 }}>
              Next →
            </PButton>
          </div>
        )}

        {/* ── Step 4: Preferences + submit ── */}
        {step === 4 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 22px 28px' }}>
            <div style={{ ...mono, fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 12 }}>PREFERENCES</div>
            <h1 style={{ ...serif, fontSize: 34, fontWeight: 400, lineHeight: 1.05, letterSpacing: -1, color: ink, margin: '0 0 6px' }}>
              What interests you?
            </h1>
            <p style={{ ...mono, fontSize: 10, color: muted, letterSpacing: 0.8, margin: '0 0 24px' }}>
              SELECT ALL THAT APPLY
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {ASSET_OPTS.map(({ label, value }) => {
                const selected = assets.includes(value);
                return (
                  <button key={value} onClick={() => toggleAsset(value)} style={{
                    ...selBtn(selected, true), padding: '16px 12px', textAlign: 'center',
                  }}>
                    <div style={{
                      ...mono, fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
                      color: selected ? SA.phosphorGlow : ink,
                    }}>
                      {label}
                    </div>
                  </button>
                );
              })}
            </div>
            {error && (
              <p style={{ ...mono, fontSize: 10, color: SA.rust, marginTop: 14, letterSpacing: 0.3 }}>
                ⚠ {error}
              </p>
            )}
            <div style={{ flex: 1 }} />
            <PButton primary onClick={handleSubmit} disabled={assets.length === 0 || loading}
              style={{ width: '100%', padding: '11px', fontSize: 13, borderRadius: 14, marginTop: 24 }}>
              {loading ? 'Analyzing…' : 'Get my alpha →'}
            </PButton>
          </div>
        )}
      </div>
    </div>
  );
}
