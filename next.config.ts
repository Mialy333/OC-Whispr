import type { NextConfig } from 'next';

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.privy.io https://*.walletconnect.com https://*.farcaster.xyz",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.privy.io https://auth.privy.io https://*.walletconnect.com https://explorer-api.walletconnect.com https://*.base.org https://mainnet.base.org https://api.mainnet.base.org https://api.neynar.com https://*.neynar.com https://ph.neynar.com https://api.llama.fi https://stablecoins.llama.fi https://api.coingecko.com https://openrouter.ai https://*.farcaster.xyz https://privy.farcaster.xyz wss://*.walletconnect.com wss://*.pusher.com",
  "frame-src 'self' https://*.privy.io https://auth.privy.io https://*.walletconnect.com https://*.farcaster.xyz",
  "frame-ancestors 'self' https://*.privy.io https://auth.privy.io https://*.farcaster.xyz https://warpcast.com",
  "worker-src 'self' blob:",
].join('; ');

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
          { key: 'Content-Security-Policy', value: csp },
          {
            key: 'Permissions-Policy',
            value: 'fullscreen=(self "https://auth.privy.io"), camera=(), microphone=()',
          },
        ],
      },
      // Must come LAST so frame-ancestors * overrides the global csp for /frame
      {
        source: '/frame',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: 'frame-ancestors *;' },
        ],
      },
    ];
  },
};

export default nextConfig;
