import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  try {
    const body: { email?: unknown } = await req.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400, headers: NO_STORE });
    }

    const redis = await getRedis();
    const key = `waitlist:${email}`;

    const existing = await redis.get(key);
    if (!existing) {
      await redis.set(key, JSON.stringify({ email, timestamp: new Date().toISOString(), source: 'miniapp' }));
      await redis.incr('waitlist:total');
    }

    const total = Number(await redis.get('waitlist:total')) || 1;
    return NextResponse.json({ success: true, position: total }, { headers: NO_STORE });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE });
  }
}
