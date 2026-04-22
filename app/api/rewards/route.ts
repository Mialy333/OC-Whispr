import { NextRequest, NextResponse } from 'next/server';
import { getRewardsStatus } from '@/lib/rewards';
import { apiGuard } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

function parseFid(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n >= 1_000_000_000) return null;
  return n;
}

export async function GET(req: NextRequest) {
  const blocked = apiGuard(req);
  if (blocked) return blocked;

  const fid = parseFid(req.nextUrl.searchParams.get('fid'));
  if (!fid) {
    return NextResponse.json({ error: 'Valid fid is required' }, { status: 400 });
  }

  return NextResponse.json(getRewardsStatus(fid), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
