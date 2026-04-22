/**
 * Server-side signal cache singleton.
 * Survives across requests within one process (one Vercel function instance).
 * Uses globalThis so HMR in dev doesn't create duplicate refresh loops.
 */

import type { AlphaSignal } from '@/types';
import { publishCast } from '@/lib/api/neynar';

const REFRESH_MS   = 5 * 60 * 1000; // 5 minutes
const APP_URL      = () => (process.env.NEXT_PUBLIC_APP_URL ?? '').trim();
const LLM_MODEL    = () => process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001';

interface CacheState {
  signals:        AlphaSignal[];
  signalMap:      Map<string, AlphaSignal>;
  lastRun:        number;     // unix ms, 0 = never
  dataSource:     string;
  broadcastedIds: Set<string>;
  refreshing:     boolean;
  intervalHandle: ReturnType<typeof setInterval> | null;
}

// One instance per Node.js process (survives HMR in dev)
const g = globalThis as typeof globalThis & { __saCache?: CacheState };

if (!g.__saCache) {
  g.__saCache = {
    signals:        [],
    signalMap:      new Map(),
    lastRun:        0,
    dataSource:     'defillama+coingecko',
    broadcastedIds: new Set(),
    refreshing:     false,
    intervalHandle: null,
  };
}

const state = g.__saCache;

// ── Public read API ────────────────────────────────────────────────────────

export function getSignalById(id: string): AlphaSignal | undefined {
  return state.signalMap.get(id);
}

export function getCachedSignals(): AlphaSignal[] {
  return state.signals;
}

export function isCacheStale(): boolean {
  return state.signals.length === 0 || Date.now() - state.lastRun > REFRESH_MS;
}

export function getStatus() {
  return {
    lastRun:      state.lastRun ? new Date(state.lastRun).toISOString() : null,
    signalCount:  state.signals.length,
    dataSource:   state.dataSource,
    llmModel:     LLM_MODEL(),
    personalized: false, // feed-level personalization via curateForUser
    refreshing:   state.refreshing,
    nextRefreshIn: state.lastRun
      ? Math.max(0, Math.round((state.lastRun + REFRESH_MS - Date.now()) / 1000))
      : 0,
  };
}

// ── Public write API ───────────────────────────────────────────────────────

export function updateCache(signals: AlphaSignal[], source = 'defillama+coingecko'): void {
  state.signals   = signals;
  state.dataSource = source;
  state.lastRun   = Date.now();
  state.signalMap.clear();
  for (const s of signals) state.signalMap.set(s.id, s);
}

// ── Background broadcast ───────────────────────────────────────────────────

async function broadcastNewHighSignals(signals: AlphaSignal[]): Promise<void> {
  const appUrl = APP_URL();
  if (!appUrl || !process.env.NEYNAR_SIGNER_UUID) return;

  const highSignals = signals.filter(
    (s) => s.severity === 'high' && !state.broadcastedIds.has(s.id),
  );

  for (const signal of highSignals) {
    state.broadcastedIds.add(signal.id); // mark before async to prevent double-send
    const text = `🚨 ${signal.protocolName}: ${signal.title}\n\n${signal.dataPoint} 🔍 Morning Whispr`;
    const frameUrl = `${appUrl}/frame?signal=${encodeURIComponent(signal.id)}`;
    const result = await publishCast(text.slice(0, 320), [frameUrl]);
    if (result.error) {
      console.warn('[signal-cache] broadcast failed:', result.error);
      state.broadcastedIds.delete(signal.id); // allow retry on next run
    } else {
      console.log('[signal-cache] broadcasted signal', signal.id, '→', result.hash);
    }
  }
}

// ── Refresh loop ───────────────────────────────────────────────────────────

async function runRefresh(): Promise<void> {
  if (state.refreshing) return;
  state.refreshing = true;
  try {
    // Dynamic imports to avoid circular deps at module-load time
    const { getTopProtocols } = await import('@/lib/api/defillama');
    const { analyzeProtocols } = await import('@/lib/agents/orchestrator');
    const protocols = await getTopProtocols(20);
    const signals   = await analyzeProtocols(protocols);  // also calls updateCache internally
    await broadcastNewHighSignals(signals);
  } catch (e) {
    console.error('[signal-cache] refresh failed:', e);
  } finally {
    state.refreshing = false;
  }
}

/**
 * Call once on server startup (e.g. from feed route).
 * Starts a 5-min background refresh loop. Idempotent.
 */
export function ensureRefreshLoop(): void {
  if (state.intervalHandle !== null) return;
  state.intervalHandle = setInterval(() => {
    runRefresh().catch(console.error);
  }, REFRESH_MS);
  // Don't unref — we want it to keep running (Node.js specific, harmless on Vercel)
  console.log('[signal-cache] refresh loop started (every 5 min)');
}
