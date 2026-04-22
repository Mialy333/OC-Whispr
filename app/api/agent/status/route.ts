import { NextResponse } from 'next/server';
import { getStatus } from '@/lib/agents/signal-cache';
import { getRedis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = getStatus();

  try {
    const redis = await getRedis();
    const [lastCastHash, lastPublished, totalPublished] = await Promise.all([
      redis.get('lastCastHash'),
      redis.get('lastPublished'),
      redis.get('totalPublished'),
    ]);

    return NextResponse.json({
      ...status,
      lastCastHash: lastCastHash ?? status.lastCastHash,
      lastPublished: lastPublished ?? status.lastPublished,
      totalPublished: totalPublished ? Number(totalPublished) : status.totalPublished,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } });
  }
}
