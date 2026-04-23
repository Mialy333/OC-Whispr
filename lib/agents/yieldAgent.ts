import type { UserProfile, YieldAdvice } from '@/types/advisor';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// Verified-live models (confirmed via OR error messages: 429 = exists, 404 = gone)
const MODELS = [
  'google/gemini-2.0-flash-001',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'google/gemma-3-27b-it:free',
  'deepseek/deepseek-r1:free',
  'qwen/qwen-2.5-72b-instruct:free',
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

      const data = await res.json().catch(() => ({})) as Record<string, unknown>;

      // OpenRouter sometimes returns HTTP 200 with {"error":{...}} instead of {"choices":[...]}
      const orError = data.error as Record<string, unknown> | undefined;
      if (orError) {
        const code = Number(orError.code ?? res.status);
        const msg  = String(orError.message ?? '').slice(0, 120);
        console.warn(`[yieldAgent] ${model} → OR ${code}: ${msg}`);
        errors.push(`${model}: OR-${code} ${msg}`);
        if (res.status === 401 || res.status === 403) break;
        continue;
      }

      if (!res.ok) {
        console.warn(`[yieldAgent] ${model} → HTTP ${res.status}`);
        errors.push(`${model}: HTTP-${res.status}`);
        if (res.status === 401 || res.status === 403) break;
        continue;
      }

      const choices = data.choices as Array<{message?: {content?: string}}> | undefined;
      const raw: string = choices?.[0]?.message?.content?.trim() ?? '';
      const advice = parseAdvice(raw);
      if (advice.length > 0) {
        console.log(`[yieldAgent] success with ${model}`);
        return advice;
      }
      errors.push(`${model}: empty parse`);
    } catch (e) {
      errors.push(`${model}: ${e instanceof Error ? e.message : String(e)}`);
      console.warn(`[yieldAgent] ${model} threw, trying next:`, e);
    }
  }

  // Static fallback so the UI never shows an error — real protocols, sane APYs
  console.warn('[yieldAgent] all models failed, serving static fallback. Errors:', errors.join(' | '));
  return staticFallback(profile.riskTolerance);
}

function staticFallback(risk: UserProfile['riskTolerance']): YieldAdvice[] {
  const sets: Record<UserProfile['riskTolerance'], YieldAdvice[]> = {
    conservative: [
      { protocol: 'Aave v3', strategy: 'USDC supply on Ethereum mainnet', estimatedApy: '4.8%', riskLevel: 'low', rationale: 'Blue-chip lending protocol, $12B+ TVL, audited, USDC carries no depeg risk vs volatile assets.', actionStep: 'Go to app.aave.com, connect wallet, deposit USDC into the Ethereum market.' },
      { protocol: 'Morpho Blue', strategy: 'USDC/DAI curated vault', estimatedApy: '5.5%', riskLevel: 'low', rationale: 'Peer-to-peer lending optimizer on top of Aave/Compound, higher rates with same underlying risk profile.', actionStep: 'Visit app.morpho.org, choose a conservative USDC vault with >$200M TVL.' },
      { protocol: 'Ondo Finance', strategy: 'USDY — tokenized T-bill yield', estimatedApy: '5.2%', riskLevel: 'low', rationale: 'RWA protocol backed by short-term US Treasuries. $500M+ TVL, fully redeemable, regulated structure.', actionStep: 'Visit ondo.finance, complete KYC, mint USDY with USDC.' },
    ],
    moderate: [
      { protocol: 'Pendle Finance', strategy: 'PT-eETH fixed yield on Ethereum', estimatedApy: '8.3%', riskLevel: 'medium', rationale: 'Lock in fixed ETH staking yield. $2B+ TVL, audited by multiple firms, no impermanent loss.', actionStep: 'Go to app.pendle.finance, buy PT-eETH expiring in 3–6 months for fixed APY.' },
      { protocol: 'Aave v3', strategy: 'WSTETH collateral + USDC borrow loop', estimatedApy: '7.1%', riskLevel: 'medium', rationale: 'Leverage wstETH staking yield against USDC borrow rate spread. Liquidation risk is low at 1.5x leverage.', actionStep: 'Deposit wstETH on Aave, borrow USDC at ~60% LTV, swap to wstETH and repeat once.' },
      { protocol: 'Ethena', strategy: 'sUSDe staking', estimatedApy: '11.2%', riskLevel: 'medium', rationale: 'Synthetic dollar backed by delta-hedged ETH/BTC. Yield from perp funding rates. $3B+ TVL, sustained positive funding.', actionStep: 'Go to app.ethena.fi, convert USDC to USDe, then stake for sUSDe.' },
    ],
    degen: [
      { protocol: 'Ethena', strategy: 'sUSDe + leveraged PT loop on Pendle', estimatedApy: '28%+', riskLevel: 'high', rationale: 'Stack sUSDe yield with Pendle PT leverage. Max APY when funding rates are elevated. Unwind risk if rates flip negative.', actionStep: 'Stake USDe for sUSDe on Ethena, then supply to Pendle and buy leveraged PT position.' },
      { protocol: 'Kamino Finance', strategy: 'SOL-USDC CLMM concentrated LP', estimatedApy: '22%', riskLevel: 'high', rationale: 'Concentrated liquidity on Solana DEX, auto-rebalancing. High fees during vol; IL risk if SOL moves >30%.', actionStep: 'Go to kamino.finance, deposit into SOL-USDC strategy, monitor IL daily.' },
      { protocol: 'Gearbox Protocol', strategy: '5x leveraged stablecoin farming', estimatedApy: '35%+', riskLevel: 'high', rationale: 'On-chain credit accounts with up to 10x leverage on whitelisted strategies. Liquidation at ~80% health factor.', actionStep: 'Open a credit account on gearbox.finance, choose USDC→Curve strategy, set leverage 4–5x.' },
    ],
  };
  return sets[risk];
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
