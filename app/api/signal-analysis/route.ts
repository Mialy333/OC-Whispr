import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const MODELS = [
  'google/gemini-2.0-flash-001',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'google/gemma-3-27b-it:free',
];

interface Analysis { explanation: string; investorType: string; }

async function analyze(signalJson: string): Promise<Analysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  for (const model of MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a financial analyst explaining DeFi signals to TradFi investors. Be concise and plain-spoken. Return ONLY a valid JSON object — no markdown, no code fences. Keys: "explanation" (3 sentences max, plain English) and "investorType" (1 sentence: who should care about this).',
            },
            {
              role: 'user',
              content: `Explain this DeFi signal for a TradFi investor:\n${signalJson}`,
            },
          ],
          max_tokens: 220,
        }),
      });

      const data = await res.json().catch(() => ({})) as Record<string, unknown>;
      const orError = data.error as Record<string, unknown> | undefined;
      if (orError || !res.ok) continue;

      const raw = (data.choices as Array<{message?: {content?: string}}> | undefined)?.[0]?.message?.content?.trim() ?? '';
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) continue;
      const parsed = JSON.parse(match[0]) as { explanation?: string; investorType?: string };
      if (parsed.explanation) {
        return { explanation: parsed.explanation, investorType: parsed.investorType ?? '' };
      }
    } catch {
      continue;
    }
  }
  throw new Error('All models failed');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { id?: string; signal?: Record<string, unknown> };
    const { id, signal } = body;
    if (!id || !signal) {
      return NextResponse.json({ error: 'id and signal required' }, { status: 400 });
    }

    const cacheKey = `signal-analysis:${id}`;
    const redis = await getRedis();
    const cached = await redis.get(cacheKey);
    if (cached) return NextResponse.json(JSON.parse(cached as string));

    const result = await analyze(JSON.stringify({
      protocol:  signal.protocolName,
      title:     signal.title,
      summary:   signal.summary,
      dataPoint: signal.dataPoint,
      severity:  signal.severity,
    }));

    await redis.set(cacheKey, JSON.stringify(result), { EX: 3600 });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
