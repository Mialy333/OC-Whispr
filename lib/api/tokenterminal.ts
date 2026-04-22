// Replaced Token Terminal (paid) with DeFiLlama /overview/fees (free).
// Same data shape preserved so orchestrator requires no interface changes.

const BASE = 'https://api.llama.fi';

export interface TokenTerminalProject {
  id: string;
  name: string;
  revenue30d: number;
  revenue90d: number;
  revenueAnnualized: number;
  fees30d: number;
  activeUsers30d: number;
}

interface LlamaFeesProtocol {
  name: string;
  total24h: number | null;
  revenue24h: number | null;
  total30d: number | null;
  revenue30d: number | null;
}

export async function getTopDeFiProjects(): Promise<TokenTerminalProject[]> {
  try {
    const res = await fetch(`${BASE}/overview/fees`, { next: { revalidate: 300 } });
    if (!res.ok) {
      console.warn(`[fees] DeFiLlama /overview/fees ${res.status}`);
      return [];
    }
    const data: { protocols?: LlamaFeesProtocol[] } = await res.json();
    const protocols = data.protocols ?? [];

    return protocols
      .filter((p) => (p.revenue24h ?? 0) > 0 || (p.total24h ?? 0) > 0)
      .sort((a, b) => (b.revenue24h ?? 0) - (a.revenue24h ?? 0))
      .slice(0, 10)
      .map((p) => ({
        id: p.name.toLowerCase().replace(/\s+/g, '-'),
        name: p.name,
        revenue30d:        p.revenue30d        ?? 0,
        revenue90d:        0,
        revenueAnnualized: (p.revenue30d ?? 0) * 12,
        fees30d:           p.total30d          ?? 0,
        activeUsers30d:    0,
      }));
  } catch (e) {
    console.warn('[fees] fetch failed:', e);
    return [];
  }
}
