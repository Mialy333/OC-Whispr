import { NextRequest, NextResponse } from 'next/server';
import { getTopProtocols } from '@/lib/api/defillama';
import { analyzeProtocols, curateForUser } from '@/lib/agents/orchestrator';
import {
  getCachedSignals, isCacheStale, ensureRefreshLoop,
} from '@/lib/agents/signal-cache';
import { checkIfFollows } from '@/lib/api/neynar';
import { apiGuard } from '@/lib/middleware';
import type { AlphaSignal } from '@/types';

export const dynamic = 'force-dynamic';

function parseFid(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n >= 1_000_000_000) return null;
  return n;
}

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(req: NextRequest) {
  const blocked = apiGuard(req);
  if (blocked) return blocked;

  ensureRefreshLoop();

  try {
    const fid = parseFid(req.nextUrl.searchParams.get('fid'));

    if (req.nextUrl.searchParams.has('fid') && fid === null) {
      return NextResponse.json({ error: 'Invalid fid' }, { status: 400, headers: NO_STORE });
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

    // Check follow status — followers get all signals unlocked
    const botFid = process.env.BOT_FID ? Number(process.env.BOT_FID) : 0;
    const followsBot = fid && botFid ? await checkIfFollows(fid, botFid) : false;

    const free   = signals.slice(0, 2);
    const locked = followsBot ? [] : signals.slice(2);
    const bonus  = followsBot ? signals.slice(2) : [];

    return NextResponse.json(
      { free: [...free, ...bonus], locked, total: signals.length, followsBot },
      { headers: NO_STORE }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE });
  }
}
