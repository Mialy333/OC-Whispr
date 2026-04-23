import { NextRequest, NextResponse } from 'next/server';
import { getTopProtocols, getRWAProtocols, getStablecoinData } from '@/lib/api/defillama';
import { analyzeProtocols, generateAlphaWhispr } from '@/lib/agents/orchestrator';
import { publishCast } from '@/lib/api/neynar';
import { recordPublishedCast } from '@/lib/agents/signal-cache';
import { getRedis } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const NO_STORE = { 'Cache-Control': 'no-store' };

function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('x-cron-secret') === secret;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }

  try {
    const [protocols, rwaProtocols, stablecoins] = await Promise.allSettled([
      getTopProtocols(20),
      getRWAProtocols(),
      getStablecoinData(),
    ]);

    const allProtocols = protocols.status === 'fulfilled' ? protocols.value : [];
    const signals = await analyzeProtocols(allProtocols);

    const castText = await generateAlphaWhispr(signals);
    const topSeverity = signals[0]?.severity ?? 'medium';

    const result = await publishCast(castText, topSeverity);
    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 502, headers: NO_STORE }
      );
    }

    if (result.hash) {
      recordPublishedCast(result.hash);
      const redis = await getRedis();
      await Promise.all([
        redis.set('lastCastHash', result.hash),
        redis.set('lastPublished', new Date().toISOString()),
        redis.incr('totalPublished'),
      ]);
    }

    // Pre-warm feed cache so first users after publish get instant load
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim();
    if (appUrl) {
      fetch(`${appUrl}/api/feed`).catch(() => {});
      console.log('[Cache] Feed pre-warmed after publish');
    }

    console.log('[Advisor] Active profiles:', await getRedis().then(r => r.keys('advisor:*')).then(k => k.length).catch(() => 0));

    return NextResponse.json({
      success: true,
      castHash: result.hash,
      signalCount: signals.length,
      timestamp: new Date().toISOString(),
      rwaCount: rwaProtocols.status === 'fulfilled' ? rwaProtocols.value.length : 0,
      stablecoinCount: stablecoins.status === 'fulfilled' ? stablecoins.value.length : 0,
    }, { headers: NO_STORE });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_STORE });
  }
}
