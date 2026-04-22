'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import SignalCard from '@/components/SignalCard';
import {
  SA, FRAME_W,
  TitleBar, StatusBar, Ticker, TabBar, NavBar,
  PButton, RainbowStripes, Sparkline, SeverityChip,
  AreaChart, AccuracyBar, Toggle, Segmented,
  seededChart, UnlockingSplash,
} from '@/components/ui';
import type { AlphaSignal } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeedResponse { free: AlphaSignal[]; locked: AlphaSignal[]; total: number; }
type FilterKey = 'ALL' | 'HIGH' | 'BOOSTED';
type ViewKey   = 'feed' | 'detail' | 'leaderboard' | 'settings';

// ─── Mock leaderboard data ───────────────────────────────────────────────────

const LEADERS = [
  { rank: 1, handle: '@alphadog.eth',  fid: 2461,  casts: 412, accuracy: 78, followers: '41.2k', streak: 12 },
  { rank: 2, handle: '@dwr.eth',       fid: 3,     casts: 389, accuracy: 74, followers: '512k',  streak: 8  },
  { rank: 3, handle: '@milady.whispr', fid: 9712,  casts: 301, accuracy: 71, followers: '18.7k', streak: 22 },
  { rank: 4, handle: '@degen.signals', fid: 1882,  casts: 267, accuracy: 69, followers: '9.4k',  streak: 4  },
  { rank: 5, handle: '@rwa.maxi',      fid: 4420,  casts: 244, accuracy: 68, followers: '22.1k', streak: 15 },
  { rank: 6, handle: '@onchain.haiku', fid: 15123, casts: 198, accuracy: 66, followers: '6.8k',  streak: 2  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark');
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  };
  return [dark, toggle] as const;
}

// ─── Screens ─────────────────────────────────────────────────────────────────

