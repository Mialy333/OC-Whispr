import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

interface VerifyBody {
  fid: number;
  signalId: string;
  keyword: string;
}

interface NeynarCast {
  hash: string;
  text: string;
  author: { fid: number };
}

interface NeynarFeedResponse {
  casts: NeynarCast[];
}

export async function POST(req: NextRequest) {
  const blocked = apiGuard(req);
  if (blocked) return blocked;

  try {
    const body: VerifyBody = await req.json();
    const { fid, keyword } = body;

    if (!fid || !keyword) {
      return NextResponse.json({ error: 'fid and keyword are required' }, { status: 400 });
    }

    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const neynarRes = await fetch(
      `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${fid}&limit=5`,
      {
        headers: { api_key: apiKey },
        next: { revalidate: 0 },
      }
    );

    if (!neynarRes.ok) {
      const err = await neynarRes.text();
      return NextResponse.json({ error: `Neynar error: ${err}` }, { status: 502 });
    }

    const data: NeynarFeedResponse = await neynarRes.json();
    const keywordLower = keyword.toLowerCase();

    const match = data.casts?.find(
      (cast) =>
        cast.author?.fid === fid &&
        cast.text?.toLowerCase().includes(keywordLower)
    );

    if (match) {
      return NextResponse.json({ verified: true, castHash: match.hash });
    }

    return NextResponse.json({ verified: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
