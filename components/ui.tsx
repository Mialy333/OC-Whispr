'use client';

import React from 'react';

// ─── SA Design Tokens ───────────────────────────────────────────────────────
export const SA = {
  paper:         '#F2ECDF',
  paperDeep:     '#E8DFCC',
  platinum:      '#E4DCC8',
  platinumHi:    '#F5EFE2',
  platinumLo:    '#C9BFA6',
  rule:          '#9E9378',
  ink:           '#1A1814',
  graphite:      '#3C3830',
  ash:           '#7A7364',
  phosphor:      '#1E7A3A',
  phosphorGlow:  '#2AA84B',
  aqua:          '#3E6FA8',
  aquaDeep:      '#2A4F82',
  amber:         '#B0701C',
  rust:          '#A83A26',
  terminal:      '#0C1A0C',
  terminalGreen: '#5BE36A',
  serif: 'var(--font-display), "EB Garamond", "Hoefler Text", Georgia, serif',
  mono:  'var(--font-mono), "IBM Plex Mono", "SF Mono", ui-monospace, monospace',
  sans:  '"Inter", -apple-system, "Helvetica Neue", Arial, sans-serif',
} as const;

export const FRAME_W = 424;
export const FRAME_H = 695;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Deterministic sparkline data from a string seed */
export function seededChart(id: string): number[] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return Array.from({ length: 24 }, () => {
    h = ((h * 1664525 + 1013904223) | 0) & 0xffff;
    return 20 + (h % 80);
  });
}

// ─── Components ─────────────────────────────────────────────────────────────

interface TitleBarProps {
  title: React.ReactNode;
  right?: React.ReactNode;
  lights?: boolean;
  dark?: boolean;
}

export function TitleBar({ title, right, lights = true, dark = false }: TitleBarProps) {
  const bg = dark
    ? '#1F1B15'
    : `repeating-linear-gradient(180deg, ${SA.platinumHi} 0 1px, ${SA.platinum} 1px 2px)`;
  return (
    <div style={{
      height: 28, display: 'flex', alignItems: 'center', gap: 8,
      padding: '0 10px',
      background: bg,
      borderBottom: `1px solid ${dark ? '#332E22' : SA.platinumLo}`,
      boxShadow: dark ? 'none' : `inset 0 -1px 0 ${SA.platinumHi}, inset 0 1px 0 ${SA.platinumHi}`,
      fontFamily: SA.sans, fontSize: 11, color: dark ? SA.paperDeep : SA.graphite,
      flexShrink: 0,
    }}>
      {lights && (
        <div style={{ display: 'flex', gap: 5 }}>
          {(['#EC6A5F', '#F5BF4F', '#62C554'] as const).map((c, i) => (
            <span key={i} style={{
              width: 11, height: 11, borderRadius: 11,
              background: `radial-gradient(circle at 30% 30%, #fff, ${c} 70%)`,
              border: '0.5px solid rgba(0,0,0,.3)',
              boxShadow: 'inset 0 -1px 1px rgba(0,0,0,.2)',
              display: 'inline-block',
            }} />
          ))}
        </div>
      )}
      <div style={{ flex: 1, textAlign: 'center', letterSpacing: 0.2, fontWeight: 600 }}>
        {title}
      </div>
      {right && (
        <div style={{ fontFamily: SA.mono, fontSize: 9.5, color: SA.ash }}>
          {right}
        </div>
      )}
    </div>
  );
}

interface PButtonProps {
  children: React.ReactNode;
  primary?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  small?: boolean;
  disabled?: boolean;
}

export function PButton({ children, primary, onClick, style, small, disabled }: PButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        appearance: 'none',
        border: primary
          ? `1px solid ${SA.aquaDeep}`
          : '1px solid var(--border)',
        background: primary
          ? `linear-gradient(180deg, #6E9BD0 0%, ${SA.aqua} 55%, ${SA.aquaDeep} 100%)`
          : 'var(--bg-secondary)',
        color: primary ? '#fff' : 'var(--text-primary)',
        fontFamily: SA.sans, fontWeight: 600, fontSize: small ? 10 : 11,
        letterSpacing: primary ? 0.3 : 0.1,
        padding: small ? '3px 10px' : '5px 14px',
        borderRadius: 12,
        boxShadow: primary ? `inset 0 1px 0 rgba(255,255,255,.5), 0 1px 1px rgba(0,0,0,.08)` : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textShadow: primary ? '0 -1px 0 rgba(0,0,0,.25)' : 'none',
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function RainbowStripes({ h = 14, w = 28 }: { h?: number; w?: number }) {
  const stripes = [SA.phosphor, '#F5D047', '#E89E3A', '#C33E38', '#8A3DA0', '#3E72B0'];
  return (
    <div style={{ display: 'flex', height: h, width: w, borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
      {stripes.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
    </div>
  );
}

interface SparklineProps {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
  fill?: boolean;
}

export function Sparkline({ data, w = 72, h = 22, color = SA.phosphorGlow, fill = true }: SparklineProps) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={w} height={h} style={{ display: 'block', flexShrink: 0 }}>
      {fill && (
        <polyline
          points={`0,${h} ${pts.join(' ')} ${w},${h}`}
          fill={color} fillOpacity={0.15} stroke="none"
        />
      )}
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

interface AreaChartProps {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
}

export function AreaChart({ data, w = 388, h = 110, color = SA.phosphor }: AreaChartProps) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return [x, y] as [number, number];
  });
  const linePath = pts.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ');
  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="ac-g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <line key={p} x1="0" x2={w} y1={h * p} y2={h * p} stroke={SA.rule} strokeWidth="0.5" strokeDasharray="2 3" opacity="0.5" />
      ))}
      <path d={areaPath} fill="url(#ac-g)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" />
      {pts.slice(-1).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={SA.phosphorGlow} stroke={SA.paper} strokeWidth="1" />
      ))}
    </svg>
  );
}

