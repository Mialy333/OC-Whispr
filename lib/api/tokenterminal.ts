export interface ProtocolRevenue {
  id: string;
  name: string;
  revenue30d: number;
  revenue90d: number;
  revenueAnnualized: number;
  peRatio: number | null;
}

// Token Terminal requires an API key (https://tokenterminal.com/terminal/projects).
// Real implementation: GET https://api.tokenterminal.com/v2/projects/{project_id}/metrics
// with Authorization: Bearer <TOKEN_TERMINAL_API_KEY>
export async function getProtocolRevenue(protocolId: string): Promise<ProtocolRevenue> {
  return {
    id: protocolId,
    name: protocolId,
    revenue30d: 0,
    revenue90d: 0,
    revenueAnnualized: 0,
    peRatio: null,
  };
}
