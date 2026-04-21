'use client';

import { useState, useEffect } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import ErrorBoundary from '@/components/ErrorBoundary';

const PRIVY_APP_ID = 'cmnx9n2cd00210cl536akk4pe';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
    </main>
  );

  return (
    <ErrorBoundary>
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          loginMethods: ['farcaster', 'wallet'],
          appearance: { theme: 'dark' },
        }}
      >
        {children}
      </PrivyProvider>
    </ErrorBoundary>
  );
}
