'use client';

import { useEffect, useState } from 'react';
import { SA } from '@/components/ui';
import type { RewardsStatus } from '@/lib/rewards';
import { TIERS } from '@/lib/rewards';

interface Props {
  fid: number | null;
  dark: boolean;
  panel: string;
  panelBorder: string;
  inkC: string;
}

const TIER_ICONS: Record<string, string> = {
  NONE:        '○',
  SCOUT:       '◆',
  ANALYST:     '◈',
  BROADCASTER: '★',
};

export default function RewardsCard({ fid, dark, panel, panelBorder, inkC }: Props) {
  const [status, setStatus] = useState<RewardsStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fid) return;
    setLoading(true);
    fetch(`/api/rewards?fid=${fid}`)
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fid]);

  const topTier = TIERS[TIERS.length - 1];
  const maxCasts = topTier.minCasts;
  const count = status?.castCount ?? 0;
  const progressPct = Math.min(100, (count / maxCasts) * 100);

  const tierColor =
    status?.tier === 'BROADCASTER' ? SA.amber :
    status?.tier === 'ANALYST'     ? SA.aqua  :
    status?.tier === 'SCOUT'       ? SA.phosphorGlow :
    SA.ash;

  return (
    <div style={{
      background: panel,
      border: `1px solid ${panelBorder}`,
      padding: 14,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{
          fontFamily: SA.mono, fontSize: 18, color: tierColor,
          lineHeight: 1,
        }}>
          {TIER_ICONS[status?.tier ?? 'NONE']}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: SA.mono, fontSize: 11, fontWeight: 700,
            letterSpacing: 1, color: tierColor,
            textTransform: 'uppercase',
          }}>
            {loading ? '…' : (status?.tierLabel ?? 'None')}
          </div>
          <div style={{ fontFamily: SA.mono, fontSize: 9, color: SA.ash, letterSpacing: 0.6, marginTop: 1 }}>
            {loading ? '' : `${count} cast${count !== 1 ? 's' : ''} total`}
          </div>
        </div>
        {status?.nextTier && (
          <div style={{
            fontFamily: SA.mono, fontSize: 9, color: SA.ash,
            textAlign: 'right', letterSpacing: 0.5,
          }}>
            <div>{status.castsToNextTier} more to</div>
            <div style={{ color: inkC, fontWeight: 700 }}>{status.nextTier.label}</div>
          </div>
        )}
        {status?.tier === 'BROADCASTER' && (
          <div style={{ fontFamily: SA.mono, fontSize: 9, color: SA.amber, letterSpacing: 0.5 }}>MAX TIER</div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4, background: dark ? '#332E22' : SA.platinumLo,
        borderRadius: 0, overflow: 'hidden', marginBottom: 10,
      }}>
        <div style={{
          height: '100%', width: `${progressPct}%`,
          background: `linear-gradient(90deg, ${SA.phosphorGlow}, ${SA.aqua})`,
          transition: 'width 0.6s ease',
        }} />
      </div>

      {/* Tier milestones */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        {TIERS.map((t) => {
          const unlocked = count >= t.minCasts;
          return (
            <div key={t.name} style={{ textAlign: 'center', flex: 1 }}>
              <div style={{
                fontFamily: SA.mono, fontSize: 10,
                color: unlocked ? tierColor : SA.ash,
              }}>
                {TIER_ICONS[t.name]}
              </div>
              <div style={{
                fontFamily: SA.mono, fontSize: 7.5, letterSpacing: 0.8,
                color: unlocked ? inkC : SA.ash,
                textTransform: 'uppercase', marginTop: 2,
              }}>
                {t.label}
              </div>
              <div style={{
                fontFamily: SA.mono, fontSize: 7, color: SA.ash, marginTop: 1,
              }}>
                {t.minCasts}c
              </div>
            </div>
          );
        })}
      </div>

      {/* Unlocked perks */}
      {(status?.perksUnlocked.length ?? 0) > 0 && (
        <div style={{
          borderTop: `0.5px solid ${panelBorder}`, paddingTop: 8,
        }}>
          <div style={{
            fontFamily: SA.mono, fontSize: 8, letterSpacing: 1.5,
            color: SA.ash, textTransform: 'uppercase', marginBottom: 4,
          }}>
            Perks unlocked
          </div>
          {status!.perksUnlocked.map((p) => (
            <div key={p} style={{
              fontFamily: SA.mono, fontSize: 9.5, color: SA.phosphorGlow,
              letterSpacing: 0.3, marginBottom: 2,
            }}>
              ✓ {p}
            </div>
          ))}
        </div>
      )}

      {!fid && (
        <div style={{ fontFamily: SA.mono, fontSize: 10, color: SA.ash, fontStyle: 'italic' }}>
          Connect to track your rewards
        </div>
      )}
    </div>
  );
}
