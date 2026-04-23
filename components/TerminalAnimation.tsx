'use client';

import { useEffect, useState } from 'react';
import { SA } from '@/components/ui';

const CHAR_DELAY = 50;   // ms per character
const LINE_PAUSE = 400;  // ms after line completes

interface Props { fid?: number | null; }

export default function TerminalAnimation({ fid }: Props) {
  const lines = [
    '> scanning defillama protocols...',
    '> detected: TVL anomaly +43% on OKX',
    '> stablecoin peg deviation: USDY -0.12%',
    `> curating feed for fid:${fid ?? 'anon'}`,
    '> signal ranked: HIGH severity',
    '> broadcasting to @alphawhispr...',
    '> feed ready. 5 signals found.',
  ];

  const [lineIdx, setLineIdx]   = useState(0);
  const [charIdx, setCharIdx]   = useState(0);
  const [pausing, setPausing]   = useState(false);
  const [blink, setBlink]       = useState(true);

  // Cursor blink
  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 530);
    return () => clearInterval(id);
  }, []);

  // Typewriter
  useEffect(() => {
    if (pausing) {
      const id = setTimeout(() => {
        setPausing(false);
        setLineIdx((i) => (i + 1) % lines.length);
        setCharIdx(0);
      }, LINE_PAUSE);
      return () => clearTimeout(id);
    }

    const currentLine = lines[lineIdx];
    if (charIdx < currentLine.length) {
      const id = setTimeout(() => setCharIdx((c) => c + 1), CHAR_DELAY);
      return () => clearTimeout(id);
    } else {
      // Line complete — pause before advancing
      setPausing(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charIdx, lineIdx, pausing]);

  const displayText = lines[lineIdx].slice(0, charIdx);

  return (
    <div style={{
      background: SA.terminal,
      border: '1px solid rgba(0,255,65,0.2)',
      borderRadius: 8,
      padding: '12px 14px',
      margin: '8px 14px',
      height: 120,
      overflow: 'hidden',
      fontFamily: SA.mono,
      fontSize: 11,
      lineHeight: 1.6,
      color: SA.terminalGreen,
    }}>
      {/* Completed lines (last 3 only so they fit) */}
      {lines.slice(Math.max(0, lineIdx - 3), lineIdx).map((line, i) => (
        <div key={i} style={{ opacity: 0.4, whiteSpace: 'pre' }}>{line}</div>
      ))}
      {/* Current typing line */}
      <div style={{ whiteSpace: 'pre' }}>
        {displayText}
        <span style={{ opacity: blink ? 1 : 0, color: '#00FF41' }}>|</span>
      </div>
    </div>
  );
}
