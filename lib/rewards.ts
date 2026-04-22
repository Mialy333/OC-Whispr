/**
 * In-memory cast-count tracker per FID.
 * Uses globalThis so state survives HMR. MVP — no DB.
 */

export type Tier = 'NONE' | 'SCOUT' | 'ANALYST' | 'BROADCASTER';

interface TierConfig {
  name: Tier;
  minCasts: number;
  label: string;
  perk: string;
}

export const TIERS: TierConfig[] = [
  { name: 'SCOUT',       minCasts:  1, label: 'Scout',       perk: 'Unlock all signals for 24h' },
  { name: 'ANALYST',     minCasts:  5, label: 'Analyst',     perk: '"Analyst" badge in profile' },
  { name: 'BROADCASTER', minCasts: 20, label: 'Broadcaster', perk: 'Early access to new signal types' },
];

declare global { var __castCounts: Map<number, number> | undefined; }
globalThis.__castCounts ??= new Map<number, number>();
const store = globalThis.__castCounts;

export function incrementCastCount(fid: number): number {
  const next = (store.get(fid) ?? 0) + 1;
  store.set(fid, next);
  return next;
}

export function getCastCount(fid: number): number {
  return store.get(fid) ?? 0;
}

export function getTierForCount(count: number): TierConfig | null {
  return [...TIERS].reverse().find((t) => count >= t.minCasts) ?? null;
}

export interface RewardsStatus {
  castCount: number;
  tier: Tier;
  tierLabel: string;
  nextTier: TierConfig | null;
  castsToNextTier: number | null;
  perksUnlocked: string[];
}

export function getRewardsStatus(fid: number): RewardsStatus {
  const castCount = getCastCount(fid);
  const current   = getTierForCount(castCount);
  const tierIndex = current ? TIERS.findIndex((t) => t.name === current.name) : -1;
  const nextTier  = tierIndex < TIERS.length - 1 ? TIERS[tierIndex + 1] : null;

  const perksUnlocked = TIERS
    .filter((t) => castCount >= t.minCasts)
    .map((t) => t.perk);

  return {
    castCount,
    tier:           current?.name ?? 'NONE',
    tierLabel:      current?.label ?? 'None',
    nextTier:       nextTier ?? null,
    castsToNextTier: nextTier ? nextTier.minCasts - castCount : null,
    perksUnlocked,
  };
}
