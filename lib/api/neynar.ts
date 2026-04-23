const BASE = 'https://api.neynar.com/v2/farcaster';

export async function publishCast(
  text: string,
  severity = 'medium',
): Promise<{ hash?: string; error?: string }> {
  const signerUuid = process.env.NEYNAR_BOT_UUID;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim();
  if (!signerUuid) return { error: 'NEYNAR_BOT_UUID not set' };
  try {
    const body: Record<string, unknown> = { signer_uuid: signerUuid, text };
    if (appUrl) {
      body.embeds = [{ url: `${appUrl}/frame?ref=cast&severity=${severity}` }];
    }
    const res = await fetch(`${BASE}/cast`, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.NEYNAR_API_KEY ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

export async function checkIfFollows(fid: number, targetFid: number): Promise<boolean> {
  if (!fid || !targetFid) return false;
  try {
    // viewer_context.following tells us if viewer (fid) follows the target user
    const res = await fetch(
      `${BASE}/user/bulk?fids=${targetFid}&viewer_fid=${fid}`,
      { headers: headers(), next: { revalidate: 60 } }
    );
    if (!res.ok) return false;
    const data: { users?: { viewer_context?: { following?: boolean } }[] } = await res.json();
    return data.users?.[0]?.viewer_context?.following === true;
  } catch {
    return false;
  }
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
