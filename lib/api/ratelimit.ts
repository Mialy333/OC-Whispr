/**
 * In-memory sliding-window rate limiter.
 * 10 requests per 60 s per IP. Safe for single-instance use (Vercel Fluid Compute).
 * Uses globalThis so the Map survives HMR reloads in dev.
 */

const WINDOW_MS  = 60_000;
const MAX_HITS   = 10;

interface WindowEntry { hits: number; windowStart: number; }

declare global { var __rlMap: Map<string, WindowEntry> | undefined; }
globalThis.__rlMap ??= new Map<string, WindowEntry>();
const store = globalThis.__rlMap;

export function checkRateLimit(ip: string): { ok: boolean; retryAfter?: number } {
  const now  = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(ip, { hits: 1, windowStart: now });
    return { ok: true };
  }

  if (entry.hits >= MAX_HITS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { ok: false, retryAfter };
  }

  entry.hits += 1;
  return { ok: true };
}

export function getClientIp(req: Request): string {
  const fwd = req instanceof Request
    ? (req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip'))
    : null;
  return (fwd?.split(',')[0] ?? '127.0.0.1').trim();
}
