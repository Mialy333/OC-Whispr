const BASE = 'https://api.tokenterminal.com/v2';

export interface TokenTerminalProject {
  id: string;
  name: string;
  revenue30d: number;
  revenue90d: number;
  revenueAnnualized: number;
  fees30d: number;
  activeUsers30d: number;
}

interface TTProject {
  project_id: string;
  name: string;
  revenue_30d?: number;
  revenue_90d?: number;
  revenue_annualized?: number;
  fees_30d?: number;
  active_developers?: number;
}

export async function getTopDeFiProjects(): Promise<TokenTerminalProject[]> {
  const apiKey = process.env.TOKENTERMINAL_API_KEY;
  if (!apiKey) {
    console.warn('[tokenterminal] TOKENTERMINAL_API_KEY not set — skipping');
    return [];
  }

  try {
    const res = await fetch(`${BASE}/projects?tags=defi`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.warn(`[tokenterminal] ${res.status}: ${await res.text()}`);
      return [];
    }
    const data: { data?: TTProject[] } = await res.json();
    const projects = data.data ?? [];

    return projects
      .map((p) => ({
        id:                 p.project_id,
        name:               p.name,
        revenue30d:         p.revenue_30d         ?? 0,
        revenue90d:         p.revenue_90d         ?? 0,
        revenueAnnualized:  p.revenue_annualized  ?? 0,
        fees30d:            p.fees_30d            ?? 0,
        activeUsers30d:     p.active_developers   ?? 0,
      }))
      .sort((a, b) => b.revenue30d - a.revenue30d)
      .slice(0, 10);
  } catch (e) {
    console.warn('[tokenterminal] fetch failed:', e);
    return [];
  }
}
