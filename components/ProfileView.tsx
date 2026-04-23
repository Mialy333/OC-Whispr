'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import sdk from '@farcaster/miniapp-sdk';
import { SA } from '@/components/ui';
import type { RewardsStatus } from '@/lib/rewards';

const mono  = { fontFamily: SA.mono  } as const;
const serif = { fontFamily: SA.serif } as const;

const TIER_COLOR: Record<string, string> = {
  SCOUT:       SA.phosphorGlow,
  ANALYST:     SA.aqua,
  BROADCASTER: SA.amber,
  NONE:        'var(--text-muted)',
};

interface Props { fid: number; }

export default function ProfileView({ fid }: Props) {
  const { user, logout } = usePrivy();
  const [rewards, setRewards]       = useState<RewardsStatus | null>(null);
  const [wallet, setWallet]         = useState<string | null>(null);
  const [notifs, setNotifs]         = useState(false);
  const [signalsViewed, setSignalsViewed] = useState(0);

  useEffect(() => {
    fetch(`/api/rewards?fid=${fid}`)
      .then((r) => r.json())
      .then(setRewards)
      .catch(() => {});

    sdk.context.then((ctx) => {
      const addr =
        (ctx as Record<string, unknown> & { user?: Record<string, unknown> })
          ?.user?.custodyAddress as string | undefined ?? null;
      setWallet(addr);
    }).catch(() => {});

    // Signals viewed: persisted locally
    try {
      const v = parseInt(localStorage.getItem('aw_signals_viewed') ?? '0', 10);
      setSignalsViewed(isNaN(v) ? 0 : v);
    } catch { /* */ }
  }, [fid]);

  const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  const tierColor = TIER_COLOR[rewards?.tier ?? 'NONE'];

  const privyFarcaster = user?.farcaster;
  const privyWallets   = user?.linkedAccounts?.filter((a) => a.type === 'wallet') ?? [];
  const displayName    = privyFarcaster?.displayName ?? privyFarcaster?.username ?? null;
  const walletAddr     = wallet ?? (privyWallets[0] as { address?: string } | undefined)?.address ?? null;

  const memberSince = (() => {
    try {
      const raw = (user as unknown as Record<string, unknown>)?.createdAt as string | undefined;
      if (raw) return new Date(raw).getFullYear().toString();
    } catch { /* */ }
    return '2026';
  })();

  const handleNotifications = async () => {
    try { await sdk.actions.addFrame(); setNotifs(true); } catch { /* */ }
  };

  // ── Row component (uses CSS vars) ──
  const Row = ({ label, value, accent, last }: { label: string; value: string; accent?: string; last?: boolean }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0',
      borderBottom: last ? 'none' : '0.5px solid var(--border)',
    }}>
      <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5 }}>{label}</span>
      <span style={{ ...mono, fontSize: 11, color: accent ?? 'var(--text-primary)', fontWeight: 600 }}>{value}</span>
    </div>
  );

  // ── Stat box (for 2×2 grid) ──
  const StatBox = ({ label, value, accent }: { label: string; value: string | number; accent?: string }) => (
    <div style={{
      border: '0.5px solid var(--border)', borderRadius: 10,
      padding: '12px', background: 'var(--bg-secondary)',
    }}>
      <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ ...serif, fontSize: 20, color: accent ?? 'var(--text-primary)', fontWeight: 500 }}>
        {value}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '16px 14px 40px', background: 'var(--bg-primary)' }}>

      {/* Identity card */}
      <div style={{
        border: '1px solid var(--border)', borderRadius: 14,
        padding: '16px', marginBottom: 14, background: 'var(--bg-secondary)',
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <img
            src="/icon.png"
            alt="Alpha Whispr"
            width={48} height={48}
            style={{ borderRadius: 24, flexShrink: 0, objectFit: 'cover' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
              {displayName ?? `FID ${fid}`}
            </div>
            <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {walletAddr ? truncate(walletAddr) : '—'}
            </div>
          </div>
          <span style={{
            ...mono, fontSize: 9, fontWeight: 700,
            color: tierColor, border: `1px solid ${tierColor}`,
            padding: '2px 8px', borderRadius: 4, letterSpacing: 0.8, flexShrink: 0,
          }}>
            {rewards?.tier === 'NONE' || !rewards ? 'NEWCOMER' : rewards.tier}
          </span>
        </div>
      </div>

      {/* New 2×2 stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <StatBox label="Signals Viewed" value={signalsViewed} />
        <StatBox label="Tier" value={rewards?.tier === 'NONE' || !rewards ? 'NEWCOMER' : rewards.tier} accent={tierColor} />
        <StatBox label="Cast Count" value={rewards?.castCount ?? 0} />
        <StatBox label="Member Since" value={memberSince} />
      </div>

      {/* Rewards grid — DO NOT TOUCH */}
      {rewards && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Casts',     value: rewards.castCount },
            { label: 'Tier',      value: rewards.tierLabel },
            { label: 'Next tier', value: rewards.castsToNextTier != null ? `${rewards.castsToNextTier} casts` : 'Max tier' },
            { label: 'Perks',     value: rewards.perksUnlocked.length || 0 },
          ].map(({ label, value }) => (
            <div key={label} style={{
              border: '0.5px solid var(--border)', borderRadius: 10,
              padding: '12px', background: 'var(--bg-secondary)',
            }}>
              <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>
                {label}
              </div>
              <div style={{ ...serif, fontSize: 20, color: 'var(--text-primary)', fontWeight: 500 }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Follow + Notifications */}
      <button
        onClick={() =>
          sdk.actions.openUrl('https://warpcast.com/alphawhispr').catch(() =>
            window.open('https://warpcast.com/alphawhispr', '_blank')
          )
        }
        style={{
          width: '100%', padding: '11px', marginBottom: 10,
          border: `1.5px solid ${SA.phosphorGlow}`,
          background: 'transparent', borderRadius: 12, cursor: 'pointer',
          ...mono, fontSize: 11, fontWeight: 700,
          color: SA.phosphorGlow, letterSpacing: 0.5,
        }}
      >
        Follow @alphawhispr →
      </button>

      <button
        onClick={handleNotifications}
        style={{
          width: '100%', padding: '11px', marginBottom: 20,
          border: `1.5px solid ${notifs ? SA.aqua : 'var(--border)'}`,
          background: notifs ? 'rgba(62,111,168,0.10)' : 'transparent',
          borderRadius: 12, cursor: 'pointer',
          ...mono, fontSize: 11, fontWeight: 700,
          color: notifs ? SA.aqua : 'var(--text-muted)', letterSpacing: 0.5,
        }}
      >
        {notifs ? '✓ Notifications on' : 'Enable notifications'}
      </button>

      {/* Account */}
      <div style={{
        border: '1px solid var(--border)', borderRadius: 12,
        padding: '0 14px', background: 'var(--bg-secondary)', marginBottom: 14,
      }}>
        <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1.5, paddingTop: 12, paddingBottom: 6 }}>
          ACCOUNT
        </div>
        <Row label="FID" value={`${fid}`} />
        {privyFarcaster?.username && (
          <Row label="Farcaster" value={`@${privyFarcaster.username}`} accent={SA.aqua} />
        )}
        {walletAddr && <Row label="Wallet" value={truncate(walletAddr)} />}
        <Row label="Auth" value="Privy" accent={SA.aqua} />
        <div style={{ padding: '10px 0' }}>
          <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5 }}>Linked accounts</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
            {(user?.linkedAccounts ?? []).map((a, i) => (
              <span key={i} style={{
                ...mono, fontSize: 9, color: 'var(--text-primary)',
                background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '2px 7px',
              }}>
                {a.type}
              </span>
            ))}
            {(user?.linkedAccounts ?? []).length === 0 && (
              <span style={{ ...mono, fontSize: 9, color: 'var(--text-muted)' }}>—</span>
            )}
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div style={{
        border: '1px solid var(--border)', borderRadius: 12,
        padding: '0 14px', background: 'var(--bg-secondary)', marginBottom: 14,
      }}>
        <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1.5, paddingTop: 12, paddingBottom: 6 }}>
          PREFERENCES
        </div>
        <Row label="Signal feed" value="DeFi · RWA · Stablecoin" />
        <Row label="Unlock method" value="Cast to unlock" />
        <div style={{ padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5 }}>Theme</span>
            <button
              onClick={() => {
                const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                try { localStorage.setItem('theme', next); } catch { /* */ }
              }}
              style={{
                ...mono, fontSize: 10, color: SA.aqua, background: 'transparent',
                border: '1px solid var(--border)', borderRadius: 6,
                padding: '3px 10px', cursor: 'pointer',
              }}
            >
              Toggle dark / light
            </button>
          </div>
        </div>
        <Row label="Agent" value="@alphawhispr · active" accent={SA.phosphorGlow} last />
      </div>

      {/* About */}
      <div style={{
        border: '1px solid var(--border)', borderRadius: 12,
        padding: '0 14px', background: 'var(--bg-secondary)', marginBottom: 20,
      }}>
        <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1.5, paddingTop: 12, paddingBottom: 6 }}>
          ABOUT
        </div>
        <Row label="App" value="Alpha Whispr" />
        <Row label="Version" value="1.0.0-hackathon" />
        <Row label="Powered by" value="Privy · Neynar · OpenRouter" />
        <div style={{ padding: '10px 0' }}>
          <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5 }}>Data sources</span>
          <div style={{ ...mono, fontSize: 10, color: 'var(--text-primary)', marginTop: 4, lineHeight: 1.5 }}>
            DeFiLlama · CoinGecko · on-chain
          </div>
        </div>
      </div>

      {/* Disconnect */}
      <button
        onClick={() => logout().catch(() => {})}
        style={{
          width: '100%', padding: '11px',
          border: `1px solid ${SA.rust}`,
          background: 'transparent', borderRadius: 12, cursor: 'pointer',
          ...mono, fontSize: 11, fontWeight: 700,
          color: SA.rust, letterSpacing: 0.5,
        }}
      >
        Disconnect Privy
      </button>
    </div>
  );
}
