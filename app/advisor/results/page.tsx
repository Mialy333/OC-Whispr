'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SA, PButton, NavBar } from '@/components/ui';
import type { AdvisorResponse, YieldAdvice } from '@/types/advisor';

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

const RISK_COLOR: Record<YieldAdvice['riskLevel'], string> = {
  low:    SA.phosphorGlow,
  medium: SA.amber,
  high:   SA.rust,
};

export default function AdvisorResultsPage() {
  const router = useRouter();
  const dark = useDark();
  const [result, setResult] = useState<AdvisorResponse | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('advisorResult');
    if (!raw) { router.replace('/advisor'); return; }
    try { setResult(JSON.parse(raw)); } catch { router.replace('/advisor'); }
  }, [router]);

  if (!result) return null;

  const ink    = dark ? '#F5F0E8' : SA.ink;
  const sec    = dark ? '#C8C2B4' : SA.graphite;
  const muted  = dark ? '#8C8479' : SA.ash;
  const border = dark ? '#332E22' : SA.rule;
  const cardBg = dark ? '#1F1B15' : '#FDFAF5';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://farhack2026.vercel.app';
  const top = result.advice[0];

  const handleShare = () => {
    const text = `Just got my yield strategy from @alphawhispr\n${top.protocol} — ${top.estimatedApy} APY\nGet yours: ${appUrl}/advisor`;
    window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`, '_blank');
  };

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
        <NavBar title="Your Yield Strategy" onBack={() => router.push('/advisor')} dark={dark} />

        {/* Meta */}
        <div style={{ padding: '16px 22px 4px', ...mono, fontSize: 9, color: muted, letterSpacing: 1.5 }}>
          {new Date(result.generatedAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          }).toUpperCase()} · 3 STRATEGIES
        </div>

        {/* Cards */}
        <div style={{ padding: '10px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {result.advice.map((advice, i) => (
            <div key={i} style={{
              background: cardBg,
              border: `1px solid ${border}`,
              borderRadius: 14,
              padding: '16px 18px',
            }}>
              {/* Protocol + badges */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <h2 style={{ ...serif, fontSize: 20, fontWeight: 700, color: ink, margin: 0, lineHeight: 1.1, letterSpacing: -0.4 }}>
                  {advice.protocol}
                </h2>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center', paddingTop: 2 }}>
                  <span style={{
                    ...mono, fontSize: 11, fontWeight: 700,
                    color: SA.phosphorGlow,
                    border: `1px solid ${SA.phosphorGlow}`,
                    padding: '2px 7px', borderRadius: 4, letterSpacing: 0.3,
                  }}>
                    {advice.estimatedApy}
                  </span>
                  <span style={{
                    ...mono, fontSize: 9, fontWeight: 700,
                    color: RISK_COLOR[advice.riskLevel],
                    border: `1px solid ${RISK_COLOR[advice.riskLevel]}`,
                    padding: '2px 6px', borderRadius: 4,
                    letterSpacing: 0.8, textTransform: 'uppercase',
                  }}>
                    {advice.riskLevel}
                  </span>
                </div>
              </div>

              {/* Strategy */}
              <div style={{ ...mono, fontSize: 11, color: sec, letterSpacing: 0.2, lineHeight: 1.45, marginBottom: 8 }}>
                {advice.strategy}
              </div>

              {/* Rationale */}
              <div style={{ ...serif, fontSize: 13, color: sec, lineHeight: 1.55, marginBottom: 12 }}>
                {advice.rationale}
              </div>

              {/* Action step */}
              <div style={{
                borderTop: `0.5px solid ${border}`,
                paddingTop: 10,
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <span style={{ ...mono, fontSize: 9, fontWeight: 700, color: SA.aqua, letterSpacing: 1, flexShrink: 0, marginTop: 2 }}>
                  NEXT
                </span>
                <span style={{ ...mono, fontSize: 11, color: ink, lineHeight: 1.45 }}>
                  {advice.actionStep}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ padding: '18px 16px 36px', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
          <PButton primary onClick={handleShare}
            style={{ width: '100%', padding: '11px', fontSize: 13, borderRadius: 14 }}>
            Share on Farcaster →
          </PButton>
          <PButton onClick={() => router.push('/advisor')}
            style={{ width: '100%', padding: '11px', fontSize: 13, borderRadius: 14 }}>
            Refine my profile
          </PButton>
        </div>
      </div>
    </div>
  );
}
