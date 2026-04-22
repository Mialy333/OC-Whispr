import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const FAKE_SIGNALS = [
  { label: 'HIGH', color: '#f87171', protocol: 'Aave', data: 'TVL +38% in 24h', title: 'Unusual TVL surge detected' },
  { label: 'MED',  color: '#fbbf24', protocol: 'Ethena', data: 'Revenue +61% in 24h', title: 'Fee revenue spike on sUSDe' },
  { label: 'LOW',  color: '#60a5fa', protocol: 'Sky',    data: 'USDS peg 0.9991',     title: 'Stablecoin peg within range' },
];

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#09090b',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '64px',
          gap: '80px',
          fontFamily: 'monospace',
        }}
      >
        {/* Left — branding */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: '0 0 420px', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '52px' }}>🔍</span>
            <span style={{ fontSize: '52px', fontWeight: 700, color: '#f4f4f5', letterSpacing: '-1px' }}>
              Morning Whispr
            </span>
          </div>
          <p style={{ fontSize: '22px', color: '#a1a1aa', margin: 0, lineHeight: 1.5 }}>
            TradFi/DeFi Intelligence<br />Daily at 8:00 UTC
          </p>
          <div
            style={{
              marginTop: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#7c3aed',
              borderRadius: '12px',
              padding: '14px 28px',
              width: 'fit-content',
            }}
          >
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>
              Connect on Farcaster
            </span>
          </div>
        </div>

        {/* Right — signal preview */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '16px' }}>
          {FAKE_SIGNALS.map((s) => (
            <div
              key={s.protocol}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                background: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '12px',
                padding: '16px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  defillama · {s.protocol}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: s.color,
                    background: s.color + '22',
                    border: `1px solid ${s.color}66`,
                    borderRadius: '6px',
                    padding: '2px 8px',
                  }}
                >
                  {s.label}
                </span>
              </div>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#f4f4f5' }}>{s.title}</span>
              <span style={{ fontSize: '13px', color: '#34d399' }}>{s.data}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
