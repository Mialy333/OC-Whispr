import type { NextConfig } from 'next';

// CSP is set per-route in middleware.ts so /frame can use frame-ancestors *
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
            key: 'Permissions-Policy',
            value: 'fullscreen=(self "https://auth.privy.io"), camera=(), microphone=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
