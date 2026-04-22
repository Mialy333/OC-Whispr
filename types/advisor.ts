export interface UserProfile {
  fid?: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  capitalUsd: number;
  preferredAssets: ('stablecoins' | 'rwa' | 'defi' | 'eth' | 'btc')[];
  timeHorizon: 'short' | 'medium' | 'long';
  excludedProtocols?: string[];
}

export interface YieldAdvice {
  protocol: string;
  strategy: string;
  estimatedApy: string;
  riskLevel: 'low' | 'medium' | 'high';
  rationale: string;
  actionStep: string;
}

export interface AdvisorResponse {
  fid: string;
  profile: UserProfile;
  advice: YieldAdvice[];
  generatedAt: string;
}
