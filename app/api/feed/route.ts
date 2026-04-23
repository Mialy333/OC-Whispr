import { NextRequest, NextResponse } from 'next/server';
import { getTopProtocols } from '@/lib/api/defillama';
import { analyzeProtocols, curateForUser } from '@/lib/agents/orchestrator';
import {
  getCachedSignals, isCacheStale, ensureRefreshLoop,
} from '@/lib/agents/signal-cache';
import { apiGuard } from '@/lib/middleware';
import type { AlphaSignal } from '@/types';

export const dynamic = 'force-dynamic';

const CDN_CACHE = {
  'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
  'CDN-Cache-Control': 'max-age=60',
};

function parseFid(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n >= 1_000_000_000) return null;
  return n;
}

export async function GET(req: NextRequest) {
  const blocked = apiGuard(req);
  if (blocked) return blocked;

  ensureRefreshLoop();

  try {
    const fid = parseFid(req.nextUrl.searchParams.get('fid'));

    if (req.nextUrl.searchParams.has('fid') && fid === null) {
      return NextResponse.json({ error: 'Invalid fid' }, { status: 400 });
    }

    let rawSignals: AlphaSignal[];
    if (isCacheStale()) {
      const protocols = await getTopProtocols(20);
      rawSignals = await analyzeProtocols(protocols);
    } else {
      rawSignals = getCachedSignals();
    }

    const signals: AlphaSignal[] = fid
      ? await curateForUser(fid, rawSignals)
      : rawSignals;

    const free   = signals.slice(0, 2);
    const locked = signals.slice(2);

    return NextResponse.json(
      { free, locked, total: signals.length },
      { headers: CDN_CACHE }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
