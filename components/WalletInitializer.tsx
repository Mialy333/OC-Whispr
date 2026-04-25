'use client';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect } from 'react';

export default function WalletInitializer() {
  const { ready, authenticated, createWallet, user } = usePrivy();
  const { wallets } = useWallets();

  useEffect(() => {
    if (!ready || !authenticated) return;

    const hasEmbedded = wallets.some(w => w.walletClientType === 'privy');
    const hasLinkedWallet = user?.linkedAccounts?.some(a => a.type === 'wallet');

    if (!hasEmbedded && !hasLinkedWallet) {
      createWallet().catch(e => {
        console.log('Wallet init:', e.message);
      });
    }
  }, [ready, authenticated, wallets.length]);

  return null;
}
