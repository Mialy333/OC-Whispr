const BASE = 'https://api.coingecko.com/api/v3';

export interface StablecoinPrice {
  id: string;
  symbol: string;
  priceUsd: number;
  change24h: number;
  marketCapUsd: number;
  pegDeviation: number;
}

export interface RWATokenPrice {
  id: string;
  symbol: string;
  priceUsd: number;
  change24h: number;
}

const STABLECOIN_IDS = [
  'tether',
  'usd-coin',
  'dai',
  'ethena-usde',
  'ondo-us-dollar-yield',
  'first-digital-usd',
  'frax',
  'liquity-usd',
] as const;

const STABLECOIN_SYMBOLS: Record<string, string> = {
  'tether':              'USDT',
  'usd-coin':            'USDC',
  'dai':                 'DAI',
  'ethena-usde':         'USDe',
  'ondo-us-dollar-yield':'USDY',
  'first-digital-usd':   'FDUSD',
  'frax':                'FRAX',
  'liquity-usd':         'LUSD',
};

const RWA_IDS: Record<string, string> = {
  OUSG:  'ondo-short-term-us-govt-bond',
  BUIDL: 'blackrock-usd-institutional-digital-liquidity-fund',
  sUSDS: 'savings-usds',
};

type GeckoPriceEntry = {
  usd?: number;
  usd_24h_change?: number;
  usd_market_cap?: number;
};
type GeckoPriceMap = Record<string, GeckoPriceEntry>;

async function fetchPrices(ids: string[]): Promise<GeckoPriceMap> {
  const url =
    `${BASE}/simple/price?ids=${ids.join(',')}&vs_currencies=usd` +
    `&include_24hr_change=true&include_market_cap=true`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`CoinGecko /simple/price ${res.status}`);
  return res.json();
}

export async function getStablecoinPrices(): Promise<StablecoinPrice[]> {
  const prices = await fetchPrices([...STABLECOIN_IDS]);

  return STABLECOIN_IDS.map((id) => {
    const entry   = prices[id] ?? {};
    const priceUsd = entry.usd ?? 1;
    return {
      id,
      symbol:       STABLECOIN_SYMBOLS[id] ?? id.toUpperCase(),
      priceUsd,
      change24h:    entry.usd_24h_change ?? 0,
      marketCapUsd: entry.usd_market_cap ?? 0,
      pegDeviation: Math.abs(priceUsd - 1),
    };
  });
}

export async function getRWATokens(): Promise<RWATokenPrice[]> {
  const ids    = Object.values(RWA_IDS);
  const prices = await fetchPrices(ids);

  return Object.entries(RWA_IDS).map(([symbol, id]) => ({
    id,
    symbol,
    priceUsd:  prices[id]?.usd ?? 0,
    change24h: prices[id]?.usd_24h_change ?? 0,
  }));
}
