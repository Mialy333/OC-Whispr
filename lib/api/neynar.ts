const BASE = 'https://api.neynar.com/v2/farcaster';

export async function publishCast(
  text: string,
  embedUrls: string[] = [],
): Promise<{ hash?: string; error?: string }> {
  const signerUuid = process.env.NEYNAR_SIGNER_UUID;
  if (!signerUuid) return { error: 'NEYNAR_SIGNER_UUID not set' };
  try {
    const res = await fetch(`${BASE}/cast`, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.NEYNAR_API_KEY ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signer_uuid: signerUuid,
        text,
        embeds: embedUrls.map((url) => ({ url })),
      }),
    });
    const data = await res.json();
    if (!res.ok) return { error: JSON.stringify(data) };
    return { hash: data.cast?.hash };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

function headers(): Record<string, string> {
  return {
    'x-api-key': process.env.NEYNAR_API_KEY ?? '',
    'Content-Type': 'application/json',
  };
}

interface NeynarFollowingUser {
  fid: number;
}

interface NeynarFollowingResponse {
  users?: NeynarFollowingUser[];
}

interface NeynarCast {
  text: string;
  author: { fid: number };
}

interface NeynarFeedResponse {
  casts?: NeynarCast[];
}

export async function getUserFollowing(fid: number): Promise<number[]> {
  try {
    const res = await fetch(
      `${BASE}/following?fid=${fid}&limit=100`,
      { headers: headers(), next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data: NeynarFollowingResponse = await res.json();
    return (data.users ?? []).map((u) => u.fid).filter(Boolean);
  } catch {
    return [];
  }
}

export interface RecentCast {
  text: string;
  author_fid: number;
}

export async function getRecentCastsByFids(
  fids: number[],
  limit = 5
): Promise<RecentCast[]> {
  if (fids.length === 0) return [];
  try {
    const url =
      `${BASE}/feed?feed_type=filter&fids=${fids.join(',')}&limit=${limit}`;
    const res = await fetch(url, {
      headers: headers(),
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data: NeynarFeedResponse = await res.json();
    return (data.casts ?? []).map((c) => ({
      text: c.text,
      author_fid: c.author?.fid ?? 0,
    }));
  } catch {
    return [];
  }
}
