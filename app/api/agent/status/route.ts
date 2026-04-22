import { NextResponse } from 'next/server';
import { getStatus } from '@/lib/agents/signal-cache';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [lastCastHash, lastPublished, totalPublished] = await Promise.all([
    kv.get<string>('lastCastHash'),
    kv.get<string>('lastPublished'),
    kv.get<number>('totalPublished'),
  ]);

  const status = getStatus();

  return NextResponse.json({
    ...status,
    lastCastHash: lastCastHash ?? status.lastCastHash,
    lastPublished: lastPublished ?? status.lastPublished,
    totalPublished: totalPublished ?? status.totalPublished,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
