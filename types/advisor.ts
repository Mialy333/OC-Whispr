export interface UserProfile {
  fid?: number;
  riskTolerance: 'conservative' | 'moderate' | 'degen';
  capitalUsd: number;
  preferredAssets: ('stablecoin' | 'rwa' | 'defi' | 'staking')[];
  timeHorizon: 'short' | 'medium' | 'long';
  excludedProtocols?: string[];
  signalContext?: string;
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
