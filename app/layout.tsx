import type { Metadata, Viewport } from 'next';
import { EB_Garamond, IBM_Plex_Mono, Playfair_Display } from 'next/font/google';
import './globals.css';
import { checkEnv } from '@/lib/env';
import Providers from './providers';
import BottomNav from '@/components/BottomNav';

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

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-playfair',
  display: 'swap',
});

const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim();

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Alpha Whispr',
  description: 'Your daily TradFi/DeFi intelligence briefing, powered by AI on Farcaster',
  openGraph: {
    title: 'Alpha Whispr',
    description: 'AI agent monitoring DeFi, RWA & Stablecoin protocols 24/7',
  },
  other: {
    'fc:frame': JSON.stringify({
      version: 'next',
      imageUrl: `${appUrl}/og-image.png`,
      button: {
        title: 'Open Alpha Whispr',
        action: {
          type: 'launch_frame',
          name: 'Alpha Whispr',
          url: `${appUrl}/frame`,
          splashImageUrl: `${appUrl}/splash.png`,
          splashBackgroundColor: '#F2ECDF',
        },
      },
    }),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ebGaramond.variable} ${ibmMono.variable} ${playfair.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();` }} />
      </head>
      <body style={{ paddingBottom: 'calc(48px + env(safe-area-inset-bottom, 0px))' }}>
        <Providers>{children}</Providers>
        <BottomNav />
      </body>
    </html>
  );
}
