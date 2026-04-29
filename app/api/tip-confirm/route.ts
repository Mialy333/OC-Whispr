import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { txHash?: string; amount?: number; address?: string };
    const { txHash, amount, address } = body;

    if (!txHash || !amount) {
      return NextResponse.json({ error: 'txHash and amount required' }, { status: 400 });
    }

    const redis = await getRedis();
    await Promise.all([
      redis.set(`tip:${txHash}`, JSON.stringify({ txHash, amount, address: address ?? null, timestamp: Date.now() }), { EX: 60 * 60 * 24 * 90 }),
      redis.incr('tips:total'),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
