import { NextRequest, NextResponse } from 'next/server';
import { getCachedSignals } from '@/lib/agents/signal-cache';
import { apiGuard } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function POST(req: NextRequest) {
  const blocked = apiGuard(req);
  if (blocked) return blocked;

  try {
    await req.json(); // consume body
    // TODO: implement premium payment gate
    const signals = getCachedSignals();
    return NextResponse.json({ unlocked: true, signals }, { headers: NO_STORE });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE });
  }
}
