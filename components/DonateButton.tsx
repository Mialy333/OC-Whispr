'use client';

import sdk from '@farcaster/miniapp-sdk';
import { SA } from '@/components/ui';

interface Props {
  dark?: boolean;
}

const DONATION_ADDRESS = process.env.NEXT_PUBLIC_DONATION_ADDRESS ?? '';

export default function DonateButton({ dark = false }: Props) {
  const handleDonate = async () => {
    if (!DONATION_ADDRESS) return;

    // Try Warpcast tip URL; fall back to Base pay deep link
    const warpcastTip = `https://warpcast.com/~/tip?address=${DONATION_ADDRESS}`;

    try {
      const ctx = await sdk.context;
      if (ctx !== null) {
        await sdk.actions.openUrl(warpcastTip);
      } else {
        window.open(warpcastTip, '_blank', 'noopener,noreferrer');
      }
    } catch {
      window.open(warpcastTip, '_blank', 'noopener,noreferrer');
    }
  };

  if (!DONATION_ADDRESS) return null;

  return (
    <button
      onClick={handleDonate}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '10px 14px',
        background: 'transparent',
        border: `1px solid ${dark ? '#332E22' : SA.platinumLo}`,
        cursor: 'pointer',
        fontFamily: SA.mono, fontSize: 10, fontWeight: 700,
        letterSpacing: 1, textTransform: 'uppercase',
        color: SA.phosphorGlow,
        transition: 'border-color 0.15s, color 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = SA.phosphorGlow;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = dark ? '#332E22' : SA.platinumLo;
      }}
    >
      <span style={{ fontSize: 12 }}>♡</span>
      Support Stream Alpha
    </button>
  );
}
