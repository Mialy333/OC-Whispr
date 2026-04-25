'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import sdk from '@farcaster/miniapp-sdk';
import SignalCard from '@/components/SignalCard';
import SignalDetail from '@/components/SignalDetail';
import AdvisorFlow from '@/components/AdvisorFlow';
import ProfileView from '@/components/ProfileView';
import TerminalAnimation from '@/components/TerminalAnimation';
import TipButton from '@/components/TipButton';
import { SA, StatusBar, Ticker } from '@/components/ui';
import type { AlphaSignal } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────
type View      = 'feed' | 'detail' | 'advisor' | 'profile';
type FilterKey = 'ALL' | 'HIGH' | 'BOOSTED';

interface FeedResponse { free: AlphaSignal[]; locked: AlphaSignal[]; total: number; }
interface AgentStatusData { lastPublished: string | null; totalPublished: number; }

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Tokens (hardcoded — CSS vars unreliable in Warpcast webview) ───────────
const PAPER   = '#F2ECDF';
const PAPER_D = '#E8DFCC';
const INK     = '#1A1814';
const ASH     = '#7A7364';
const RULE    = '#9E9378';

const TABS: { id: View; icon: string; label: string }[] = [
  { id: 'feed',    icon: '▤', label: 'Feed'    },
  { id: 'advisor', icon: '◈', label: 'Advisor' },
  { id: 'profile', icon: '◉', label: 'Profile' },
];

const TICKER_ITEMS = [
  'LIVE SIGNALS · AI-CURATED · UPDATED CONTINUOUSLY',
  'CAST A SIGNAL → UNLOCK THE NEXT',
  'DEFILLAMA · COINGECKO · TOKEN TERMINAL',
];

// ── useDark (same as desktop) ──────────────────────────────────────────────
function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark');
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch { /* */ }
  };
  return [dark, toggle] as const;
}

