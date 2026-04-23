import type { UserProfile, YieldAdvice } from '@/types/advisor';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// Free models tried in order; on 429 we advance to the next
const MODELS = [
  'google/gemini-2.0-flash-001',
  'google/gemini-flash-1.5-8b',
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
];

const SYSTEM_PROMPT = `You are a yield advisor bridging TradFi and DeFi.
Risk profiles: conservative = capital preservation, low APY; moderate = balanced risk/reward; degen = maximum yield, leverage, high risk accepted.
Asset categories: stablecoin = stablecoin lending/farming; rwa = real-world asset protocols; defi = DEX/lending/farming; staking = liquid staking (ETH, SOL, etc).
Return ONLY a valid JSON array of exactly 3 objects. No markdown, no explanation, no code fences.
Each object: {"protocol":"string","strategy":"string max 80 chars","estimatedApy":"string e.g. '4.2%'","riskLevel":"low|medium|high","rationale":"string max 120 chars","actionStep":"string max 100 chars"}`;

export async function getYieldAdvice(profile: UserProfile): Promise<YieldAdvice[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  const userMessage = `Profile: risk=${profile.riskTolerance}, capital=$${profile.capitalUsd.toLocaleString()}, assets=${profile.preferredAssets.join(',')}, horizon=${profile.timeHorizon}.
Recommend 3 yield strategies. Degen: max APY/leverage OK. Conservative: audited, stable, no leverage. Min $100M TVL.`;

  const errors: string[] = [];

  for (const model of MODELS) {
    try {
      const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user',   content: userMessage },
          ],
          max_tokens: 600,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const raw: string = (data.choices?.[0]?.message?.content ?? '').trim();
        const advice = parseAdvice(raw);
        if (advice.length > 0) {
          console.log(`[yieldAgent] success with ${model}`);
          return advice;
        }
        errors.push(`${model}: empty parse`);
        continue;
      }

      const body = await res.text();
      errors.push(`${model}: ${res.status}`);
      console.warn(`[yieldAgent] ${model} → ${res.status}, trying next`);

      // Non-rate-limit error on this model — stop trying it, try next
      if (res.status !== 429 && res.status !== 503) break;
      // 429/503 → try next model immediately
    } catch (e) {
      errors.push(`${model}: ${e instanceof Error ? e.message : String(e)}`);
      console.warn(`[yieldAgent] ${model} threw, trying next:`, e);
    }
  }

  throw new Error(`All models failed: ${errors.join(' | ')}`);
}

function parseAdvice(raw: string): YieldAdvice[] {
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array found');
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) throw new Error('Not an array');
    return (parsed as Record<string, unknown>[]).slice(0, 3).map((item) => ({
      protocol:     String(item.protocol ?? ''),
      strategy:     String(item.strategy ?? ''),
      estimatedApy: String(item.estimatedApy ?? ''),
      riskLevel:    (['low', 'medium', 'high'] as const).includes(item.riskLevel as YieldAdvice['riskLevel'])
        ? (item.riskLevel as YieldAdvice['riskLevel'])
        : 'medium',
      rationale:    String(item.rationale ?? ''),
      actionStep:   String(item.actionStep ?? ''),
    }));
  } catch (e) {
    console.error('[yieldAgent] parse failed:', e, '— raw:', raw.slice(0, 200));
    return [];
  }
}
