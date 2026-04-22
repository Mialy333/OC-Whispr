import { NextRequest, NextResponse } from 'next/server';
import { generateCastSummary } from '@/lib/agents/orchestrator';
import { getSignalById } from '@/lib/agents/signal-cache';
import { apiGuard } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

// TODO V2: verify fid matches Privy authenticated user
function isValidFid(fid: unknown): fid is number {
  return typeof fid === 'number' && Number.isInteger(fid) && fid > 0 && fid < 1_000_000_000;
}

interface CastBody {
  fid: number;
  signalId: string;
}

export async function POST(req: NextRequest) {
  const blocked = apiGuard(req);
  if (blocked) return blocked;

  try {
    const body: CastBody = await req.json();
    const { fid, signalId } = body;

    if (!isValidFid(fid) || !signalId) {
      return NextResponse.json({ error: 'Valid fid and signalId are required' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (!appUrl) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const signal = getSignalById(signalId);
    if (!signal) {
      return NextResponse.json({ error: 'Signal expired, refresh feed' }, { status: 404 });
    }

    const raw = (await generateCastSummary(signal)).trim();
    const castText = raw.length > 320 ? raw.slice(0, 317) + '...' : raw;
    const frameUrl = `${appUrl}/frame?signal=${encodeURIComponent(signalId)}`;
    const castUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(frameUrl)}`;
    const keyword = castText.split(' ').slice(0, 6).join(' ');

    return NextResponse.json({ castText, castUrl, frameUrl, keyword });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
