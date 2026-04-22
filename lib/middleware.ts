/**
 * Server-side API guard — call at the top of every route handler.
 * Returns a NextResponse error if the request should be rejected,
 * or null if it should proceed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/api/ratelimit';

export function apiGuard(req: NextRequest): NextResponse | null {
  // Rate limit
  const ip = getClientIp(req);
  const { ok, retryAfter } = checkRateLimit(ip);
  if (!ok) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter ?? 60),
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Window': '60s',
        },
      }
    );
  }
  return null;
}
