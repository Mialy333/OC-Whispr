'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import sdk from '@farcaster/miniapp-sdk';
import { SA } from '@/components/ui';
import type { RewardsStatus } from '@/lib/rewards';

const mono  = { fontFamily: SA.mono  } as const;
const serif = { fontFamily: SA.serif } as const;

const PAPER   = '#F2ECDF';
const PAPER_D = '#E8DFCC';
const INK     = '#1A1814';
const ASH     = '#7A7364';
const RULE    = '#9E9378';

const TIER_COLOR: Record<string, string> = {
  SCOUT:       SA.phosphorGlow,
  ANALYST:     SA.aqua,
  BROADCASTER: SA.amber,
  NONE:        ASH,
};

interface Props { fid: number; }

export default function ProfileView({ fid }: Props) {
  const { user, logout } = usePrivy();
  const [rewards, setRewards] = useState<RewardsStatus | null>(null);
  const [wallet, setWallet]   = useState<string | null>(null);
  const [notifs, setNotifs]   = useState(false);

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
  }, [fid]);

  const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  const tierColor = TIER_COLOR[rewards?.tier ?? 'NONE'];

  // Privy-linked info
  const privyFarcaster = user?.farcaster;
  const privyWallets   = user?.linkedAccounts?.filter((a) => a.type === 'wallet') ?? [];
  const displayName    = privyFarcaster?.displayName ?? privyFarcaster?.username ?? null;

  const handleNotifications = async () => {
    try {
      await sdk.actions.addFrame();
      setNotifs(true);
    } catch { /* already added or not supported */ }
  };

  const Row = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: `0.5px solid ${RULE}`,
    }}>
      <span style={{ ...mono, fontSize: 10, color: ASH, letterSpacing: 0.5 }}>{label}</span>
      <span style={{ ...mono, fontSize: 11, color: accent ?? INK, fontWeight: 600 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ padding: '16px 14px 40px', background: PAPER }}>

      {/* Identity card */}
      <div style={{
        border: `1px solid ${RULE}`, borderRadius: 14,
        padding: '16px', marginBottom: 14, background: PAPER_D,
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <img
            src="https://farhack2026.vercel.app/icon.png"
            alt="Alpha Whispr"
            width={48} height={48}
            style={{ borderRadius: 24, flexShrink: 0, objectFit: 'cover' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: INK, marginBottom: 2 }}>
              {displayName ?? `FID ${fid}`}
            </div>
            <div style={{ ...mono, fontSize: 10, color: ASH, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {wallet ? truncate(wallet) : privyWallets[0] ? truncate((privyWallets[0] as { address: string }).address) : '—'}
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

      {/* Stats grid — DO NOT TOUCH */}
      {rewards && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Casts',     value: rewards.castCount },
            { label: 'Tier',      value: rewards.tierLabel },
            { label: 'Next tier', value: rewards.castsToNextTier != null ? `${rewards.castsToNextTier} casts` : 'Max tier' },
            { label: 'Perks',     value: rewards.perksUnlocked.length || 0 },
          ].map(({ label, value }) => (
            <div key={label} style={{
              border: `1px solid ${RULE}`, borderRadius: 10,
              padding: '12px', background: PAPER_D,
            }}>
              <div style={{ ...mono, fontSize: 9, color: ASH, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>
                {label}
              </div>
              <div style={{ ...serif, fontSize: 20, color: INK, fontWeight: 500 }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Follow button */}
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

      {/* Notifications toggle */}
      <button
        onClick={handleNotifications}
        style={{
          width: '100%', padding: '11px', marginBottom: 20,
          border: `1.5px solid ${notifs ? SA.aqua : RULE}`,
          background: notifs ? 'rgba(62,111,168,0.10)' : 'transparent',
          borderRadius: 12, cursor: 'pointer',
          ...mono, fontSize: 11, fontWeight: 700,
          color: notifs ? SA.aqua : ASH, letterSpacing: 0.5,
        }}
      >
        {notifs ? '✓ Notifications on' : 'Enable notifications'}
      </button>

      {/* Settings */}
      <div style={{
        border: `1px solid ${RULE}`, borderRadius: 12,
        padding: '0 14px', background: PAPER_D, marginBottom: 14,
      }}>
        <div style={{ ...mono, fontSize: 9, color: ASH, letterSpacing: 1.5, paddingTop: 12, paddingBottom: 6 }}>
          ACCOUNT
        </div>

        <Row label="FID" value={`${fid}`} />

        {privyFarcaster?.username && (
          <Row label="Farcaster" value={`@${privyFarcaster.username}`} accent={SA.aqua} />
        )}

        {privyWallets.length > 0 && (
          <Row
            label="Wallet"
            value={truncate((privyWallets[0] as { address: string }).address)}
          />
        )}

        <Row
          label="Auth"
          value="Privy"
          accent={SA.aqua}
        />

        <div style={{ padding: '10px 0' }}>
          <span style={{ ...mono, fontSize: 10, color: ASH, letterSpacing: 0.5 }}>Linked accounts</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
            {(user?.linkedAccounts ?? []).map((a, i) => (
              <span key={i} style={{
                ...mono, fontSize: 9, color: INK,
                background: PAPER, border: `1px solid ${RULE}`,
                borderRadius: 4, padding: '2px 7px',
              }}>
                {a.type}
              </span>
            ))}
            {(user?.linkedAccounts ?? []).length === 0 && (
              <span style={{ ...mono, fontSize: 9, color: ASH }}>—</span>
            )}
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div style={{
        border: `1px solid ${RULE}`, borderRadius: 12,
        padding: '0 14px', background: PAPER_D, marginBottom: 14,
      }}>
        <div style={{ ...mono, fontSize: 9, color: ASH, letterSpacing: 1.5, paddingTop: 12, paddingBottom: 6 }}>
          PREFERENCES
        </div>
        <Row label="Signal feed" value="DeFi · RWA · Stablecoin" />
        <Row label="Unlock method" value="Cast to unlock" />
        <div style={{ padding: '10px 0', borderBottom: `0.5px solid ${RULE}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ ...mono, fontSize: 10, color: ASH, letterSpacing: 0.5 }}>Theme</span>
            <button
              onClick={() => {
                const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                try { localStorage.setItem('theme', next); } catch { /* */ }
              }}
              style={{
                ...mono, fontSize: 10, color: SA.aqua, background: 'transparent',
                border: `1px solid ${RULE}`, borderRadius: 6,
                padding: '3px 10px', cursor: 'pointer',
              }}
            >
              Toggle dark / light
            </button>
          </div>
        </div>
        <Row label="Agent" value="@alphawhispr · active" accent={SA.phosphorGlow} />
      </div>

      {/* About */}
      <div style={{
        border: `1px solid ${RULE}`, borderRadius: 12,
        padding: '0 14px', background: PAPER_D, marginBottom: 20,
      }}>
        <div style={{ ...mono, fontSize: 9, color: ASH, letterSpacing: 1.5, paddingTop: 12, paddingBottom: 6 }}>
          ABOUT
        </div>
        <Row label="App" value="Alpha Whispr" />
        <Row label="Version" value="1.0.0-hackathon" />
        <Row label="Powered by" value="Privy · Neynar · OpenRouter" />
        <div style={{ padding: '10px 0' }}>
          <span style={{ ...mono, fontSize: 10, color: ASH, letterSpacing: 0.5 }}>Data sources</span>
          <div style={{ ...mono, fontSize: 10, color: INK, marginTop: 4, lineHeight: 1.5 }}>
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
