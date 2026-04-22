import { NextRequest, NextResponse } from 'next/server';
import { checkIfFollows } from '@/lib/api/neynar';
import { getCachedSignals } from '@/lib/agents/signal-cache';
import { apiGuard } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

function parseFid(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n >= 1_000_000_000) return null;
  return n;
}

export async function POST(req: NextRequest) {
  const blocked = apiGuard(req);
  if (blocked) return blocked;

  try {
    const body: { fid?: unknown } = await req.json();
    const fid = parseFid(body.fid);
    if (!fid) {
      return NextResponse.json({ error: 'Valid fid is required' }, { status: 400, headers: NO_STORE });
    }

    const botFid = parseFid(process.env.BOT_FID);
    if (!botFid) {
      return NextResponse.json({ error: 'BOT_FID not configured' }, { status: 500, headers: NO_STORE });
    }

    const follows = await checkIfFollows(fid, botFid);
    if (!follows) {
      return NextResponse.json(
        { unlocked: false, reason: 'follow_required', followUrl: 'https://warpcast.com/morningwhispr' },
        { headers: NO_STORE }
      );
    }

    const signals = getCachedSignals();
    return NextResponse.json({ unlocked: true, signals }, { headers: NO_STORE });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE });
  }
}
