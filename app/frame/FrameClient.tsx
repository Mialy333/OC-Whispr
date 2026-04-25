'use client';

import { useEffect, useState } from 'react';
import sdk from '@farcaster/miniapp-sdk';

export default function FrameClient() {
  const [fid, setFid] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const ctx = await sdk.context;
        if (!cancelled) setFid(ctx?.user?.fid ?? null);
      } catch {
        // no SDK context (browser preview)
      } finally {
        if (!cancelled) {
          // Show content first — then dismiss Warpcast splash
          setReady(true);
          try { await sdk.actions.ready(); } catch { /* */ }
        }
      }
    };

    // Hard cap: show content after 1.5s regardless
    const timeout = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 1500);

    init().finally(() => clearTimeout(timeout));

    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);

  if (!ready) {
    return (
      <div style={{
        background: '#F2ECDF',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#1A1814',
      }}>
        Loading Alpha Whispr...
      </div>
    );
  }

  return (
    <div style={{
      background: '#F2ECDF',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '424px',
      margin: '0 auto',
      overflow: 'hidden',
      fontFamily: 'Georgia, serif',
    }}>
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '24px', color: '#1A1814', margin: 0, marginBottom: 8 }}>
          Alpha Whispr
        </h1>
        <p style={{ fontSize: '12px', fontFamily: 'monospace', color: '#00FF41', margin: 0 }}>
          ● LIVE — FID: {fid ?? 'connecting...'}
        </p>
      </div>
    </div>
  );
}
