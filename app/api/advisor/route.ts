import { NextRequest, NextResponse } from 'next/server';
import { getYieldAdvice } from '@/lib/agents/yieldAgent';
import { getRedis } from '@/lib/redis';
import type { UserProfile, AdvisorResponse } from '@/types/advisor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let profile: UserProfile;
  try {
    profile = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validRisks = ['conservative', 'moderate', 'degen'];
  const validPrefs = ['stablecoin', 'rwa', 'defi', 'staking'];

  if (!profile.riskTolerance || !profile.capitalUsd || !profile.preferredAssets?.length || !profile.timeHorizon) {
    return NextResponse.json(
      { error: 'Missing required fields: riskTolerance, capitalUsd, preferredAssets, timeHorizon' },
      { status: 400 },
    );
  }

  if (
    !validRisks.includes(profile.riskTolerance) ||
    !profile.preferredAssets.every((a) => validPrefs.includes(a))
  ) {
    return NextResponse.json({ error: 'Invalid profile values' }, { status: 400 });
  }

  let advice;
  try {
    advice = await getYieldAdvice(profile);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[advisor] getYieldAdvice failed:', msg);
    return NextResponse.json(
      { error: 'Advisor unavailable — check OPENROUTER_API_KEY', detail: msg },
      { status: 503 },
    );
  }

  if (!advice?.length) {
    return NextResponse.json(
      { error: 'No advice generated — LLM returned empty response' },
      { status: 502 },
    );
  }

  const fid = profile.fid ? String(profile.fid) : 'anon';
  const response: AdvisorResponse = {
    fid,
    profile,
    advice,
    generatedAt: new Date().toISOString(),
  };

  try {
    const redis = await getRedis();
    await redis.set(
      `advisor:${fid}:${Date.now()}`,
      JSON.stringify(response),
      { EX: 60 * 60 * 24 * 7 },
    );
  } catch (e) {
    console.warn('[advisor] KV write failed:', e);
  }

  return NextResponse.json(response);
}
