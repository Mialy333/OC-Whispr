import type { Metadata } from 'next';
import './globals.css';
import { checkEnv } from '@/lib/env';

checkEnv();

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

export const metadata: Metadata = {
  title: 'Stream Alpha',
  description: 'Personalized Web3/DeFi alpha feed, curated by AI',
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': `${appUrl}/frame/opengraph-image`,
    'fc:frame:button:1': 'Open Alpha Feed',
    'fc:frame:post_url': `${appUrl}/api/frame`,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
