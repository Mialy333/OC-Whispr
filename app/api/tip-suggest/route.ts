import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

async function callOpenRouter(balance: number): Promise<{ amount: number; message: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        {
          role: 'system',
          content: 'You suggest tip amounts for a DeFi alpha app. Return ONLY valid JSON, no markdown, no code fences. Keys: "amount" (number, ETH, between 0.001 and 0.01) and "message" (string, one friendly sentence about the amount).',
        },
        {
          role: 'user',
          content: `User has ${balance.toFixed(4)} ETH on Base. Suggest a tip amount between 0.001 and 0.01 ETH. Consider: too low is meaningless, too high is off-putting. Return ONLY JSON: { "amount": number, "message": string }. Example: { "amount": 0.003, "message": "About the price of a coffee ☕" }`,
        },
      ],
      max_tokens: 80,
    }),
  });

  const data = await res.json().catch(() => ({})) as Record<string, unknown>;
  const orErr = data.error as Record<string, unknown> | undefined;
  if (orErr || !res.ok) throw new Error('OpenRouter error');

  const raw = (data.choices as Array<{ message?: { content?: string } }> | undefined)?.[0]?.message?.content?.trim() ?? '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in response');

  const parsed = JSON.parse(match[0]) as { amount?: unknown; message?: unknown };
  const amount = typeof parsed.amount === 'number' ? Math.min(0.01, Math.max(0.001, parsed.amount)) : 0.002;
  const message = typeof parsed.message === 'string' ? parsed.message : 'A small token of appreciation ☕';
  return { amount, message };
}

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get('balance');
    const balance = raw ? parseFloat(raw) : 0;

    if (isNaN(balance) || balance < 0.001) {
      return NextResponse.json({ error: 'insufficient_balance' }, { status: 200 });
    }

    const suggestion = await callOpenRouter(balance);

    const redis = await getRedis();
    await redis.incr('tips:suggestions').catch(() => {});

    return NextResponse.json(suggestion);
  } catch (err) {
    // Fallback: return a sensible default so the UI still works
    return NextResponse.json({ amount: 0.002, message: 'About the price of a coffee ☕' });
  }
}
