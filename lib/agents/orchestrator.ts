import { createHash } from 'crypto';
import type { Protocol, AlphaSignal } from '@/types';
import { getUserFollowing, getRecentCastsByFids } from '@/lib/api/neynar';
import type { RecentCast } from '@/lib/api/neynar';
import { getStablecoinPrices, getRWATokens } from '@/lib/api/coingecko';
import { getRWAProtocols, getStablecoinData } from '@/lib/api/defillama';
import { getTopDeFiProjects } from '@/lib/api/tokenterminal';
import type { TokenTerminalProject } from '@/lib/api/tokenterminal';
// Coin360 removed — CoinGecko covers same data for free
import { updateCache } from '@/lib/agents/signal-cache';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001';
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'MorningWhispr';

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

interface AnalysisInput {
  defillama:   Protocol[];
  stablecoins: ReturnType<typeof getStablecoinPrices> extends Promise<infer T> ? T : never;
  revenue:     TokenTerminalProject[];
}

export async function analyzeProtocols(protocols: Protocol[]): Promise<AlphaSignal[]> {
  if (protocols.length === 0) return [];

  const [stablecoins, rwaTokens, ttProjects, rwaProtocols, llamaStablecoins] = await Promise.allSettled([
    getStablecoinPrices(),
    getRWATokens(),
    getTopDeFiProjects(),
    getRWAProtocols(),
    getStablecoinData(),
  ]);

  const protocolData = protocols.map((p) => ({
    name: p.name, tvl: p.tvl, change24h: p.change24h,
    fees24h: p.fees24h, revenue24h: p.revenue24h, category: p.category,
  }));

  const stablecoinData = stablecoins.status === 'fulfilled'
    ? stablecoins.value.map((s) => ({
        name: s.symbol, priceUsd: s.priceUsd,
        change24h: s.change24h, marketCapUsd: s.marketCapUsd,
        pegDeviation: s.pegDeviation, category: 'stablecoin',
      }))
    : [];

  const rwaData = rwaTokens.status === 'fulfilled'
    ? rwaTokens.value.map((r) => ({
        name: r.symbol, priceUsd: r.priceUsd, change24h: r.change24h, category: 'rwa',
      }))
    : [];

  const revenueData = ttProjects.status === 'fulfilled'
    ? ttProjects.value.map((p) => ({
        name: p.name, revenue30d: p.revenue30d, fees30d: p.fees30d,
        revenueAnnualized: p.revenueAnnualized,
      }))
    : [];

  const rwaProtocolData = rwaProtocols.status === 'fulfilled'
    ? rwaProtocols.value.map((p) => ({
        name: p.name, tvl: p.tvl, change24h: p.change24h, category: p.category,
      }))
    : [];

  const llamaStablecoinData = llamaStablecoins.status === 'fulfilled'
    ? llamaStablecoins.value.map((s) => ({
        name: s.name, symbol: s.symbol, pegType: s.pegType,
        price: s.price, pegDeviation: s.pegDeviation, mcapUsd: s.mcapUsd,
      }))
    : [];

  const hasRevenue = revenueData.length > 0;

  const systemPrompt = `You are a financial intelligence agent bridging TradFi and DeFi.
Analyze the following protocol data and identify signals relevant to:
- Institutional investors (RWA, tokenized treasuries, yield)
- Stablecoin health (peg stability, collateral ratio)
- DeFi protocol revenue (sustainable vs mercenary)
Flag anomalies: TVL change >15%, peg deviation >0.3%, revenue spike >30%.
Return signals a Bloomberg analyst would care about.

Return ONLY a valid JSON array of exactly 5 objects, no markdown, no explanation, no code fences.
Each object: {"protocolName":"string","title":"string max 60 chars","summary":"string max 120 chars","dataPoint":"string e.g. TVL +42% · 24h","severity":"high|medium|low"}`;

  const userMessage = `Analyze all sources below. Return exactly 5 anomaly signals as a JSON array.

SOURCE 1 — DeFiLlama top protocols (TVL, fees, revenue):
${JSON.stringify(protocolData, null, 2)}

SOURCE 2 — DeFiLlama RWA protocols (tokenized assets, real-world lending):
${JSON.stringify(rwaProtocolData, null, 2)}

SOURCE 3 — DeFiLlama stablecoins (flag pegDeviation > 0.003):
${JSON.stringify(llamaStablecoinData, null, 2)}

SOURCE 4 — CoinGecko stablecoins + RWA tokens (cross-reference):
${JSON.stringify([...stablecoinData, ...rwaData], null, 2)}

SOURCE 5 — DeFiLlama fees: top DeFi protocols by 24h revenue${hasRevenue ? '' : ' (unavailable)'}:
${hasRevenue ? JSON.stringify(revenueData, null, 2) : '[]'}`;

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

  const sources = ['defillama', 'coingecko', hasRevenue ? 'defillama-fees' : ''].filter(Boolean).join('+');
  updateCache(sorted, sources);

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
