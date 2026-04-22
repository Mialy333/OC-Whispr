'use client';

import { useEffect, useState } from 'react';
import sdk from '@farcaster/miniapp-sdk';
import { SA } from '@/components/ui';
import type { RewardsStatus } from '@/lib/rewards';

const mono = { fontFamily: SA.mono } as const;
const serif = { fontFamily: SA.serif } as const;

const TIER_COLOR: Record<string, string> = {
  SCOUT:       SA.phosphorGlow,
  ANALYST:     SA.aqua,
  BROADCASTER: SA.amber,
  NONE:        SA.ash,
};

interface Props { fid: number; }

export default function ProfileView({ fid }: Props) {
  const [rewards, setRewards] = useState<RewardsStatus | null>(null);
  const [wallet, setWallet]   = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/rewards?fid=${fid}`)
      .then((r) => r.json())
      .then(setRewards)
      .catch(() => {});

    sdk.context.then((ctx) => {
      // custodyAddress or verifiedAddresses depending on SDK version
      const addr =
        (ctx as Record<string, unknown> & { user?: Record<string, unknown> })
          ?.user?.custodyAddress as string | undefined ?? null;
      setWallet(addr);
    }).catch(() => {});
  }, [fid]);

  const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  const tierColor = TIER_COLOR[rewards?.tier ?? 'NONE'];

  return (
    <div style={{ padding: '20px 14px 32px' }}>
      {/* Identity card */}
      <div style={{
        border: '1px solid var(--border)', borderRadius: 14,
        padding: '16px', marginBottom: 14,
        background: 'var(--bg-secondary)',
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 24, flexShrink: 0,
            background: `linear-gradient(135deg, ${SA.aqua}, ${SA.aquaDeep})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: SA.serif, fontSize: 20, fontWeight: 700, color: '#fff',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.4)',
          }}>
            {String(fid).slice(-1)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
              FID {fid}
            </div>
            <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {wallet ? truncate(wallet) : '—'}
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

      {/* Stats grid */}
      {rewards && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Casts',     value: rewards.castCount },
            { label: 'Tier',      value: rewards.tierLabel },
            { label: 'Next tier', value: rewards.castsToNextTier != null ? `${rewards.castsToNextTier} casts` : 'Max tier' },
            { label: 'Perks',     value: rewards.perksUnlocked.length || 0 },
          ].map(({ label, value }) => (
            <div key={label} style={{
              border: '1px solid var(--border)', borderRadius: 10,
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

      {/* Follow button */}
      <button
        onClick={() =>
          sdk.actions.openUrl('https://warpcast.com/alphawhispr').catch(() =>
            window.open('https://warpcast.com/alphawhispr', '_blank')
          )
        }
        style={{
          width: '100%', padding: '11px',
          border: `1.5px solid ${SA.phosphorGlow}`,
          background: 'transparent', borderRadius: 12, cursor: 'pointer',
          ...mono, fontSize: 11, fontWeight: 700,
          color: SA.phosphorGlow, letterSpacing: 0.5,
        }}
      >
        Follow @alphawhispr →
      </button>
    </div>
  );
}
