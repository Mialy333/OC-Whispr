const BASE = 'https://api.coin360.com';

export interface Coin360Entry {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  change1h: number;
  change24h: number;
  change7d: number;
  marketCapUsd: number;
  volumeUsd24h: number;
}

interface C360Coin {
  id?: string;
  c?: string;   // coin symbol
  n?: string;   // name
  p?: number;   // price
  pc?: number;  // % change 24h
  p1h?: number; // % change 1h
  p7d?: number; // % change 7d
  mc?: number;  // market cap
  v?: number;   // volume 24h
}

export async function getHeatmapData(): Promise<Coin360Entry[]> {
  const apiKey = process.env.COIN360_API_KEY;
  if (!apiKey) {
    console.warn('[coin360] COIN360_API_KEY not set — skipping');
    return [];
  }

  try {
    const res = await fetch(`${BASE}/coins?limit=20`, {
      headers: { 'api-key': apiKey },
      next: { revalidate: 120 },
    });
    if (!res.ok) {
      console.warn(`[coin360] ${res.status}: ${await res.text()}`);
      return [];
    }
    const data: C360Coin[] | { data?: C360Coin[] } = await res.json();
    const coins: C360Coin[] = Array.isArray(data) ? data : (data.data ?? []);

    return coins.map((c, i) => ({
      id:           c.id ?? c.c ?? String(i),
      symbol:       c.c  ?? '',
      name:         c.n  ?? '',
      priceUsd:     c.p  ?? 0,
      change1h:     c.p1h ?? 0,
      change24h:    c.pc  ?? 0,
      change7d:     c.p7d ?? 0,
      marketCapUsd: c.mc  ?? 0,
      volumeUsd24h: c.v   ?? 0,
    }));
  } catch (e) {
    console.warn('[coin360] fetch failed:', e);
    return [];
  }
}
