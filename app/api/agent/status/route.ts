import { NextResponse } from 'next/server';
import { getStatus } from '@/lib/agents/signal-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getStatus(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
