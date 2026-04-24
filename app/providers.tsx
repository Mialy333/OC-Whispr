'use client';

import { useState, useEffect } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { base } from 'viem/chains';
import ErrorBoundary from '@/components/ErrorBoundary';

const PRIVY_APP_ID = 'cmnx9n2cd00210cl536akk4pe';

// SA-consistent loading shell — matches paper background so the mount flash
// is invisible rather than a jarring dark → light transition.
function LoadingShell() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#F2ECDF',
    }}>
      <span style={{
        fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
        fontSize: 11, letterSpacing: '0.12em', color: '#7A7364',
      }}>
        LOADING<span style={{ animation: 'sa-blink 1s infinite' }}>_</span>
      </span>
    </div>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <LoadingShell />;

  return (
    <ErrorBoundary>
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          loginMethods: ['farcaster', 'wallet'],
          defaultChain: base,
          supportedChains: [base],
          embeddedWallets: {
            createOnLogin: 'users-without-wallets',
          },
          appearance: {
            theme: 'light',
            accentColor: '#3E6FA8',
            logo: 'https://farhack2026.vercel.app/icon.png',
          },
        }}
      >
        {children}
      </PrivyProvider>
    </ErrorBoundary>
  );
}