function Onboarding({ onConnect }: { onConnect: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Hero: CRT tableau */}
      <div style={{
        margin: '0 18px', height: 220, flexShrink: 0,
        background: '#1B1610', position: 'relative',
        border: `1px solid ${SA.ink}`, overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 3px)` }} />
        {/* CRT monitor */}
        <div style={{
          position: 'absolute', left: '50%', top: 28, transform: 'translateX(-50%)',
          width: 180, height: 140, background: '#D8CFB8',
          border: `1px solid ${SA.ink}`, borderRadius: 6, padding: 10,
          boxShadow: `inset 0 1px 0 #F5EFE2, 0 8px 16px rgba(0,0,0,0.5)`,
        }}>
          <div style={{
            width: '100%', height: '100%',
            background: `radial-gradient(ellipse at center, #0F2A10 0%, #061006 100%)`,
            borderRadius: 4, position: 'relative', overflow: 'hidden',
            border: `1px solid #2B2418`,
          }}>
            <div style={{
              position: 'absolute', inset: 6, color: SA.terminalGreen,
              fontFamily: SA.mono, fontSize: 7.5, lineHeight: 1.35, letterSpacing: 0.3,
            }}>
              <div>STREAM ALPHA v1.0</div>
              <div>────────────────────</div>
              <div>&gt; SCAN_DEFI.RUN</div>
              <div style={{ color: '#C8E8A8' }}>▲ ONDO  +18%</div>
              <div style={{ color: '#C8E8A8' }}>▲ AERO  +64%</div>
              <div style={{ color: '#E8A858' }}>▼ LDO   −12%</div>
              <div style={{ color: '#E8A858' }}>■ ENA   peg</div>
              <div>&gt; READY_<span style={{ animation: 'sa-blink 1s infinite' }}>█</span></div>
            </div>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%)' }} />
          </div>
          <div style={{ marginTop: 4 }}><RainbowStripes h={4} w={14} /></div>
        </div>
        {/* Side props */}
        <div style={{ position: 'absolute', left: 14, bottom: 20, width: 34, height: 40, background: '#3A2E1E', border: `1px solid ${SA.ink}` }}>
          <div style={{ position: 'absolute', top: 4, left: 4, right: 4, fontFamily: SA.mono, fontSize: 6, color: '#D8CFB8', letterSpacing: 0.5 }}>DEFI<br />VOL I</div>
        </div>
        <div style={{ position: 'absolute', left: 52, bottom: 20, width: 28, height: 34, background: '#5A3A28', border: `1px solid ${SA.ink}` }}>
          <div style={{ position: 'absolute', top: 3, left: 3, right: 3, fontFamily: SA.mono, fontSize: 6, color: '#F5EFE2', letterSpacing: 0.5 }}>RWA<br />1994</div>
        </div>
        <div style={{ position: 'absolute', right: 18, bottom: 16, fontFamily: SA.mono, fontSize: 7, color: '#8A7A5A', letterSpacing: 1 }}>
          FIG. 1 — THE TERMINAL, AT HOME.
        </div>
      </div>

      {/* Headline */}
      <div style={{ padding: '22px 22px 0' }}>
        <h1 style={{
          fontFamily: SA.serif, fontSize: 34, fontWeight: 400, lineHeight: 0.98,
          margin: 0, letterSpacing: -0.8, color: 'var(--text-primary)', textAlign: 'center',
        }}>
          Why every trader<br />
          <em>should stream</em> alpha.
        </h1>
      </div>

      {/* Body copy: two-column editorial */}
      <div style={{
        padding: '14px 22px 0',
        columnCount: 2, columnGap: 14,
        columnRule: `0.5px solid ${SA.rule}`,
        fontFamily: SA.serif, fontSize: 11.5, lineHeight: 1.38, color: 'var(--text-secondary)',
        flex: 1,
      }}>
        <p style={{ margin: 0, textIndent: 12 }}>
          Today, there are more onchain signals per minute than any human can read in a day.
          Unfortunately, the ones that actually matter are buried beneath ten thousand that don&apos;t.
        </p>
        <p style={{ margin: '8px 0 0', textIndent: 12 }}>
          Stream Alpha reads DeFiLlama, CoinGecko and Token Terminal continuously, ranks anomalies,
          then curates what <em>your</em> network is already talking about.
        </p>
        <p style={{ margin: '8px 0 0', textIndent: 12 }}>
          Cast a signal — unlock the next. The feed pays itself forward.
        </p>
      </div>

      {/* CTA */}
      <div style={{
        padding: '14px 22px 18px', flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <PButton primary onClick={onConnect} style={{ width: '100%', padding: '9px', fontSize: 12, borderRadius: 14 }}>
          Connect with Farcaster →
        </PButton>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: SA.mono, fontSize: 9, color: SA.ash, letterSpacing: 0.6 }}>
          <RainbowStripes h={8} w={16} />
          <span>STREAM ALPHA™ · EST. 2026 · v1.0</span>
        </div>
      </div>
    </div>
  );
}

