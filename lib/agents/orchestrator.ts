import { createHash } from 'crypto';
import type { Protocol, AlphaSignal } from '@/types';
import { getUserFollowing, getRecentCastsByFids } from '@/lib/api/neynar';
import type { RecentCast } from '@/lib/api/neynar';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001';
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'StreamAlpha';

// Server-side signal cache — survives within a single process lifetime.
// Keyed by stable ID so unlock/cast routes can look up without re-analyzing.
const signalCache = new Map<string, AlphaSignal>();

export function getSignalById(id: string): AlphaSignal | undefined {
  return signalCache.get(id);
}

function stableId(protocolId: string, title: string): string {
  return createHash('md5').update(protocolId + title).digest('hex').slice(0, 12);
}

function severityScore(signal: AlphaSignal): number {
  return signal.severity === 'high' ? 3 : signal.severity === 'medium' ? 2 : 1;
}

function extractProtocolMentions(
  casts: RecentCast[],
  signals: AlphaSignal[]
): string[] {
  const allText = casts.map((c) => c.text.toLowerCase()).join(' ');
  return signals
    .filter((s) =>
      allText.includes(s.protocolName.toLowerCase()) ||
      allText.includes(s.protocolId.toLowerCase())
    )
    .map((s) => s.protocolId);
}

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function chat(messages: OpenRouterMessage[], maxTokens = 512, temperature?: number): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  const body: Record<string, unknown> = { model: MODEL, messages, max_tokens: maxTokens };
  if (temperature !== undefined) body.temperature = temperature;

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? '').trim();
}

function parseSignalsFromLLM(raw: string, protocols: Protocol[]): AlphaSignal[] {
  let parsed: unknown;
  try {
    // Strip markdown code fences before parsing
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) {
      console.error('[orchestrator] LLM raw (no array found):', raw.slice(0, 500));
      return [];
    }
    parsed = JSON.parse(match[0]);
  } catch (e) {
    console.error('[orchestrator] JSON parse failed:', e, '— raw:', raw.slice(0, 500));
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return (parsed as Record<string, unknown>[])
    .slice(0, 5)
    .map((item) => {
      const protocolName = String(item.protocolName ?? '');
      const title = String(item.title ?? '');
      const protocol = protocols.find(
        (p) => p.name.toLowerCase() === protocolName.toLowerCase()
      );
      const protocolId =
        protocol?.id ?? protocolName.toLowerCase().replace(/\s+/g, '-');
      const severity = (['high', 'medium', 'low'] as const).includes(
        item.severity as AlphaSignal['severity']
      )
        ? (item.severity as AlphaSignal['severity'])
        : 'low';

      return {
        id: stableId(protocolId, title),
        protocolId,
        protocolName,
        title,
        summary: String(item.summary ?? ''),
        dataPoint: String(item.dataPoint ?? ''),
        severity,
        timestamp: Date.now(),
        source: 'defillama' as const,
      } satisfies AlphaSignal;
    })
    .filter((s) => s.title && s.protocolName);
}

export async function analyzeProtocols(protocols: Protocol[]): Promise<AlphaSignal[]> {
  if (protocols.length === 0) return [];

  const protocolData = protocols.map((p) => ({
    name: p.name,
    tvl: p.tvl,
    change24h: p.change24h,
    fees24h: p.fees24h,
    revenue24h: p.revenue24h,
    category: p.category,
  }));

  const systemPrompt = `You are a Web3 alpha analyst. Detect anomalies in DeFi/RWA protocol data.

Rules:
- Flag TVL change > 20% (up or down) as high severity
- Flag fee or revenue surge > 50% as medium severity
- Flag stablecoin peg deviation > 0.5% as high severity
- Ranked by severity (high first)
- Be data-driven, no hype

Return ONLY a valid JSON array of exactly 5 objects, no markdown, no explanation, no code fences.
Each object must have exactly these fields:
{"protocolName":"string","title":"string max 60 chars","summary":"string max 120 chars","dataPoint":"string e.g. TVL +42% in 24h","severity":"high|medium|low"}`;

  const userMessage = `Analyze these protocols and return exactly 5 anomaly signals as a JSON array:\n${JSON.stringify(protocolData, null, 2)}`;

  async function fetchSignals(temperature?: number): Promise<AlphaSignal[]> {
    const raw = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      1024,
      temperature,
    );
    return parseSignalsFromLLM(raw, protocols);
  }

  let signals = await fetchSignals();

  // Retry once at temperature 0 if we got fewer than 3 signals
  if (signals.length < 3) {
    console.warn(`[orchestrator] Only ${signals.length} signals parsed, retrying at temperature 0`);
    signals = await fetchSignals(0);
  }

  const sorted = signals.sort(
    (a, b) => severityScore(b) - severityScore(a)
  );

  for (const signal of sorted) {
    signalCache.set(signal.id, signal);
  }

  return sorted;
}

export async function generateCastSummary(signal: AlphaSignal): Promise<string> {
  const systemPrompt = `You write Farcaster casts for a Web3 alpha feed. Style: concise, data-driven, no hype, no emojis except the final one. Max 280 characters including the suffix. Always end with " 🔍 ${APP_NAME}".`;

  const userMessage = `Write a cast for this signal:
Protocol: ${signal.protocolName}
Title: ${signal.title}
Data: ${signal.dataPoint}
Summary: ${signal.summary}
Severity: ${signal.severity}`;

  const raw = await chat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    100
  );

  const suffix = ` 🔍 ${APP_NAME}`;
  const maxBody = 280 - suffix.length;
  const body = raw.replace(/\s*🔍.*$/u, '').trim().slice(0, maxBody);
  return `${body}${suffix}`;
}

export async function curateForUser(
  fid: number,
  allSignals: AlphaSignal[]
): Promise<AlphaSignal[]> {
  const followingFids = await getUserFollowing(fid);
  const recentCasts = await getRecentCastsByFids(followingFids);
  const mentionedProtocols = extractProtocolMentions(recentCasts, allSignals);

  return allSignals
    .map((signal) => {
      const boosted = mentionedProtocols.includes(signal.protocolId);
      return { ...signal, boosted, _score: boosted ? 2 : 1 };
    })
    .sort((a, b) => b._score - a._score || severityScore(b) - severityScore(a))
    .map(({ _score: _, ...signal }) => signal);
}
