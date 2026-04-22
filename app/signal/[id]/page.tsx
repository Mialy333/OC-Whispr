'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import {
  SA, FRAME_W, NavBar, SeverityChip, AreaChart, PButton,
  seededChart,
} from '@/components/ui';
import type { AlphaSignal } from '@/types';

const mono = { fontFamily: SA.mono } as const;
const serif = { fontFamily: SA.serif } as const;

const DISCUSSION = [
  { initial: 'A', color: SA.aqua,    handle: '@alphadog.eth',  time: '07m ago', text: 'Called this one early. The data pattern is unmistakable.' },
  { initial: 'R', color: SA.rust,    handle: '@rwa.maxi',      time: '11m ago', text: 'Still verifying on-chain. Concentration risk in top wallets worth watching.' },
  { initial: 'M', color: SA.phosphor,handle: '@milady.whispr', time: '18m ago', text: 'fwiw: yield curve + peg stability = real. not a vibes trade.' },
];

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark');
  }, []);
  return dark;
}

export default function SignalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = usePrivy();
  const dark = useDark();
  const [signal, setSignal] = useState<AlphaSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [castState, setCastState] = useState<'idle' | 'loading' | 'done'>('idle');

  const fid = (user?.farcaster?.fid as number | undefined) ?? 0;
  const signalId = params.id;

  // Try to find the signal by loading the feed and searching by id
  useEffect(() => {
    if (!signalId) return;
    fetch(`/api/feed?fid=${fid}`)
      .then((r) => r.json())
      .then((data) => {
        const all: AlphaSignal[] = [...(data.free ?? []), ...(data.locked ?? [])];
        const found = all.find((s) => s.id === signalId);
        setSignal(found ?? null);
      })
      .catch(() => setSignal(null))
      .finally(() => setLoading(false));
  }, [signalId, fid]);

  const paper = dark ? SA.ink : SA.paper;
  const inkC = dark ? SA.paperDeep : SA.ink;
  const ruleC = dark ? '#332E22' : SA.rule;

  const handleCast = async () => {
    if (!signal) return;
    setCastState('loading');
    try {
      const res = await fetch('/api/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, signalId: signal.id }),
      });
      const data = await res.json();
      if (data.castUrl) {
        window.open(data.castUrl, '_blank', 'noopener,noreferrer');
        setCastState('done');
      }
    } catch {
      setCastState('idle');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1A1814', display: 'flex', justifyContent: 'center' }}>
      <div style={{
        width: FRAME_W, minHeight: '100vh',
        backgroundColor: paper, display: 'flex', flexDirection: 'column',
        fontFamily: SA.serif, color: inkC, position: 'relative',
      }}>
        <NavBar title="Signal" onBack={() => router.push('/')} dark={dark}
          right={signal && <span style={{ ...mono, fontSize: 9, color: SA.ash }}>#{signal.id.slice(-6).toUpperCase()}</span>}
        />

        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ ...mono, fontSize: 10, color: SA.phosphorGlow, letterSpacing: 2, animation: 'pulse 1.2s infinite' }}>
              LOADING SIGNAL…
            </span>
          </div>
        )}

        {!loading && !signal && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
            <div style={{ ...mono, fontSize: 9, letterSpacing: 2, color: SA.ash }}>SIGNAL NOT FOUND</div>
            <p style={{ ...serif, fontSize: 13, color: SA.graphite, textAlign: 'center', lineHeight: 1.5 }}>
              This signal may have expired. Signals refresh every session.
            </p>
            <PButton onClick={() => router.push('/')}>← Back to feed</PButton>
          </div>
        )}

        {!loading && signal && (() => {
          const chart = seededChart(signal.id);
          const ts = new Date(signal.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

          return (
            <>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* Editorial headline */}
                <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${dark ? '#332E22' : SA.ink}` }}>
                  <div style={{ ...mono, fontSize: 9, letterSpacing: 2, color: SA.ash, textTransform: 'uppercase' }}>
                    {signal.source} · {signal.protocolName} · {ts}
                  </div>
                  <h1 style={{ ...serif, fontSize: 26, fontWeight: 500, lineHeight: 1.04, letterSpacing: -0.8, margin: '6px 0 8px', color: inkC }}>
                    {signal.title}
                  </h1>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <SeverityChip level={signal.severity} />
                    <span style={{ ...mono, fontSize: 9, color: SA.ash, letterSpacing: 0.6 }}>{signal.source}</span>
                  </div>
                </div>

                {/* Pull-quote data */}
                <div style={{ padding: '14px 18px', background: dark ? '#1A1814' : SA.platinumHi, borderBottom: `0.5px solid ${ruleC}` }}>
                  <div style={{ ...mono, fontSize: 9, letterSpacing: 2, color: SA.ash, marginBottom: 4 }}>DATAPOINT</div>
                  <div style={{ ...serif, fontSize: 24, fontWeight: 500, color: SA.phosphor, letterSpacing: -0.5 }}>
                    {signal.dataPoint}
                  </div>
                </div>

                {/* Chart */}
                <div style={{ padding: '14px 18px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 9, letterSpacing: 1.2, color: SA.ash, marginBottom: 6 }}>
                    <span>TVL · 24H</span><span>LIVE RANGE</span>
                  </div>
                  <div style={{ background: dark ? '#0F1B10' : '#F8F4E8', border: `1px solid ${ruleC}`, padding: 6 }}>
                    <AreaChart data={chart} w={FRAME_W - 48} h={110} color={dark ? SA.phosphorGlow : SA.phosphor} />
                  </div>
                </div>

                {/* Lead paragraph with drop cap */}
                <div style={{ padding: '4px 18px 14px', overflow: 'hidden' }}>
                  <p style={{ ...serif, fontSize: 13, lineHeight: 1.45, color: dark ? '#C8BC9E' : SA.graphite, margin: 0 }}>
                    <span style={{ float: 'left', ...serif, fontSize: 36, lineHeight: 0.8, fontWeight: 500, marginRight: 6, marginTop: 4, color: inkC }}>
                      {signal.summary.charAt(0)}
                    </span>
                    {signal.summary.slice(1)}&nbsp;
                    Analysts on the network are split — some see this as a durable migration, others call it a one-off quarter-end rebalance.
                  </p>
                </div>

                {/* Network discussion */}
                <div style={{ padding: '0 18px 14px' }}>
                  <div style={{ ...mono, fontSize: 9, letterSpacing: 2, color: SA.ash, borderBottom: `0.5px solid ${ruleC}`, paddingBottom: 4, marginBottom: 0 }}>
                    ♟ NETWORK DISCUSSION · 28 CASTS
                  </div>
                  {DISCUSSION.map((c, i) => (
                    <div key={i} style={{
                      padding: '10px 0',
                      borderBottom: i < DISCUSSION.length - 1 ? `0.5px solid ${ruleC}` : 'none',
                      display: 'flex', gap: 10,
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 13, flexShrink: 0,
                        background: `linear-gradient(135deg, ${c.color}, ${SA.platinumLo})`,
                        border: `1px solid ${SA.ink}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        ...serif, fontSize: 12, fontWeight: 600, color: SA.paper,
                      }}>{c.initial}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                          <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: inkC, letterSpacing: 0.3 }}>{c.handle}</span>
                          <span style={{ ...mono, fontSize: 9, color: SA.ash }}>{c.time}</span>
                        </div>
                        <p style={{ margin: '2px 0 0', ...serif, fontSize: 11.5, lineHeight: 1.4, color: dark ? '#C8BC9E' : SA.graphite }}>{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action bar */}
              <div style={{
                flexShrink: 0, padding: '10px 14px',
                background: dark ? '#1F1B15' : `linear-gradient(180deg, ${SA.platinumHi} 0%, ${SA.platinum} 100%)`,
                borderTop: `1px solid ${dark ? '#332E22' : SA.platinumLo}`,
                display: 'flex', gap: 8, alignItems: 'center',
              }}>
                <PButton small>♡ Save</PButton>
                <PButton small>↑ Share</PButton>
                <div style={{ flex: 1 }} />
                <PButton primary small onClick={handleCast} disabled={castState === 'loading'}>
                  {castState === 'done' ? 'Cast sent ✓' : castState === 'loading' ? '■ ■ ■' : 'Cast this signal →'}
                </PButton>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