export function SeverityChip({ level }: { level: 'high' | 'medium' | 'low' }) {
  const map = {
    high:   { label: 'HIGH',   c: SA.rust  },
    medium: { label: 'MEDIUM', c: SA.amber },
    low:    { label: 'LOW',    c: SA.phosphor },
  };
  const { label, c } = map[level];
  return (
    <span style={{
      fontFamily: SA.mono, fontSize: 8.5, letterSpacing: 1.2, fontWeight: 700,
      color: c, border: `1px solid ${c}`, padding: '1px 5px',
      textTransform: 'uppercase', flexShrink: 0,
    }}>{label}</span>
  );
}

export function StatusBar({ dark = false }: { dark?: boolean }) {
  const c = dark ? SA.paperDeep : SA.ink;
  return (
    <div style={{
      height: 22, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px',
      fontFamily: SA.sans, fontSize: 11, fontWeight: 600, color: c,
    }}>
      <span>9:41</span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <svg width="14" height="9" viewBox="0 0 14 9">
          <g fill={c}>
            <rect x="0" y="6" width="2" height="3" />
            <rect x="3" y="4" width="2" height="5" />
            <rect x="6" y="2" width="2" height="7" />
            <rect x="9" y="0" width="2" height="9" />
          </g>
        </svg>
        <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke={c}>
          <rect x="0.5" y="0.5" width="18" height="9" rx="2" />
          <rect x="2" y="2" width="14" height="6" fill={c} />
          <rect x="19.5" y="3" width="1.5" height="4" fill={c} />
        </svg>
      </div>
    </div>
  );
}

export function Ticker({ items }: { items: string[] }) {
  return (
    <div style={{
      height: 22, flexShrink: 0, overflow: 'hidden',
      background: SA.terminal, color: SA.terminalGreen,
      fontFamily: SA.mono, fontSize: 10, letterSpacing: 0.6,
      display: 'flex', alignItems: 'center',
      borderTop: `1px solid ${SA.ink}`,
    }}>
      <div style={{
        flexShrink: 0, padding: '0 10px',
        background: SA.phosphor, color: SA.paper,
        height: '100%', display: 'flex', alignItems: 'center',
        fontWeight: 700, fontSize: 10,
      }}>
        LIVE
      </div>
      <div style={{
        display: 'flex', gap: 28, paddingLeft: 14,
        animation: 'sa-marquee 42s linear infinite',
        whiteSpace: 'nowrap',
      }}>
        {[...items, ...items].map((t, i) => <span key={i}>▲ {t}</span>)}
      </div>
    </div>
  );
}

interface TabBarProps {
  active: 'feed' | 'leaderboard' | 'alerts' | 'settings';
  onNavigate: (tab: 'feed' | 'leaderboard' | 'alerts' | 'settings') => void;
  dark?: boolean;
}