function FeedScreen({
  signals, loading, error, dark, onToggleDark,
  onOpenSignal, onNavigate, fid,
}: {
  signals: FeedResponse | null;
  loading: boolean;
  error: string;
  dark: boolean;
  onToggleDark: () => void;
  onOpenSignal: (s: AlphaSignal) => void;
  onNavigate: (tab: 'feed' | 'leaderboard' | 'alerts' | 'settings') => void;
  fid: number;
}) {
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const paper = dark ? SA.ink : SA.paper;
  const inkC = dark ? SA.paperDeep : SA.ink;

  const allSignals = signals ? [...(signals.free ?? []), ...(signals.locked ?? [])] : [];
  const lockedIds = new Set((signals?.locked ?? []).map((s) => s.id));

  const filtered = allSignals.filter((s) => {
    if (filter === 'ALL') return true;
    if (filter === 'HIGH') return s.severity === 'high';
    if (filter === 'BOOSTED') return s.boosted;
    return true;
  });

  const tickerTexts = [
    'LIVE SIGNALS · AI-CURATED · UPDATED CONTINUOUSLY',
    'CAST A SIGNAL → UNLOCK THE NEXT',
    'DEFILLAMA · COINGECKO · TOKEN TERMINAL',
    'POWERED BY STREAM ALPHA v1.0',
  ];

  return (
    <>
      {/* Platinum title bar */}
      <TitleBar
        dark={dark}
        title={
          <span style={{ fontFamily: SA.serif, fontSize: 13, fontStyle: 'italic', letterSpacing: -0.2 }}>
            Stream Alpha <span style={{ fontStyle: 'normal', color: SA.ash, fontSize: 10 }}>· feed</span>
          </span>
        }
        right={<span style={{ color: SA.phosphorGlow }}>● LIVE</span>}
        lights
      />

      {/* Editorial masthead */}
      <div className="sa-masthead" style={{
        padding: '12px 18px 10px',
        borderBottom: `1px solid ${dark ? '#332E22' : SA.ink}`,
        background: dark ? '#1F1B15' : 'var(--bg-main)',
      }}>
        <div>
          <div style={{ fontFamily: SA.mono, fontSize: 9, letterSpacing: 2, color: dark ? SA.ash : SA.graphite }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}
          </div>
          <div style={{ fontFamily: SA.serif, fontSize: 18, fontWeight: 500, color: inkC, letterSpacing: -0.3 }}>
            The Morning Whispr.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <button onClick={onToggleDark} title="Toggle theme" style={{
            width: 22, height: 22, borderRadius: 11,
            border: `1px solid rgba(26,24,20,0.2)`, cursor: 'pointer',
            background: dark ? SA.ink : 'var(--bg-main)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: dark ? SA.paperDeep : SA.ink,
          }}>{dark ? '☾' : '☀'}</button>
          <RainbowStripes h={12} w={22} />
        </div>
      </div>

      {/* Filter row */}
      <div style={{
        padding: '8px 18px', display: 'flex', gap: 6, alignItems: 'center',
        borderBottom: `0.5px solid ${dark ? '#332E22' : SA.rule}`,
        background: dark ? '#16130E' : '#F2ECDF',
      }}>
        {(['ALL', 'HIGH', 'BOOSTED'] as FilterKey[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            border: `1px solid ${filter === f ? inkC : SA.rule}`,
            background: filter === f ? inkC : 'transparent',
            color: filter === f ? (dark ? SA.ink : SA.paper) : (dark ? SA.paperDeep : SA.graphite),
            fontFamily: SA.mono, fontSize: 9, fontWeight: 600, letterSpacing: 1,
            padding: '2px 8px', borderRadius: 0, cursor: 'pointer', textTransform: 'uppercase',
          }}>{f}</button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: SA.mono, fontSize: 9, color: SA.ash, letterSpacing: 0.6 }}>
          {filtered.length} signals
        </span>
      </div>

      {/* Signals list */}
      <div style={{ flex: 1, overflowY: 'auto', background: paper }}>
        {loading && (
          <div style={{ padding: '32px 18px', textAlign: 'center' }}>
            <span style={{ fontFamily: SA.mono, fontSize: 10, color: SA.phosphorGlow, letterSpacing: 2, animation: 'pulse 1.2s infinite' }}>
              SCANNING PROTOCOLS…
            </span>
          </div>
        )}
        {error && (
          <div style={{ margin: 18, border: `1px solid ${SA.rust}`, padding: '10px 14px' }}>
            <span style={{ fontFamily: SA.mono, fontSize: 10, color: SA.rust }}>ERR: {error}</span>
          </div>
        )}
        {filtered.map((s) => (
          <SignalCard
            key={s.id}
            signal={s}
            locked={lockedIds.has(s.id)}
            fid={fid}
            dark={dark}
            onOpen={onOpenSignal}
          />
        ))}
        {!loading && filtered.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '32px 18px' }}>
            <div style={{ fontFamily: SA.mono, fontSize: 9, letterSpacing: 2, color: SA.ash }}>
              NO SIGNALS MATCH THIS FILTER
            </div>
          </div>
        )}
        <div style={{ textAlign: 'center', padding: '16px 0 22px', fontFamily: SA.mono, fontSize: 9, letterSpacing: 2, color: SA.ash }}>
          — END OF MORNING EDITION —
        </div>
      </div>

      <Ticker items={tickerTexts} />
      <TabBar active="feed" onNavigate={onNavigate} dark={dark} />
    </>
  );
}

