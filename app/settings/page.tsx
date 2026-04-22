'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import {
  SA, NavBar, PButton, RainbowStripes,
  Toggle, Segmented,
} from '@/components/ui';
import RewardsCard from '@/components/RewardsCard';
import DonateButton from '@/components/DonateButton';

const mono = { fontFamily: SA.mono } as const;
const serif = { fontFamily: SA.serif } as const;

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark');
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  };
  return [dark, toggle] as const;
}

export default function SettingsPage() {
  const { user, logout } = usePrivy();
  const router = useRouter();
  const [dark, toggleDark] = useDark();

  // Preferences state
  const [notif,   setNotif]   = useState(true);
  const [sound,   setSound]   = useState(false);
  const [sev,     setSev]     = useState('MEDIUM');
  const [freq,    setFreq]    = useState(60);
  const [boosted, setBoosted] = useState(true);
  const [font,    setFont]    = useState('Serif');

  const handle = user?.farcaster?.username ? `@${user.farcaster.username}` : (user ? '@you.eth' : null);
  const fid    = user?.farcaster?.fid ?? null;
  const wallet = user?.wallet?.address
    ? `${user.wallet.address.slice(0, 6)}…${user.wallet.address.slice(-4)}`
    : '—';

  const paper      = dark ? SA.ink       : SA.paper;
  const inkC       = dark ? SA.paperDeep : SA.ink;
  const panel      = dark ? '#1A1814'    : 'var(--bg-main)';
  const panelBorder = dark ? '#332E22'   : 'rgba(26,24,20,0.12)';
  const ruleC      = dark ? '#332E22'    : SA.rule;

  function PrefRow({ label, right, last }: { label: string; right: React.ReactNode; last?: boolean }) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
        borderBottom: last ? 'none' : `0.5px solid ${ruleC}`,
        ...serif, fontSize: 13, color: inkC, minHeight: 38,
      }}>
        <span style={{ flex: 1 }}>{label}</span>
        {right}
      </div>
    );
  }

  function SecHeader({ children }: { children: string }) {
    return (
      <div style={{
        padding: '14px 14px 4px',
        ...mono, fontSize: 9, fontWeight: 700, letterSpacing: 2,
        color: dark ? SA.ash : SA.graphite, textTransform: 'uppercase',
      }}>{children}</div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="sa-outer" style={{ backgroundColor: '#1A1814' }}>
      <div className="sa-frame-shell" style={{
        height: 'auto', minHeight: '100dvh',
        backgroundColor: paper,
        fontFamily: SA.serif, color: inkC,
      }}>
        <NavBar
          title="Preferences"
          onBack={() => router.push('/')}
          dark={dark}
          right={<RainbowStripes h={10} w={18} />}
        />

        <div style={{ padding: '8px 14px 32px', backgroundColor: paper }}>

          {/* Identity card */}
          {handle ? (
            <div style={{
              background: panel, border: `1px solid ${panelBorder}`,
              padding: 14, display: 'flex', gap: 12, alignItems: 'center', marginTop: 6,
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 23, flexShrink: 0,
                background: `linear-gradient(135deg, ${SA.aqua}, ${SA.aquaDeep})`,
                border: `1px solid ${SA.ink}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', ...serif, fontSize: 20, fontWeight: 600,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,.4)`,
              }}>
                {handle.charAt(1).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...serif, fontSize: 16, fontWeight: 500, color: inkC, letterSpacing: -0.2 }}>{handle}</div>
                <div style={{ ...mono, fontSize: 9.5, color: SA.ash, letterSpacing: 0.6 }}>
                  {fid ? `FID ${fid} · ` : ''}{wallet}
                </div>
              </div>
              <PButton small onClick={handleLogout}>Sign out</PButton>
            </div>
          ) : (
            <div style={{
              background: panel, border: `1px solid ${panelBorder}`,
              padding: 14, marginTop: 6, display: 'flex', gap: 12, alignItems: 'center',
            }}>
              <div style={{ flex: 1, ...serif, fontSize: 14, color: SA.ash, fontStyle: 'italic' }}>Not connected</div>
              <PButton primary small onClick={() => router.push('/onboarding')}>Connect →</PButton>
            </div>
          )}

          <SecHeader>Notifications</SecHeader>
          <div style={{ background: panel, border: `1px solid ${panelBorder}` }}>
            <PrefRow label="Push notifications" right={<Toggle on={notif} onClick={() => setNotif(!notif)} />} />
            <PrefRow label="Minimum severity"   right={<Segmented options={['LOW', 'MEDIUM', 'HIGH']} value={sev} onChange={setSev} />} />
            <PrefRow label="Cast frequency" right={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="range" min={15} max={240} value={freq} onChange={(e) => setFreq(+e.target.value)}
                  style={{ width: 80, accentColor: SA.aqua }} />
                <span style={{ ...mono, fontSize: 10, color: SA.ash, minWidth: 32 }}>{freq}m</span>
              </div>
            } />
            <PrefRow label="Alert sound" right={<Toggle on={sound} onClick={() => setSound(!sound)} />} last />
          </div>

          <SecHeader>Curation</SecHeader>
          <div style={{ background: panel, border: `1px solid ${panelBorder}` }}>
            <PrefRow label="Boost network signals" right={<Toggle on={boosted} onClick={() => setBoosted(!boosted)} />} />
            <PrefRow label="Sources" right={<span style={{ ...mono, fontSize: 10, color: SA.ash }}>3 active ›</span>} />
            <PrefRow label="Follow list" right={<span style={{ ...mono, fontSize: 10, color: SA.ash }}>follows ›</span>} last />
          </div>

          <SecHeader>Appearance</SecHeader>
          <div style={{ background: panel, border: `1px solid ${panelBorder}` }}>
            <PrefRow label="Dark mode"   right={<Toggle on={dark} onClick={toggleDark} />} />
            <PrefRow label="Typography"  right={<Segmented options={['Serif', 'Mono', 'Mix']} value={font} onChange={setFont} />} last />
          </div>

          <SecHeader>Wallet</SecHeader>
          <div style={{ background: panel, border: `1px solid ${panelBorder}` }}>
            <PrefRow label="Connected address" right={
              <span style={{ ...mono, fontSize: 10, color: SA.ash }}>{wallet}</span>
            } />
            <PrefRow label="Network" right={<span style={{ ...mono, fontSize: 10, color: SA.ash }}>Base</span>} last />
          </div>

          <SecHeader>Rewards</SecHeader>
          <RewardsCard
            fid={fid}
            dark={dark}
            panel={panel}
            panelBorder={panelBorder}
            inkC={inkC}
          />

          <SecHeader>About</SecHeader>
          <div style={{ background: panel, border: `1px solid ${panelBorder}`, padding: '12px 14px' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <RainbowStripes h={18} w={38} />
              <div style={{ flex: 1 }}>
                <div style={{ ...serif, fontSize: 15, fontStyle: 'italic', color: inkC, letterSpacing: -0.2 }}>Stream Alpha</div>
                <div style={{ ...mono, fontSize: 9, color: SA.ash, letterSpacing: 0.8 }}>v1.0.0 · BUILD 260422 · © 2026</div>
              </div>
            </div>
            <p style={{
              margin: '10px 0 0', ...serif, fontSize: 10.5, lineHeight: 1.4,
              color: dark ? SA.ash : SA.graphite, fontStyle: 'italic',
            }}>
              &ldquo;Signal in, noise out. Think Different about your feed.&rdquo;
            </p>
          </div>

          <div style={{ marginTop: 16 }}>
            <DonateButton dark={dark} />
          </div>

        </div>
      </div>
    </div>
  );
}
