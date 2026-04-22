'use client';

import { usePathname, useRouter } from 'next/navigation';
import { SA } from '@/components/ui';

const TABS = [
  { id: 'feed',     label: 'FEED',    icon: '▤', href: '/'          },
  { id: 'signals',  label: 'SIGNALS', icon: '◈', href: '/signal'    },
  { id: 'settings', label: 'PROFILE', icon: '◉', href: '/settings'  },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide on the Farcaster frame route
  if (pathname.startsWith('/frame')) return null;

  const activeId =
    pathname.startsWith('/settings')     ? 'settings' :
    pathname.startsWith('/signal')        ? 'signals'  :
    pathname.startsWith('/onboarding')    ? 'feed'     :
    'feed';

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 48, zIndex: 100,
      backgroundColor: 'var(--bg-primary)',
      borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'stretch',
      fontFamily: SA.mono,
    }}>
      {TABS.map((tab) => {
        const active = activeId === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => router.push(tab.href)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 2,
              background: 'transparent', border: 'none', cursor: 'pointer',
              position: 'relative', paddingBottom: 2,
              color: active ? 'var(--accent-phosphore)' : 'var(--text-muted)',
            }}
          >
            {/* Active indicator bar */}
            {active && (
              <div style={{
                position: 'absolute', top: 0, left: '20%', right: '20%',
                height: 2, backgroundColor: 'var(--accent-phosphore)',
              }} />
            )}
            <span style={{ fontSize: 14, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{
              fontSize: 10, letterSpacing: '0.1em', fontWeight: 700,
              color: active ? 'var(--accent-phosphore)' : 'var(--text-muted)',
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
