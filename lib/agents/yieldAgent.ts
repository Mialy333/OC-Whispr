import type { UserProfile, YieldAdvice } from '@/types/advisor';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const MODEL = 'anthropic/claude-sonnet-4';

export async function getYieldAdvice(profile: UserProfile): Promise<YieldAdvice[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  const systemPrompt = `You are a yield advisor bridging TradFi and DeFi.
Risk profiles: conservative = capital preservation, low APY; moderate = balanced risk/reward; degen = maximum yield, leverage, high risk accepted.
Asset categories: stablecoin = stablecoin lending/farming; rwa = real-world asset protocols; defi = DEX/lending/farming; staking = liquid staking (ETH, SOL, etc).
You recommend concrete, actionable yield strategies tailored to the user's risk profile and capital size.
Return ONLY a valid JSON array of exactly 3 objects. No markdown, no explanation, no code fences.
Each object: {
  "protocol": "string",
  "strategy": "string max 80 chars",
  "estimatedApy": "string e.g. '4.2%' or '4–6%'",
  "riskLevel": "low|medium|high",
  "rationale": "string max 120 chars, data-driven",
  "actionStep": "string max 100 chars, specific next step"
}`;

  const userMessage = `User profile:
- Risk tolerance: ${profile.riskTolerance}
- Capital: $${profile.capitalUsd.toLocaleString()}
- Preferred assets: ${profile.preferredAssets.join(', ')}
- Time horizon: ${profile.timeHorizon}
${profile.excludedProtocols?.length ? `- Excluded protocols: ${profile.excludedProtocols.join(', ')}` : ''}

Recommend 3 yield strategies ranked by fit for this exact risk profile. For degen: prioritize leveraged strategies, high APY, accept liquidation risk. For conservative: prioritize audited protocols, stable APY, no leverage. Prioritize protocols with verifiable on-chain yield and at least $100M TVL.`;

  const RETRYABLE = new Set([429, 502, 503, 504]);
  let lastError = '';

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));

    const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 800,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const raw: string = (data.choices?.[0]?.message?.content ?? '').trim();
      return parseAdvice(raw);
    }

    lastError = await res.text();
    if (!RETRYABLE.has(res.status)) break;
    console.warn(`[yieldAgent] OpenRouter ${res.status}, attempt ${attempt + 1}/3`);
  }

  throw new Error(`OpenRouter ${lastError}`);
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
    console.error('[yieldAgent] parse failed:', e, '— raw:', raw.slice(0, 300));
    return [];
  }
}
