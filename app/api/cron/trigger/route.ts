import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('x-cron-secret') === secret;
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim();
  if (!appUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL not set' }, { status: 500, headers: NO_STORE });
  }

  const cronRes = await fetch(`${appUrl}/api/cron/morning-whispr`, {
    headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '' },
  });

  const data = await cronRes.json();
  return NextResponse.json(data, { status: cronRes.status, headers: NO_STORE });
}
