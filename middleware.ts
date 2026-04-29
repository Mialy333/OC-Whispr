import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BASE_CSP = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self' data: https:;
  connect-src 'self'
    https://*.privy.io https://auth.privy.io
    https://*.walletconnect.com https://explorer-api.walletconnect.com
    https://*.base.org https://mainnet.base.org
    https://api.neynar.com https://*.neynar.com https://ph.neynar.com
    https://api.llama.fi https://stablecoins.llama.fi
    https://api.coingecko.com https://openrouter.ai
    https://*.farcaster.xyz https://privy.farcaster.xyz
    wss://*.walletconnect.com wss://*.pusher.com;
  frame-src
    'self'
    https://*.privy.io https://auth.privy.io
    https://*.walletconnect.com https://verify.walletconnect.com
    https://*.farcaster.xyz;
  worker-src 'self' blob:;
`.replace(/\s+/g, ' ').trim();

// /frame must be embeddable by any Farcaster client (Warpcast, etc.)
const FRAME_CSP = `${BASE_CSP} frame-ancestors *;`;

// All other routes restrict embedding
const APP_CSP = `${BASE_CSP} frame-ancestors 'self' https://warpcast.com https://*.farcaster.xyz;`;

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const isFrame = request.nextUrl.pathname === '/frame' || request.nextUrl.pathname.startsWith('/frame/');
  response.headers.set('Content-Security-Policy', isFrame ? FRAME_CSP : APP_CSP);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)'],
};