// ── Auth gate ──────────────────────────────────────────────────────────────
function AuthGate({ onLogin, loading, dark }: { onLogin: () => void; loading: boolean; dark: boolean }) {
  const bg   = dark ? INK    : PAPER;
  const card = dark ? '#1F1B15' : PAPER_D;
  const ink  = dark ? '#F5EFE2' : INK;
  const ash  = dark ? '#8C8479' : ASH;
  const rule = dark ? '#332E22' : RULE;

  return (
    <div style={{
      minHeight: '100vh', background: bg, color: ink,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', gap: 0, overflowX: 'hidden',
    }}>
      <img
        src="/icon.png" alt="Alpha Whispr"
        width={72} height={72}
        style={{ borderRadius: 20, marginBottom: 14, objectFit: 'cover' }}
      />
      <div style={{
        fontFamily: SA.serif, fontSize: 'clamp(26px,8vw,34px)',
        fontWeight: 400, letterSpacing: -1, color: ink,
        marginBottom: 6, lineHeight: 1,
      }}>
        Alpha Whispr
      </div>
      <div style={{
        fontFamily: SA.mono, fontSize: 9, color: ash,
        letterSpacing: 3, textTransform: 'uppercase', marginBottom: 36,
      }}>
        Heard before spoken
      </div>

      <div style={{
        border: `1px solid ${rule}`, borderRadius: 14,
        padding: '20px 18px', marginBottom: 28, width: '100%', maxWidth: 320,
        background: card,
      }}>
        {([
          ['▤', 'Live DeFi, RWA & Stablecoin signals'],
          ['◈', 'Personalized yield strategies'],
          ['◉', 'Premium alpha reports'],
        ] as [string, string][]).map(([icon, text], i, arr) => (
          <div key={text} style={{
            display: 'flex', gap: 12, alignItems: 'center',
            padding: '8px 0',
            borderBottom: i < arr.length - 1 ? `0.5px solid ${rule}` : 'none',
          }}>
            <span style={{ fontFamily: SA.mono, fontSize: 14, color: SA.phosphorGlow, width: 18, textAlign: 'center' }}>{icon}</span>
            <span style={{ fontFamily: SA.mono, fontSize: 'clamp(10px,3vw,12px)', color: ink }}>{text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onLogin} disabled={loading}
        style={{
          width: '100%', maxWidth: 320, padding: '14px',
          background: SA.aqua, color: '#fff',
          border: 'none', borderRadius: 14,
          fontFamily: SA.mono, fontSize: 'clamp(11px,3vw,13px)',
          fontWeight: 700, letterSpacing: 0.5,
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1, marginBottom: 14,
        }}
      >
        {loading ? 'Connecting…' : 'Connect with Privy →'}
      </button>

      <div style={{ fontFamily: SA.mono, fontSize: 9, color: ash, letterSpacing: 0.5, textAlign: 'center' }}>
        Secured by{' '}
        <span style={{ color: SA.aqua, fontWeight: 700 }}>Privy</span>
        {' '}· Farcaster · Wallet
      </div>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────
const SHIMMER_STYLE = `
  @keyframes aw-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  .aw-skeleton {
    background: linear-gradient(90deg, var(--bg-secondary, #E8DFCC) 25%, var(--border, #9E9378) 50%, var(--bg-secondary, #E8DFCC) 75%);
    background-size: 200% 100%;
    animation: aw-shimmer 1.5s infinite;
    border-radius: 3px;
  }
`;

function SkeletonCard({ rule }: { rule: string }) {
  return (
    <div style={{ padding: '14px 14px 12px', borderBottom: `0.5px solid ${rule}` }}>
      <style dangerouslySetInnerHTML={{ __html: SHIMMER_STYLE }} />
      <div className="aw-skeleton" style={{ height: 8, width: '55%', marginBottom: 10 }} />
      <div className="aw-skeleton" style={{ height: 17, width: '90%', marginBottom: 6 }} />
      <div className="aw-skeleton" style={{ height: 17, width: '70%', marginBottom: 10 }} />
      <div className="aw-skeleton" style={{ height: 10, width: '30%' }} />
    </div>
  );
}

// ── Main frame client ──────────────────────────────────────────────────────
export default function FrameClient() {
  const searchParams = useSearchParams();
  const castRef      = searchParams.get('ref');
  const castSeverity = searchParams.get('severity') as AlphaSignal['severity'] | null;

  const { ready: privyReady, authenticated, login, user } = usePrivy();
  const [dark, toggleDark] = useDark();
  const [loginLoading, setLoginLoading] = useState(false);
  const [fid, setFid]                   = useState<number | null>(null);
  const [feed, setFeed]                 = useState<FeedResponse | null>(null);
  const [feedLoading, setFeedLoading]   = useState(false);
  const [error, setError]               = useState('');
  const [view, setView]                 = useState<View>('feed');
  const [filter, setFilter]             = useState<FilterKey>('ALL');
  const [selectedSignal, setSelectedSignal] = useState<AlphaSignal | null>(null);
  const [agentStatus, setAgentStatus]   = useState<AgentStatusData | null>(null);

  // Route directly to Advisor when arriving from a high-severity cast
  useEffect(() => {
    if (castRef === 'cast' && castSeverity === 'high') {
      setView('advisor');
    }
  }, [castRef, castSeverity]);

  // Fetch agent status once authenticated
  useEffect(() => {
    if (!authenticated) return;
    fetch('/api/agent/status')
      .then((r) => r.json())
      .then(setAgentStatus)
      .catch(() => {});
  }, [authenticated]);

  const bg   = dark ? INK    : PAPER;
  const bg2  = dark ? '#1F1B15' : PAPER_D;
  const ink  = dark ? '#F5EFE2' : INK;
  const ash  = dark ? '#8C8479' : ASH;
  const rule = dark ? '#332E22' : RULE;

  // Signal ready to Warpcast immediately — before any auth check
  useEffect(() => {
    sdk.actions.ready().catch(() => {});
  }, []);

  // Load feed after Privy auth resolves
  useEffect(() => {
    if (!privyReady || !authenticated) return;
    let cancelled = false;

    const loadFeed = async () => {
      setFeedLoading(true);
      try {
        let resolvedFid: number | null = user?.farcaster?.fid ?? null;
        if (!resolvedFid) {
          const ctx = await sdk.context;
          resolvedFid = ctx?.user?.fid ?? null;
        }
        if (cancelled) return;
        if (resolvedFid) {
          setFid(resolvedFid);
          sdk.actions.addFrame().catch(() => {});
        }
        const res  = await fetch(`/api/feed?fid=${resolvedFid ?? 0}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setFeed(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load feed');
      } finally {
        if (!cancelled) setFeedLoading(false);
      }
    };

    loadFeed();
    return () => { cancelled = true; };
  }, [privyReady, authenticated, user?.farcaster?.fid]);

  const handleLogin = async () => {
    setLoginLoading(true);
    try { await login(); } finally { setLoginLoading(false); }
  };

  // Filter logic (same as desktop FeedScreen)
  const allSignals = feed ? [...(feed.free ?? []), ...(feed.locked ?? [])] : [];
  const lockedIds  = new Set((feed?.locked ?? []).map((s) => s.id));
  const baseFiltered = allSignals.filter((s) => {
    if (filter === 'ALL')     return true;
    if (filter === 'HIGH')    return s.severity === 'high';
    if (filter === 'BOOSTED') return s.boosted;
    return true;
  });
  // When arriving from a non-high cast, bubble matching severity to top
  const filtered = (castRef === 'cast' && castSeverity && castSeverity !== 'high')
    ? [...baseFiltered].sort((a, b) =>
        (a.severity === castSeverity ? 0 : 1) - (b.severity === castSeverity ? 0 : 1)
      )
    : baseFiltered;

  // ── Privy initialising ──
  if (!privyReady) {
    return (
      <div style={{ minHeight: '100vh', background: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: SA.serif, fontSize: 20, fontStyle: 'italic', color: INK }}>Alpha Whispr</span>
      </div>
    );
  }

  // ── Auth gate ──
  if (!authenticated) {
    return <AuthGate onLogin={handleLogin} loading={loginLoading} dark={dark} />;
  }

  // ── Authenticated app shell ──
  return (
    <div style={{
      width: '100%',
      maxWidth: '424px',
      margin: '0 auto',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      overflowX: 'hidden',
      background: bg,
      color: ink,
      fontFamily: SA.mono,
    }}>

      {/* 1. Status bar mock (22px) */}
      <StatusBar dark={dark} />

      {/* 2. Masthead with title + theme toggle (28px) */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 14px 6px',
        borderBottom: `1px solid ${rule}`,
        background: bg2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img
            src="/icon.png" alt="Alpha Whispr"
            width={22} height={22}
            style={{ borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
          />
          <div style={{ fontFamily: SA.serif, fontSize: 'clamp(13px,4vw,16px)', fontWeight: 500, color: ink, letterSpacing: -0.3, fontStyle: 'italic' }}>
            Alpha Whispr
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                display: 'inline-block', width: 10, height: 10, borderRadius: 5,
                background: '#00FF41',
                boxShadow: '0 0 6px #00FF41, 0 0 12px rgba(0,255,65,0.4)',
                flexShrink: 0,
              }} />
              <span style={{ fontFamily: SA.mono, fontSize: 9, color: SA.phosphorGlow, letterSpacing: 0.8 }}>LIVE</span>
            </span>
          <TipButton compact />
          <button
            onClick={toggleDark}
            title="Toggle theme"
            style={{
              width: 24, height: 24, borderRadius: 12,
              border: `1px solid ${rule}`, cursor: 'pointer',
              background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: ink,
            }}
          >
            {dark ? '☾' : '☀'}
          </button>
        </div>
      </div>

      {/* 2b. Agent activity bar — only on feed view */}
      {view === 'feed' && agentStatus && (
        <div style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '3px 14px',
          background: 'rgba(0,255,65,0.05)',
          borderBottom: `0.5px solid ${rule}`,
        }}>
          <span style={{ fontFamily: SA.mono, fontSize: 7.5, color: SA.phosphorGlow, letterSpacing: 0.8, fontWeight: 700 }}>
            AGENT
          </span>
          <span style={{ fontFamily: SA.mono, fontSize: 8, color: SA.terminalGreen, letterSpacing: 0.3, opacity: 0.85 }}>
            {agentStatus.totalPublished} signals · last {timeAgo(agentStatus.lastPublished)}
          </span>
        </div>
      )}

      {/* 3a. Terminal animation — only on feed view, above filter tabs */}
      {view === 'feed' && <TerminalAnimation fid={fid} />}

      {/* 3b. Filter tabs ALL / HIGH / BOOSTED (32px) — only on feed view */}
      {view === 'feed' && (
        <div style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 14px',
          borderBottom: `0.5px solid ${rule}`,
          background: bg,
        }}>
          {(['ALL', 'HIGH', 'BOOSTED'] as FilterKey[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              border: `1px solid ${filter === f ? ink : rule}`,
              background: filter === f ? ink : 'transparent',
              color: filter === f ? bg : ash,
              fontFamily: SA.mono,
              fontSize: 'clamp(8px,2.5vw,10px)',
              fontWeight: 600, letterSpacing: 1,
              padding: '2px 8px', borderRadius: 0,
              cursor: 'pointer', textTransform: 'uppercase',
            }}>{f}</button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: SA.mono, fontSize: 9, color: ash }}>
            {filtered.length} signals
          </span>
        </div>
      )}

      {/* 4. Scrollable content (flex: 1) */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: bg }}>
        {feedLoading && view === 'feed' ? (
          <div style={{ paddingBottom: 8 }}>
            <SkeletonCard rule={rule} />
            <SkeletonCard rule={rule} />
          </div>
        ) : view === 'feed' ? (
          <div style={{ paddingBottom: 8 }}>
            {error && (
              <div style={{ padding: '10px 14px', border: `1px solid ${SA.rust}`, margin: '10px 14px' }}>
                <span style={{ fontFamily: SA.mono, fontSize: 10, color: SA.rust }}>ERR: {error}</span>
              </div>
            )}
            {filtered.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                locked={lockedIds.has(signal.id)}
                fid={fid ?? 0}
                dark={dark}
                onOpen={(s) => { setSelectedSignal(s); setView('detail'); }}
              />
            ))}
            {!feedLoading && filtered.length === 0 && !error && (
              <div style={{ padding: '32px 14px', textAlign: 'center' }}>
                <span style={{ fontFamily: SA.mono, fontSize: 10, color: ash, letterSpacing: 2 }}>
                  NO SIGNALS MATCH THIS FILTER
                </span>
              </div>
            )}
            <div style={{ textAlign: 'center', padding: '12px 0 16px', fontFamily: SA.mono, fontSize: 9, letterSpacing: 2, color: ash }}>
              — END OF EDITION —
            </div>
          </div>
        ) : view === 'detail' && selectedSignal ? (
          <SignalDetail
            signal={selectedSignal}
            onBack={() => setView('feed')}
            onAdvisor={() => setView('advisor')}
          />
        ) : view === 'advisor' ? (
          <>
            {castRef === 'cast' && castSeverity === 'high' && !selectedSignal && (
              <div style={{
                margin: '10px 14px 0',
                padding: '10px 12px',
                border: `1px solid ${SA.phosphorGlow}`,
                borderRadius: 10,
                background: 'rgba(0,255,65,0.06)',
              }}>
                <div style={{ fontFamily: SA.mono, fontSize: 10, color: SA.phosphorGlow, fontWeight: 700, letterSpacing: 0.5, marginBottom: 3 }}>
                  HIGH-SEVERITY SIGNAL DETECTED
                </div>
                <div style={{ fontFamily: SA.mono, fontSize: 10, color: ink, lineHeight: 1.5 }}>
                  You came from an alpha signal. Get your personalized strategy →
                </div>
              </div>
            )}
            <AdvisorFlow
              fid={fid ?? undefined}
              onBack={() => setView('feed')}
              prefilledSignal={selectedSignal ?? undefined}
            />
          </>
        ) : fid ? (
          <ProfileView fid={fid} />
        ) : (
          <div style={{ padding: '32px 14px', textAlign: 'center' }}>
            <span style={{ fontFamily: SA.mono, fontSize: 10, color: ash, letterSpacing: 2 }}>
              CONNECT FARCASTER IN PRIVY TO VIEW PROFILE
            </span>
          </div>
        )}
      </div>

      {/* 5. Live ticker band (20px) — ABOVE nav */}
      <Ticker items={TICKER_ITEMS} />

      {/* 6. Bottom nav (48px + safe area) */}
      <nav style={{
        flexShrink: 0, height: '48px',
        display: 'flex', alignItems: 'stretch',
        background: dark ? '#1F1B15' : PAPER_D,
        borderTop: `1px solid ${rule}`,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 2,
              background: 'transparent', border: 'none',
              borderTop: view === tab.id
                ? `2px solid ${SA.phosphorGlow}`
                : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: SA.mono,
              fontSize: 'clamp(8px,2.5vw,10px)',
              letterSpacing: 0.5,
              color: view === tab.id ? SA.phosphorGlow : ash,
              transition: 'color .15s', paddingTop: 2,
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
