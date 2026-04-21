const BASE = 'https://api.coingecko.com/api/v3';

export interface StablecoinPrice {
  id: string;
  symbol: string;
  priceUsd: number;
  pegDeviation: number;
}

export interface RWATokenPrice {
  id: string;
  symbol: string;
  priceUsd: number;
}

const STABLECOIN_IDS = [
  'tether',
  'usd-coin',
  'dai',
  'frax',
  'true-usd',
  'pax-dollar',
  'liquity-usd',
  'usdd',
  'gemini-dollar',
  'first-digital-usd',
] as const;

const RWA_IDS: Record<string, string> = {
  USDY: 'ondo-us-dollar-yield',
  OUSG: 'ondo-short-term-us-govt-bond',
  BUIDL: 'blackrock-usd-institutional-digital-liquidity-fund',
  sUSDS: 'savings-usds',
};

type GeckoPriceMap = Record<string, { usd: number }>;

async function fetchPrices(ids: string[]): Promise<GeckoPriceMap> {
  const url = `${BASE}/simple/price?ids=${ids.join(',')}&vs_currencies=usd`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`CoinGecko /simple/price ${res.status}`);
  return res.json();
}

export async function getStablecoinPrices(): Promise<StablecoinPrice[]> {
  const prices = await fetchPrices([...STABLECOIN_IDS]);

  const symbols: Record<string, string> = {
    tether: 'USDT',
    'usd-coin': 'USDC',
    dai: 'DAI',
    frax: 'FRAX',
    'true-usd': 'TUSD',
    'pax-dollar': 'USDP',
    'liquity-usd': 'LUSD',
    usdd: 'USDD',
    'gemini-dollar': 'GUSD',
    'first-digital-usd': 'FDUSD',
  };

  return STABLECOIN_IDS.map((id) => {
    const priceUsd = prices[id]?.usd ?? 1;
    return {
      id,
      symbol: symbols[id] ?? id.toUpperCase(),
      priceUsd,
      pegDeviation: Math.abs(priceUsd - 1),
    };
  });
}

export async function getRWATokens(): Promise<RWATokenPrice[]> {
  const ids = Object.values(RWA_IDS);
  const prices = await fetchPrices(ids);

  return Object.entries(RWA_IDS).map(([symbol, id]) => ({
    id,
    symbol,
    priceUsd: prices[id]?.usd ?? 0,
  }));
}
