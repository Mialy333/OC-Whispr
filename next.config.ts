import type { NextConfig } from 'next';

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
          {
            key: 'Content-Security-Policy',
            value: [
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.privy.io https://*.walletconnect.com https://*.walletconnect.org",
              "frame-src 'self' https://auth.privy.io https://*.privy.io https://*.walletconnect.com https://*.walletconnect.org",
              "connect-src 'self' https://*.privy.io https://api.privy.io wss://*.walletconnect.com wss://*.walletconnect.org https://*.walletconnect.com https://*.walletconnect.org https://api.llama.fi https://openrouter.ai https://api.neynar.com",
              "img-src 'self' data: https: blob:",
            ].join('; '),
          },
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
