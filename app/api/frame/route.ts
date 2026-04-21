import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface NeynarValidateResponse {
  valid: boolean;
  action?: {
    interactor?: {
      fid?: number;
    };
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messageBytes: string | undefined = body?.trustedData?.messageBytes;

    if (!messageBytes) {
      return NextResponse.json({ error: 'Missing trustedData.messageBytes' }, { status: 400 });
    }

    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const validateRes = await fetch('https://api.neynar.com/v2/farcaster/frame/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        api_key: apiKey,
      },
      body: JSON.stringify({ message_bytes_in_hex: messageBytes }),
    });

    if (!validateRes.ok) {
      const err = await validateRes.text();
      return NextResponse.json({ error: `Neynar validation failed: ${err}` }, { status: 502 });
    }

    const validated: NeynarValidateResponse = await validateRes.json();

    if (!validated.valid) {
      return NextResponse.json({ error: 'Invalid frame message' }, { status: 403 });
    }

    const fid = validated.action?.interactor?.fid;
    if (!fid) {
      return NextResponse.json({ error: 'Could not extract fid from frame message' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    return NextResponse.redirect(`${appUrl}/frame?fid=${fid}`, 302);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
