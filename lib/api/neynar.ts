const BASE = 'https://api.neynar.com/v2/farcaster';

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