export function TabBar({ active, onNavigate, dark = false }: TabBarProps) {
  const tabs = [
    { id: 'feed'        as const, label: 'Feed',    icon: '▤' },
    { id: 'leaderboard' as const, label: 'Leaders', icon: '♛' },
    { id: 'alerts'      as const, label: 'Alerts',  icon: '♪' },
    { id: 'settings'    as const, label: 'Profile', icon: '◉' },
  ];
  return (
    <div style={{
      height: 40, flexShrink: 0,
      background: dark ? '#1F1B15' : `linear-gradient(180deg, ${SA.platinumHi} 0%, ${SA.platinum} 100%)`,
      borderTop: `1px solid ${dark ? '#332E22' : SA.platinumLo}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '0 8px',
    }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onNavigate(t.id)}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
            padding: '4px 12px',
            fontFamily: SA.sans, fontSize: 9, fontWeight: 600, letterSpacing: 0.3,
            color: active === t.id ? 'var(--accent-phosphore)' : 'var(--text-muted)',
          }}
        >
          <span style={{ fontSize: 13, lineHeight: 1 }}>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export function NavBar({
  title, onBack, right, dark = false,
}: {
  title: React.ReactNode;
  onBack?: () => void;
  right?: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div style={{
      height: 32, flexShrink: 0,
      background: dark ? '#1F1B15' : `linear-gradient(180deg, ${SA.platinumHi} 0%, ${SA.platinum} 100%)`,
      borderBottom: `1px solid ${dark ? '#332E22' : SA.platinumLo}`,
      display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px',
      fontFamily: SA.sans, fontSize: 11, color: dark ? SA.paperDeep : SA.ink,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          border: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          padding: '2px 9px', borderRadius: 10, cursor: 'pointer',
          fontFamily: SA.sans, fontSize: 11, color: 'var(--text-primary)',
        }}>‹ Back</button>
      )}
      <span style={{
        flex: 1, textAlign: 'center', fontWeight: 600,
        fontFamily: SA.serif, fontSize: 13,
        color: dark ? SA.paperDeep : SA.ink,
      }}>{title}</span>
      {right}
    </div>
  );
}

export function UnlockingSplash() {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60,
      background: SA.terminal, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: SA.mono, color: SA.terminalGreen,
    }}>
      <div style={{ fontSize: 10, letterSpacing: 3, marginBottom: 14, opacity: 0.6 }}>▲ VERIFYING CAST</div>
      <div style={{ fontSize: 11, letterSpacing: 1.5 }}>
        {'>'} warpcast.api.reachout
        <span style={{ animation: 'sa-blink 0.6s infinite' }}>█</span>
      </div>
      <div style={{ marginTop: 18, display: 'flex', gap: 3 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            width: 8, height: 14, background: SA.terminalGreen,
            animation: `sa-bar 0.9s ${i * 0.1}s infinite`,
            opacity: 0.85,
          }} />
        ))}
      </div>
      <div style={{ marginTop: 28, fontSize: 9, letterSpacing: 2, opacity: 0.5 }}>
        SIGNAL WILL DECRYPT IN 00:03
      </div>
    </div>
  );
}

// Accuracy bar for leaderboard
export function AccuracyBar({ value, w = 56 }: { value: number; w?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: w, height: 6, background: SA.platinumLo,
        position: 'relative', border: `0.5px solid ${SA.rule}`,
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${value}%`,
          background: `linear-gradient(90deg, ${SA.phosphor}, ${SA.phosphorGlow})`,
        }} />
      </div>
      <span style={{ fontFamily: SA.mono, fontSize: 9, color: SA.graphite, letterSpacing: 0.4, minWidth: 20 }}>{value}%</span>
    </div>
  );
}

// Mac Aqua toggle
export function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: 36, height: 20, borderRadius: 10,
      border: `1px solid ${on ? SA.aquaDeep : SA.platinumLo}`,
      background: on
        ? `linear-gradient(180deg, #6E9BD0, ${SA.aquaDeep})`
        : `linear-gradient(180deg, ${SA.platinumLo}, ${SA.rule})`,
      cursor: 'pointer', position: 'relative', padding: 0,
      boxShadow: `inset 0 1px 1px rgba(0,0,0,.2)`,
      flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 1, left: on ? 17 : 1,
        width: 16, height: 16, borderRadius: 8,
        background: `radial-gradient(circle at 30% 30%, #fff, ${SA.platinumHi} 70%, ${SA.platinumLo})`,
        border: `0.5px solid ${SA.rule}`,
        boxShadow: `0 1px 2px rgba(0,0,0,.25)`,
        transition: 'left .18s',
      }} />
    </button>
  );
}

// Segmented control
export function Segmented({
  options, value, onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', border: `1px solid ${SA.platinumLo}`, borderRadius: 10, overflow: 'hidden' }}>
      {options.map((o, i) => (
        <button key={o} onClick={() => onChange(o)} style={{
          background: value === o
            ? `linear-gradient(180deg, ${SA.aqua}, ${SA.aquaDeep})`
            : `linear-gradient(180deg, ${SA.platinumHi}, ${SA.platinum})`,
          color: value === o ? '#fff' : SA.ink,
          border: 'none',
          borderLeft: i > 0 ? `0.5px solid ${SA.platinumLo}` : 'none',
          padding: '3px 9px',
          fontFamily: SA.sans, fontSize: 10, fontWeight: 600, letterSpacing: 0.3,
          cursor: 'pointer',
          textShadow: value === o ? '0 -1px 0 rgba(0,0,0,.2)' : 'none',
        }}>{o}</button>
      ))}
    </div>
  );
}
