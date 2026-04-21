import type { Protocol } from '@/types';

const BASE = 'https://api.llama.fi';

interface LlamaProtocol {
  slug: string;
  name: string;
  tvl: number;
  change_1d: number;
  category: string;
  chain: string;
  logo: string;
}

interface LlamaFeesProtocol {
  name: string;
  total24h: number | null;
  revenue24h: number | null;
}

interface LlamaFeesOverview {
  protocols: LlamaFeesProtocol[];
}

function mapCategory(raw: string): Protocol['category'] {
  const s = raw.toLowerCase();
  if (s.includes('stablecoin')) return 'stablecoin';
  if (s.includes('rwa') || s.includes('real world')) return 'rwa';
  if (s.includes('bridge') || s.includes('cross-chain')) return 'bridge';
  return 'defi';
}

export async function getTopProtocols(limit = 20): Promise<Protocol[]> {
  const res = await fetch(`${BASE}/protocols`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`DeFiLlama /protocols ${res.status}`);
  const data: LlamaProtocol[] = await res.json();

  return data
    .filter((p) => p.tvl > 0)
    .sort((a, b) => b.tvl - a.tvl)
    .slice(0, limit)
    .map((p) => ({
      id: p.slug,
      name: p.name,
      tvl: p.tvl,
      fees24h: 0,
      revenue24h: 0,
      change24h: p.change_1d ?? 0,
      category: mapCategory(p.category ?? ''),
      chain: p.chain ?? 'multi',
      logo: p.logo,
    }));
}

export async function getProtocolFees(
  protocol: string
): Promise<{ fees24h: number; revenue24h: number }> {
  const res = await fetch(`${BASE}/overview/fees`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`DeFiLlama /overview/fees ${res.status}`);
  const data: LlamaFeesOverview = await res.json();

  const match = data.protocols.find(
    (p) => p.name.toLowerCase() === protocol.toLowerCase()
  );

  return {
    fees24h: match?.total24h ?? 0,
    revenue24h: match?.revenue24h ?? 0,
  };
}
