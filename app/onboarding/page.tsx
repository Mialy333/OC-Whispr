'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { SA, PButton, RainbowStripes, SeverityChip } from '@/components/ui';

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

const PREVIEW_SIGNALS = [
  {
    id: 'prev1', protocol: 'Ondo Finance', source: 'DeFiLlama',
    title: 'USDY supply swells past $720M in 48 hours',
    dataPoint: 'SUPPLY +18.4% · 48H', severity: 'high' as const,
  },
  {
    id: 'prev2', protocol: 'Aerodrome', source: 'TokenTerminal',
    title: 'Aerodrome fees +64% — Base volume surge',
    dataPoint: 'FEES +64%', severity: 'high' as const,
  },
];

export default function OnboardingPage() {
  const { ready, authenticated, login } = usePrivy();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const dark = useDark();

  const handleConnect = async () => {
    if (!authenticated) {
      await login();
    }
    setStep(2);
  };

  const handleFinish = () => router.push('/');

  const paper  = dark ? SA.ink       : SA.paper;
  const ink    = dark ? '#F5F0E8'    : SA.ink;
  const sec    = dark ? '#C8C2B4'    : SA.graphite;
  const muted  = dark ? '#8C8479'    : SA.ash;
  const border = dark ? '#332E22'    : SA.rule;

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: dark ? '#0F0D0A' : '#D8D0C0',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    }}>
      <div style={{
        width: 424, minHeight: '100vh',
        backgroundColor: paper, display: 'flex', flexDirection: 'column',
        fontFamily: SA.serif, color: ink,
      }}>

        {/* Progress dots */}
        <div style={{
          padding: '18px 22px 0', display: 'flex', gap: 6, alignItems: 'center',
        }}>
          {([1, 2, 3] as const).map((n) => (
            <div key={n} style={{
              width: n === step ? 20 : 6, height: 6, borderRadius: 3,
              background: n === step ? SA.aqua : (n < step ? SA.phosphorGlow : SA.platinumLo),
              transition: 'all .3s',
            }} />
          ))}
          <span style={{ ...mono, fontSize: 9, color: muted, marginLeft: 8, letterSpacing: 1 }}>
            STEP {step} OF 3
          </span>
        </div>

        {/* ── Step 1: Connect ── */}
        {step === 1 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 22px 28px' }}>
            <RainbowStripes h={4} w={48} />
            <h1 style={{
              ...serif, fontSize: 36, fontWeight: 400, lineHeight: 1.0,
              letterSpacing: -1, color: ink, margin: '20px 0 10px',
            }}>
              Why every investor<br />should read <em>Alpha Whispr.</em>
            </h1>
            <div style={{ ...serif, fontSize: 13, lineHeight: 1.5, color: sec, flex: 1 }}>
              <p style={{ margin: 0, textIndent: 12 }}>
                Today, there are more onchain signals per minute than any
                analyst can process in a day. The ones that actually move
                markets are buried beneath ten thousand that don&apos;t.
              </p>
              <p style={{ margin: '10px 0 0', textIndent: 12 }}>
                Alpha Whispr monitors DeFiLlama, CoinGecko, and Token
                Terminal continuously — detecting anomalies in RWA yields,
                stablecoin pegs, and protocol revenue before they hit
                your timeline.
              </p>
              <p style={{ margin: '10px 0 0', textIndent: 12 }}>
                Your feed is personalized by your Farcaster network.
                The people you trust surface what matters to you.
              </p>
              <p style={{ margin: '14px 0 0', fontStyle: 'italic', color: muted }}>
                Cast a signal — unlock the next.
                Intelligence that pays itself forward.
              </p>
            </div>
            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <PButton
                primary
                onClick={handleConnect}
                disabled={!ready}
                style={{ width: '100%', padding: '11px', fontSize: 13, borderRadius: 14 }}
              >
                {authenticated ? 'Continue →' : 'Connect with Farcaster →'}
              </PButton>
              <button
                onClick={() => setStep(2)}
                style={{
                  ...mono, background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: 10, color: muted, letterSpacing: 1, textTransform: 'uppercase',
                  padding: '6px 0', textAlign: 'center',
                }}
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Feed preview ── */}
        {step === 2 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '28px 22px 18px' }}>
              <div style={{ ...mono, fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 8 }}>
                YOUR FEED IS READY
              </div>
              <h1 style={{
                ...serif, fontSize: 30, fontWeight: 400, lineHeight: 1.0,
                letterSpacing: -0.8, color: ink, margin: 0,
              }}>
                2 signals unlocked,<br /><em>more to discover.</em>
              </h1>
            </div>

            {/* Signal previews */}
            <div style={{ borderTop: `1px solid ${border}` }}>
              {PREVIEW_SIGNALS.map((s, i) => (
                <div key={s.id} style={{
                  padding: '14px 22px 12px',
                  borderBottom: `0.5px solid ${border}`,
                }}>
                  <div style={{ ...mono, fontSize: 8.5, letterSpacing: 1, color: muted, marginBottom: 4, textTransform: 'uppercase' }}>
                    {s.source} · {s.protocol}
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ ...serif, fontSize: 17, fontWeight: 500, lineHeight: 1.15, letterSpacing: -0.3, color: ink, flex: 1 }}>
                      {s.title}
                    </span>
                    <SeverityChip level={s.severity} />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span style={{
                      ...mono, fontSize: 10, background: SA.terminal,
                      color: SA.terminalGreen, padding: '2px 7px', letterSpacing: 0.5,
                    }}>{s.dataPoint}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ flex: 1 }} />
            <div style={{ padding: '18px 22px 28px' }}>
              <PButton primary onClick={() => setStep(3)} style={{ width: '100%', padding: '11px', fontSize: 13, borderRadius: 14 }}>
                How do I unlock more? →
              </PButton>
            </div>
          </div>
        )}

        {/* ── Step 3: Mechanic explanation ── */}
        {step === 3 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 22px 28px' }}>
            <div style={{ ...mono, fontSize: 9, letterSpacing: 2, color: muted, marginBottom: 16 }}>
              THE MECHANIC
            </div>
            <h1 style={{
              ...serif, fontSize: 30, fontWeight: 400, lineHeight: 1.05,
              letterSpacing: -0.8, color: ink, margin: '0 0 24px',
            }}>
              Cast a signal.<br /><em>Unlock the next.</em>
            </h1>

            {/* Steps */}
            {[
              { n: '1', title: 'See a locked signal', body: 'Signals curated for your network are blurred until unlocked.' },
              { n: '2', title: 'Tap "Cast to unlock"', body: 'We pre-write a cast with the alpha. Edit it if you like.' },
              { n: '3', title: 'Share on Farcaster', body: 'Your cast verifies your contribution — the signal unlocks immediately.' },
            ].map((item) => (
              <div key={item.n} style={{
                display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 14, flexShrink: 0,
                  background: `linear-gradient(135deg, ${SA.aqua}, ${SA.aquaDeep})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: SA.serif, fontSize: 14, fontWeight: 600, color: '#fff',
                }}>{item.n}</div>
                <div>
                  <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: ink, letterSpacing: 0.3, marginBottom: 3 }}>{item.title}</div>
                  <div style={{ ...serif, fontSize: 12.5, lineHeight: 1.45, color: sec }}>{item.body}</div>
                </div>
              </div>
            ))}

            <div style={{ flex: 1 }} />
            <PButton primary onClick={handleFinish} style={{ width: '100%', padding: '11px', fontSize: 13, borderRadius: 14 }}>
              Open my feed →
            </PButton>
          </div>
        )}
      </div>
    </div>
  );
}
