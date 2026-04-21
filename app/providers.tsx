'use client';

import { useState, useEffect } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';

const PRIVY_APP_ID = 'cmnx9n2cd00210cl536akk4pe';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <>{children}</>;

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['farcaster', 'wallet'],
        appearance: { theme: 'dark' },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
