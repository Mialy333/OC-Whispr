import { NextRequest, NextResponse } from 'next/server';
import { getTopProtocols } from '@/lib/api/defillama';
import { analyzeProtocols, curateForUser } from '@/lib/agents/orchestrator';
import type { AlphaSignal } from '@/types';

export const dynamic = 'force-dynamic';

// TODO V2: verify fid matches Privy authenticated user
function parseFid(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n >= 1_000_000_000) return null;
  return n;
}

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(req: NextRequest) {
  try {
    const fid = parseFid(req.nextUrl.searchParams.get('fid'));

    if (req.nextUrl.searchParams.has('fid') && fid === null) {
      return NextResponse.json({ error: 'Invalid fid' }, { status: 400, headers: NO_STORE });
    }

    const protocols = await getTopProtocols(20);
    const rawSignals = await analyzeProtocols(protocols);

    const signals: AlphaSignal[] = fid
      ? await curateForUser(fid, rawSignals)
      : rawSignals;

    // Free tier: first 2 signals regardless of severity (post-curation order is personalised)
    const free = signals.slice(0, 2);
    const locked = signals.slice(2);

    return NextResponse.json(
      { free, locked, total: signals.length },
      { headers: NO_STORE }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE });
  }
}
