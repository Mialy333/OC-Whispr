import { NextRequest, NextResponse } from 'next/server';
import { generateCastSummary } from '@/lib/agents/orchestrator';
import { getSignalById } from '@/lib/agents/signal-cache';
import { apiGuard } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

// TODO V2: verify fid matches Privy authenticated user
function isValidFid(fid: unknown): fid is number {
  return typeof fid === 'number' && Number.isInteger(fid) && fid > 0 && fid < 1_000_000_000;
}

interface UnlockBody {
  fid: number;
  signalId: string;
}

export async function POST(req: NextRequest) {
  const blocked = apiGuard(req);
  if (blocked) return blocked;

  try {
    const body: UnlockBody = await req.json();
    const { fid, signalId } = body;

    if (!isValidFid(fid) || !signalId) {
      return NextResponse.json({ error: 'Valid fid and signalId are required' }, { status: 400 });
    }

    const signal = getSignalById(signalId);
    if (!signal) {
      return NextResponse.json(
        { error: 'Signal expired, refresh feed' },
        { status: 404 }
      );
    }

    const castHash = req.headers.get('x-cast-hash');
    if (!castHash) {
      const castTemplate = await generateCastSummary(signal);
      return NextResponse.json({ status: 'cast_required', castTemplate });
    }

    // Verify the cast was published by this fid
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (!appUrl) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const verifyRes = await fetch(`${appUrl}/api/verify-cast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fid, signalId, keyword: castHash }),
    });

    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Cast verification failed' }, { status: 502 });
    }

    const { verified } = await verifyRes.json();
    if (!verified) {
      return NextResponse.json({ status: 'cast_required', reason: 'cast_not_verified' });
    }

    return NextResponse.json({ status: 'unlocked', signal });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
