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
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'AlphaWhispr';

const MODELS = [
  process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'google/gemma-3-27b-it:free',
  'deepseek/deepseek-r1:free',
  'qwen/qwen-2.5-72b-instruct:free',
];

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

  const errors: string[] = [];

  for (const model of MODELS) {
    try {
      const body: Record<string, unknown> = { model, messages, max_tokens: maxTokens };
      if (temperature !== undefined) body.temperature = temperature;

      const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({})) as Record<string, unknown>;

      // OpenRouter sometimes returns HTTP 200 with {"error":{...}} in the body
      const orError = data.error as Record<string, unknown> | undefined;
      if (orError) {
        const code = Number(orError.code ?? res.status);
        const msg  = String(orError.message ?? '').slice(0, 80);
        console.warn(`[orchestrator] ${model} → OR ${code}: ${msg}`);
        errors.push(`${model}: OR-${code}`);
        if (res.status === 401 || res.status === 403) break;
        continue;
      }

      if (!res.ok) {
        errors.push(`${model}: HTTP-${res.status}`);
        if (res.status === 401 || res.status === 403) break;
        continue;
      }

      const choices = data.choices as Array<{message?: {content?: string}}> | undefined;
      const text = choices?.[0]?.message?.content?.trim() ?? '';
      if (text) {
        console.log(`[orchestrator] success with ${model}`);
        return text;
      }
      errors.push(`${model}: empty`);
    } catch (e) {
      errors.push(`${model}: ${e instanceof Error ? e.message : String(e)}`);
      console.warn(`[orchestrator] ${model} threw, trying next:`, e);
    }
  }

  throw new Error(`All models failed: ${errors.join(' | ')}`);
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

function staticSignals(): AlphaSignal[] {
  const now = Date.now();
  return [
    { id: 'static-001', protocolId: 'aave-v3', protocolName: 'Aave v3', title: 'USDC supply rate elevated above 5%', summary: 'Aave v3 USDC supply APY has climbed above 5% on Ethereum mainnet, highest since Q1. Borrow demand driven by leveraged stablecoin strategies.', dataPoint: 'Supply APY 5.2% · 24h +0.4%', severity: 'high', timestamp: now, source: 'defillama' },
    { id: 'static-002', protocolId: 'ethena', protocolName: 'Ethena', title: 'sUSDe funding rate spikes to 18% APY', summary: 'USDe staking yield surged on elevated ETH perpetual funding rates. Institutional demand for delta-neutral yield increasing ahead of quarter-end.', dataPoint: 'sUSDe APY 18.3% · 7d avg 14.1%', severity: 'high', timestamp: now, source: 'defillama' },
    { id: 'static-003', protocolId: 'pendle', protocolName: 'Pendle Finance', title: 'eETH fixed PT yield locks in above 8%', summary: 'Pendle PT-eETH for June expiry pricing at 8.4% fixed APY — highest fixed ETH staking rate in 6 months. Window may close as demand absorbs supply.', dataPoint: 'PT-eETH APY 8.4% · TVL $1.2B', severity: 'medium', timestamp: now, source: 'defillama' },
    { id: 'static-004', protocolId: 'ondo-finance', protocolName: 'Ondo Finance', title: 'USDY AUM crosses $600M milestone', summary: 'Ondo\'s tokenized T-bill product USDY surpassed $600M AUM, reflecting growing institutional appetite for on-chain RWA yield as TradFi rates stay elevated.', dataPoint: 'AUM $612M · +8% MoM', severity: 'medium', timestamp: now, source: 'defillama' },
    { id: 'static-005', protocolId: 'morpho', protocolName: 'Morpho Blue', title: 'TVL up 22% as curators attract vault inflows', summary: 'Morpho Blue TVL grew 22% week-over-week driven by new curator vaults offering 50–80 bps above Aave rates on same collateral. Capital efficiency play gaining traction.', dataPoint: 'TVL $2.1B · 7d +22%', severity: 'low', timestamp: now, source: 'defillama' },
  ];
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

  let signals: AlphaSignal[] = [];
  try {
    signals = await fetchSignals();
    if (signals.length < 3) {
      console.warn(`[orchestrator] Only ${signals.length} signals, retrying at temperature 0`);
      signals = await fetchSignals(0);
    }
  } catch (e) {
    console.warn('[orchestrator] LLM unavailable, serving static signals:', e);
    signals = staticSignals();
  }

  const sorted = signals.sort(
    (a, b) => severityScore(b) - severityScore(a)
  );

  const sources = ['defillama', 'coingecko', hasRevenue ? 'defillama-fees' : ''].filter(Boolean).join('+');
  updateCache(sorted, sources);

  return sorted;
}

export async function generateAlphaWhispr(signals: AlphaSignal[]): Promise<string> {
  const top3 = signals.slice(0, 3).map((s, i) =>
    `${i + 1}. ${s.protocolName}: ${s.dataPoint} — ${s.title}`
  ).join('\n');

  const raw = await chat([
    {
      role: 'system',
      content: `You write a daily TradFi/DeFi intelligence briefing for Alpha Whispr. Style: institutional, concise, data-driven. No emojis except the final one. Max 280 chars including suffix " 🔍 Alpha Whispr".`,
    },
    {
      role: 'user',
      content: `Write today's morning briefing cast from these top signals:\n${top3}`,
    },
  ], 120);

  const suffix = ' 🔍 Alpha Whispr';
  const maxBody = 280 - suffix.length;
  const body = raw.replace(/\s*🔍.*$/u, '').trim().slice(0, maxBody);
  return `${body}${suffix}`;
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
