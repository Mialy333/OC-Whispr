import type { NextConfig } from 'next';

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self' data: https:;
  connect-src 'self'
    https://*.privy.io
    https://auth.privy.io
    https://*.walletconnect.com
    https://explorer-api.walletconnect.com
    https://*.base.org
    https://mainnet.base.org
    https://api.neynar.com
    https://*.neynar.com
    https://ph.neynar.com
    https://api.llama.fi
    https://stablecoins.llama.fi
    https://api.coingecko.com
    https://openrouter.ai
    https://*.farcaster.xyz
    https://privy.farcaster.xyz
    wss://*.walletconnect.com
    wss://*.pusher.com;
  frame-src
    'self'
    https://*.privy.io
    https://auth.privy.io
    https://*.walletconnect.com
    https://*.farcaster.xyz
    https://verify.walletconnect.com;
  frame-ancestors
    'self'
    https://warpcast.com
    https://*.farcaster.xyz;
  worker-src 'self' blob:;
`.replace(/\s+/g, ' ').trim();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/.well-known/farcaster.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspHeader },
          {
            key: 'Permissions-Policy',
            value: 'fullscreen=(self "https://auth.privy.io"), camera=(), microphone=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