function SignalDetailScreen({
  signal, onBack, dark,
}: {
  signal: AlphaSignal;
  onBack: () => void;
  dark: boolean;
}) {
  const paper = dark ? SA.ink : SA.paper;
  const inkC = dark ? SA.paperDeep : SA.ink;
  const chart = seededChart(signal.id);
  const ts = new Date(signal.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const discussion = [
    { handle: '@alphadog.eth',  initial: 'A', color: SA.aqua,    time: '07m ago', text: 'Called this one early. The data pattern is unmistakable — watch for follow-through in the next session.' },
    { handle: '@rwa.maxi',      initial: 'R', color: SA.rust,    time: '11m ago', text: 'Still verifying on-chain. Concentration risk in top wallets is worth monitoring closely.' },
    { handle: '@milady.whispr', initial: 'M', color: SA.phosphor, time: '18m ago', text: 'fwiw: yield curve + peg stability = real. not a vibes trade.' },
  ];

  return (
    <>
      <NavBar
        title="Signal"
        onBack={onBack}
        right={<span style={{ fontFamily: SA.mono, fontSize: 9, color: SA.ash }}>#{signal.id.toUpperCase().slice(-6)}</span>}
        dark={dark}
      />

      <div style={{ flex: 1, overflowY: 'auto', background: paper }}>
        {/* Editorial headline */}
        <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${dark ? '#332E22' : SA.ink}` }}>
          <div style={{ fontFamily: SA.mono, fontSize: 9, letterSpacing: 2, color: SA.ash, textTransform: 'uppercase' }}>
            {signal.source} · {signal.protocolName} · {ts}
          </div>
          <h1 style={{
            fontFamily: SA.serif, fontSize: 26, fontWeight: 500, lineHeight: 1.04,
            letterSpacing: -0.8, margin: '6px 0 8px', color: inkC,
          }}>
            {signal.title}
          </h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <SeverityChip level={signal.severity} />
            <span style={{ fontFamily: SA.mono, fontSize: 9, color: SA.ash, letterSpacing: 0.6 }}>
              {signal.source}
            </span>
          </div>
        </div>

        {/* Pull-quote data block */}
        <div style={{
          padding: '14px 18px',
          background: dark ? '#1A1814' : 'var(--bg-main)',
          borderBottom: `0.5px solid ${dark ? '#332E22' : SA.rule}`,
        }}>
          <div style={{ fontFamily: SA.mono, fontSize: 9, letterSpacing: 2, color: SA.ash, marginBottom: 4 }}>DATAPOINT</div>
          <div style={{
            fontFamily: SA.serif, fontSize: 24, fontWeight: 500, color: SA.phosphor,
            letterSpacing: -0.5, fontFeatureSettings: '"tnum"',
          }}>
            {signal.dataPoint}
          </div>
        </div>

        {/* Chart */}
        <div style={{ padding: '14px 18px 10px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: SA.mono, fontSize: 9, letterSpacing: 1.2, color: SA.ash, marginBottom: 6,
          }}>
            <span>TVL · 24H</span>
            <span>LIVE RANGE</span>
          </div>
          <div style={{
            background: dark ? '#0F1B10' : 'var(--bg-main)',
            border: `1px solid ${dark ? '#26291B' : SA.rule}`,
            padding: 6,
          }}>
            <AreaChart
              data={chart}
              w={FRAME_W - 48}
              h={110}
              color={dark ? SA.phosphorGlow : SA.phosphor}
            />
          </div>
        </div>

        {/* Lead paragraph with drop cap */}
        <div style={{ padding: '4px 18px 14px' }}>
          <p style={{
            margin: 0, fontFamily: SA.serif, fontSize: 13, lineHeight: 1.45,
            color: dark ? '#C8BC9E' : SA.graphite, overflow: 'hidden',
          }}>
            <span style={{
              float: 'left', fontFamily: SA.serif, fontSize: 36, lineHeight: 0.8,
              fontWeight: 500, marginRight: 6, marginTop: 4, color: inkC,
            }}>{signal.summary.charAt(0)}</span>
            {signal.summary.slice(1)}&nbsp;
            Analysts on the network are split — some see this as a durable migration, others call it a one-off quarter-end rebalance.
          </p>
        </div>

        {/* Network discussion */}
        <div style={{ padding: '0 18px 14px' }}>
          <div style={{
            fontFamily: SA.mono, fontSize: 9, letterSpacing: 2, color: SA.ash, marginBottom: 6,
            borderBottom: `0.5px solid ${dark ? '#332E22' : SA.rule}`, paddingBottom: 4,
          }}>
            ♟ NETWORK DISCUSSION · 28 CASTS
          </div>
          {discussion.map((c, i) => (
            <div key={i} style={{
              padding: '10px 0',
              borderBottom: i < discussion.length - 1 ? `0.5px solid ${dark ? '#332E22' : SA.rule}` : 'none',
              display: 'flex', gap: 10,
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 13, flexShrink: 0,
                background: c.color,
                border: `1px solid ${SA.ink}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: SA.serif, fontSize: 12, fontWeight: 600, color: SA.paper,
              }}>{c.initial}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                  <span style={{ fontFamily: SA.mono, fontSize: 10, fontWeight: 700, color: inkC, letterSpacing: 0.3 }}>{c.handle}</span>
                  <span style={{ fontFamily: SA.mono, fontSize: 9, color: SA.ash }}>{c.time}</span>
                </div>
                <p style={{ margin: '2px 0 0', fontFamily: SA.serif, fontSize: 11.5, lineHeight: 1.4, color: dark ? '#C8BC9E' : SA.graphite }}>
                  {c.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div style={{
        flexShrink: 0, padding: '10px 14px',
        background: dark ? '#1F1B15' : 'var(--bg-main)',
        borderTop: `1px solid ${dark ? '#332E22' : 'rgba(26,24,20,0.12)'}`,
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <PButton small>♡ Save</PButton>
        <PButton small>↑ Share</PButton>
        <div style={{ flex: 1 }} />
        <PButton primary small>Cast this signal →</PButton>
      </div>
    </>
  );
}

function LeaderboardScreen({ onBack, dark }: { onBack: () => void; dark: boolean }) {
  const [scope, setScope] = useState('7D');
  const paper = dark ? SA.ink : SA.paper;
  const inkC = dark ? SA.paperDeep : SA.ink;
  const [first, second, third] = LEADERS;

  const podiumCol = (l: typeof LEADERS[0], h: number, medal: 'gold' | 'silver' | 'bronze') => (
    <div key={l.rank} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        fontFamily: SA.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1,
        color: medal === 'gold' ? SA.amber : medal === 'silver' ? SA.ash : SA.rust,
      }}>
        {medal === 'gold' ? 'I' : medal === 'silver' ? 'II' : 'III'}
      </div>
      <div style={{
        width: 40, height: 40, borderRadius: 20,
        background: medal === 'gold'
          ? `linear-gradient(135deg, #F5D047, ${SA.amber})`
          : medal === 'silver'
          ? 'var(--bg-main)'
          : `linear-gradient(135deg, #D89070, ${SA.rust})`,
        border: `1px solid ${SA.ink}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: SA.serif, fontWeight: 600, fontSize: 18, color: SA.paper,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.5)`,
      }}>
        {l.handle.charAt(1).toUpperCase()}
      </div>
      <div style={{ fontFamily: SA.mono, fontSize: 9.5, color: inkC, letterSpacing: 0.3, fontWeight: 700, textAlign: 'center' }}>
        {l.handle}
      </div>
      <div style={{
        width: '80%',
        background: dark ? '#1A1814' : 'var(--bg-main)',
        border: `1px solid rgba(26,24,20,0.12)`,
        height: h,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: SA.serif, fontSize: 14, fontWeight: 500, color: dark ? SA.paperDeep : SA.graphite,
      }}>{l.accuracy}%</div>
    </div>
  );

  return (
    <>
      <NavBar
        title="Top Casters"
        onBack={onBack}
        dark={dark}
        right={
          <div style={{ display: 'flex', gap: 1, border: `1px solid rgba(26,24,20,0.12)`, borderRadius: 10, overflow: 'hidden' }}>
            {['24H', '7D', 'ALL'].map((s) => (
              <button key={s} onClick={() => setScope(s)} style={{
                background: scope === s ? SA.aqua : 'var(--bg-main)',
                color: scope === s ? '#fff' : SA.ink,
                border: 'none', padding: '3px 8px', fontSize: 10,
                fontFamily: SA.sans, fontWeight: 600, cursor: 'pointer',
              }}>{s}</button>
            ))}
          </div>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', background: paper }}>
        {/* Masthead */}
        <div style={{
          padding: '14px 18px 8px',
          borderBottom: `1px solid ${dark ? '#332E22' : SA.ink}`,
          background: dark ? '#1A1814' : SA.paper,
        }}>
          <div style={{ fontFamily: SA.mono, fontSize: 9, letterSpacing: 2.2, color: SA.ash }}>VOLUME XII · ISSUE 04</div>
          <h1 style={{
            fontFamily: SA.serif, fontSize: 28, fontWeight: 400, lineHeight: 0.98,
            margin: '4px 0 6px', letterSpacing: -0.6, color: inkC,
          }}>
            The Caster <em>Ranking</em>.
          </h1>
          <p style={{
            margin: 0, fontFamily: SA.serif, fontSize: 11, lineHeight: 1.4,
            color: dark ? SA.ash : SA.graphite, fontStyle: 'italic',
          }}>
            Ranked by cumulative accuracy, weighted by signal severity,
            across the last {scope === '24H' ? 'twenty-four hours' : scope === '7D' ? 'seven days' : 'calendar year'}.
          </p>
        </div>

        {/* Podium */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', padding: '12px 14px 0' }}>
          {podiumCol(second, 38, 'silver')}
          {podiumCol(first, 54, 'gold')}
          {podiumCol(third, 28, 'bronze')}
        </div>

        {/* Full table */}
        <div style={{ padding: '18px 0 8px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '28px 1fr 80px 46px',
            gap: 8, padding: '4px 18px 6px',
            fontFamily: SA.mono, fontSize: 8.5, letterSpacing: 1.5, color: SA.ash,
            borderBottom: `0.5px solid ${dark ? '#332E22' : SA.rule}`,
            textTransform: 'uppercase',
          }}>
            <span>#</span><span>Caster</span><span>Accuracy</span><span style={{ textAlign: 'right' }}>Streak</span>
          </div>
          {LEADERS.map((l) => (
            <div key={l.rank} style={{
              display: 'grid', gridTemplateColumns: '28px 1fr 80px 46px',
              gap: 8, padding: '10px 18px', alignItems: 'center',
              borderBottom: `0.5px solid ${dark ? '#332E22' : SA.rule}`,
              background: l.rank === 1
                ? (dark ? 'rgba(245,208,71,0.06)' : 'rgba(245,208,71,0.08)')
                : 'transparent',
            }}>
              <span style={{
                fontFamily: SA.serif, fontSize: 20, fontWeight: 400,
                color: l.rank === 1 ? SA.amber : inkC, fontFeatureSettings: '"lnum"',
              }}>
                {String(l.rank).padStart(2, '0')}
              </span>
              <div>
                <div style={{ fontFamily: SA.mono, fontSize: 11, fontWeight: 700, color: inkC, letterSpacing: 0.2 }}>{l.handle}</div>
                <div style={{ fontFamily: SA.mono, fontSize: 8.5, color: SA.ash, letterSpacing: 0.8, marginTop: 1 }}>
                  FID {l.fid} · {l.casts} casts · {l.followers}
                </div>
              </div>
              <AccuracyBar value={l.accuracy} />
              <span style={{
                textAlign: 'right', fontFamily: SA.mono, fontSize: 11,
                color: l.streak >= 10 ? SA.phosphor : (dark ? SA.paperDeep : SA.graphite),
                fontWeight: 700, letterSpacing: 0.3,
              }}>▲{l.streak}</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', padding: '12px 0 16px', fontFamily: SA.mono, fontSize: 9, letterSpacing: 2, color: SA.ash }}>
          — FIN —
        </div>
      </div>
    </>
  );
}

function SettingsScreen({
  onBack, dark, onToggleDark, onLogout, user,
}: {
  onBack: () => void;
  dark: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
  user: { handle?: string; fid?: number; wallet?: string } | null;
}) {
  const [notif, setNotif] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const [sev, setSev] = useState('MEDIUM');
  const [freq, setFreq] = useState(60);
  const [boosted, setBoosted] = useState(true);
  const [font, setFont] = useState('Serif');

  const paper = dark ? SA.ink : SA.paper;
  const inkC = dark ? SA.paperDeep : SA.ink;
  const panel = dark ? '#1A1814' : 'var(--bg-main)';
  const panelBorder = dark ? '#332E22' : 'rgba(26,24,20,0.12)';

  const handle = user?.handle ?? '@you.eth';
  const fid = user?.fid ?? 0;
  const wallet = user?.wallet ? `${user.wallet.slice(0, 6)}…${user.wallet.slice(-4)}` : '—';

  function PrefRow({ label, right, last }: { label: string; right: React.ReactNode; last?: boolean }) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
        borderBottom: last ? 'none' : `0.5px solid ${panelBorder}`,
        fontFamily: SA.serif, fontSize: 13, color: inkC, minHeight: 30,
      }}>
        <span style={{ flex: 1 }}>{label}</span>
        {right}
      </div>
    );
  }

  function SecHeader({ children }: { children: string }) {
    return (
      <div style={{
        padding: '12px 14px 4px',
        fontFamily: SA.mono, fontSize: 9, fontWeight: 700, letterSpacing: 2,
        color: dark ? SA.ash : SA.graphite, textTransform: 'uppercase',
      }}>{children}</div>
    );
  }

  return (
    <>
      <NavBar
        title="Preferences"
        onBack={onBack}
        dark={dark}
        right={<RainbowStripes h={10} w={18} />}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 18px', background: paper }}>
        {/* Identity card */}
        <div style={{
          background: panel, border: `1px solid ${panelBorder}`,
          padding: 12, display: 'flex', gap: 12, alignItems: 'center', marginTop: 4,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 22,
            background: `linear-gradient(135deg, ${SA.aqua}, ${SA.aquaDeep})`,
            border: `1px solid ${SA.ink}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: SA.serif, fontSize: 18, fontWeight: 600,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,.4)`,
          }}>
            {handle.charAt(1).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: SA.serif, fontSize: 16, fontWeight: 500, color: inkC, letterSpacing: -0.2 }}>{handle}</div>
            <div style={{ fontFamily: SA.mono, fontSize: 9.5, color: SA.ash, letterSpacing: 0.6 }}>FID {fid} · {wallet}</div>
          </div>
          <PButton small onClick={onLogout}>Sign out</PButton>
        </div>

        <SecHeader>Notifications</SecHeader>
        <div style={{ background: panel, border: `1px solid ${panelBorder}` }}>
          <PrefRow label="Push notifications" right={<Toggle on={notif} onClick={() => setNotif(!notif)} />} />
          <PrefRow label="Minimum severity" right={<Segmented options={['LOW', 'MEDIUM', 'HIGH']} value={sev} onChange={setSev} />} />
          <PrefRow label="Scan frequency" right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="range" min={15} max={240} value={freq} onChange={(e) => setFreq(+e.target.value)}
                style={{ width: 80, accentColor: SA.aqua }} />
              <span style={{ fontFamily: SA.mono, fontSize: 10, color: SA.ash, minWidth: 32 }}>{freq}m</span>
            </div>
          } />
          <PrefRow label="Alert sound" right={<Toggle on={soundOn} onClick={() => setSoundOn(!soundOn)} />} last />
        </div>

        <SecHeader>Curation</SecHeader>
        <div style={{ background: panel, border: `1px solid ${panelBorder}` }}>
          <PrefRow label="Boost network signals" right={<Toggle on={boosted} onClick={() => setBoosted(!boosted)} />} />
          <PrefRow label="Sources" right={<span style={{ fontFamily: SA.mono, fontSize: 10, color: SA.ash }}>3 active ›</span>} />
          <PrefRow label="Follow list" right={<span style={{ fontFamily: SA.mono, fontSize: 10, color: SA.ash }}>follows ›</span>} last />
        </div>

        <SecHeader>Appearance</SecHeader>
        <div style={{ background: panel, border: `1px solid ${panelBorder}` }}>
          <PrefRow label="Dark mode" right={<Toggle on={dark} onClick={onToggleDark} />} />
          <PrefRow label="Typography" right={<Segmented options={['Serif', 'Mono', 'Mix']} value={font} onChange={setFont} />} last />
        </div>

        <SecHeader>About</SecHeader>
        <div style={{ background: panel, border: `1px solid ${panelBorder}`, padding: '12px 14px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <RainbowStripes h={18} w={38} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: SA.serif, fontSize: 15, fontStyle: 'italic', color: inkC, letterSpacing: -0.2 }}>Stream Alpha</div>
              <div style={{ fontFamily: SA.mono, fontSize: 9, color: SA.ash, letterSpacing: 0.8 }}>v1.0.0 · BUILD 260422 · © 2026</div>
            </div>
          </div>
          <p style={{
            margin: '10px 0 0', fontFamily: SA.serif, fontSize: 10.5, lineHeight: 1.4,
            color: dark ? SA.ash : SA.graphite, fontStyle: 'italic',
          }}>
            &ldquo;Signal in, noise out. Think Different about your feed.&rdquo;
          </p>
        </div>
      </div>
    </>
  );
}

// ─── App Shell ───────────────────────────────────────────────────────────────

export default function Home() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const [dark, toggleDark] = useDark();
  const [view, setView]                   = useState<ViewKey>('feed');
  const [selectedSignal, setSelectedSignal] = useState<AlphaSignal | null>(null);
  const [feed, setFeed]                   = useState<FeedResponse | null>(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  const fid    = (user?.farcaster?.fid as number | undefined) ?? 0;
  const handle = user?.farcaster?.username ? `@${user.farcaster.username}` : '@you.eth';
  const wallet = user?.wallet?.address ?? '';

  useEffect(() => {
    if (!authenticated) return;
    setLoading(true);
    setError('');
    fetch(`/api/feed?fid=${fid}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setFeed(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authenticated, fid]);

  const handleNavigate = (tab: 'feed' | 'leaderboard' | 'alerts' | 'settings') => {
    if (tab === 'alerts') return; // not implemented yet
    setView(tab);
  };

  const handleOpenSignal = (s: AlphaSignal) => {
    setSelectedSignal(s);
    setView('detail');
  };

  const handleBack = () => {
    setView('feed');
    setSelectedSignal(null);
  };

  const paper = dark ? SA.ink : SA.paper;

  // Loading state
  if (!ready) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: SA.paper,
      }}>
        <span style={{ fontFamily: SA.mono, fontSize: 11, color: SA.ash, letterSpacing: '0.1em' }}>
          LOADING…
        </span>
      </div>
    );
  }

  return (
    <div className="sa-outer" style={{ backgroundColor: '#1A1814' }}>
      {/* Miniapp frame shell */}
      <div className="sa-frame-shell" style={{
        background: paper,
        position: 'relative',
        fontFamily: SA.serif,
        color: dark ? SA.paperDeep : SA.ink,
      }}>
        <StatusBar dark={dark} />

        {!authenticated ? (
          <Onboarding onConnect={login} />
        ) : view === 'detail' && selectedSignal ? (
          <SignalDetailScreen signal={selectedSignal} onBack={handleBack} dark={dark} />
        ) : view === 'leaderboard' ? (
          <LeaderboardScreen onBack={handleBack} dark={dark} />
        ) : view === 'settings' ? (
          <SettingsScreen
            onBack={handleBack}
            dark={dark}
            onToggleDark={toggleDark}
            onLogout={logout}
            user={{ handle, fid, wallet }}
          />
        ) : (
          <FeedScreen
            signals={feed}
            loading={loading}
            error={error}
            dark={dark}
            onToggleDark={toggleDark}
            onOpenSignal={handleOpenSignal}
            onNavigate={handleNavigate}
            fid={fid}
          />
        )}
      </div>
    </div>
  );
}
