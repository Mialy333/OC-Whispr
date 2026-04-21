'use client';

import { PrivyProvider } from '@privy-io/react-auth';

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) throw new Error('NEXT_PUBLIC_PRIVY_APP_ID is not set');

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['farcaster', 'wallet'],
        appearance: { theme: 'dark' },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
