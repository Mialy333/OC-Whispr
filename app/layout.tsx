import type { Metadata } from 'next';
import { EB_Garamond, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { checkEnv } from '@/lib/env';
import Providers from './providers';

checkEnv();

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const ibmMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim();

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
    <html lang="en" className={`${ebGaramond.variable} ${ibmMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();` }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
