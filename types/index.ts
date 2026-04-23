import type { YieldAdvice } from './advisor';

export interface Protocol {
  id: string;
  name: string;
  tvl: number;
  fees24h: number;
  revenue24h: number;
  change24h: number;
  category: 'defi' | 'rwa' | 'stablecoin' | 'bridge';
  chain: string;
  logo?: string;
}

export interface AlphaSignal {
  id: string;
  protocolId: string;
  protocolName: string;
  title: string;
  summary: string;
  dataPoint: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: number;
  source: 'defillama' | 'coingecko' | 'tokenterminal' | 'neynar';
  castTemplate?: string;
  boosted?: boolean;
  yieldAdvice?: YieldAdvice;
}

export interface CuratedFeed {
  userId: string;
  fid: number;
  signals: AlphaSignal[];
  protocols: Protocol[];
  generatedAt: number;
}

export interface CastPayload {
  fid: number;
  frameUrl: string;
  summary: string;
  protocolName: string;
  signalId: string;
}

export interface UserContext {
  fid: number;
  username: string;
  walletAddress: string;
  followingFids: number[];
  unlockedSignals: string[];
}
