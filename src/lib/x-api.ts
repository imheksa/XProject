import { randomBytes, createHash } from "crypto";

const AUTH_URL = "https://x.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const API_BASE = "https://api.x.com/2";

export const OAUTH_SCOPES = [
  "tweet.read",
  "users.read",
  "follows.read",
  "follows.write",
  "block.read",
  "block.write",
  "offline.access",
].join(" ");

export class XApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public rateLimitReset?: number,
  ) {
    super(message);
    this.name = "XApiError";
  }
}

export class RateLimitedError extends XApiError {
  constructor(resetEpochSeconds: number) {
    super("X API rate limit reached", 429, resetEpochSeconds);
    this.name = "RateLimitedError";
  }
}

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function generateState(): string {
  return base64url(randomBytes(16));
}

function getClientCredentials() {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const redirectUri = process.env.X_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("X_CLIENT_ID and X_REDIRECT_URI must be set");
  }
  return { clientId, clientSecret, redirectUri };
}

/**
 * The public origin of this app, derived from X_REDIRECT_URI rather than the
 * incoming request. Behind some reverse proxies, `req.url` resolves to the
 * container's internal host:port instead of the public domain, which would
 * send OAuth redirects to an unreachable address.
 */
export function getAppOrigin(): string {
  const { redirectUri } = getClientCredentials();
  return new URL(redirectUri).origin;
}

export function buildAuthorizeUrl(state: string, codeChallenge: string): string {
  const { clientId, redirectUri } = getClientCredentials();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: OAUTH_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

function authHeader(clientId: string, clientSecret?: string): Record<string, string> {
  // Confidential clients (with a client secret) authenticate via HTTP Basic auth;
  // public clients send only client_id in the body.
  if (!clientSecret) return {};
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return { Authorization: `Basic ${basic}` };
}

export async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri } = getClientCredentials();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_id: clientId,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...authHeader(clientId, clientSecret),
    },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new XApiError(`Token exchange failed: ${await res.text()}`, res.status);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = getClientCredentials();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...authHeader(clientId, clientSecret),
    },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new XApiError(`Token refresh failed: ${await res.text()}`, res.status);
  }
  return res.json();
}

export interface XUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
  verified?: boolean;
  verified_type?: "none" | "blue" | "business" | "government";
  most_recent_tweet_id?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

const USER_FIELDS = "profile_image_url,verified,verified_type,most_recent_tweet_id,public_metrics";

async function xFetch(path: string, accessToken: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 429) {
    const reset = Number(res.headers.get("x-rate-limit-reset") ?? 0);
    throw new RateLimitedError(reset || Math.floor(Date.now() / 1000) + 900);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new XApiError(`X API request to ${path} failed (${res.status}): ${text}`, res.status);
  }
  return res;
}

export async function getMe(accessToken: string): Promise<XUser> {
  const res = await xFetch(`/users/me?user.fields=${USER_FIELDS}`, accessToken);
  const json = await res.json();
  return json.data;
}

export interface PagedUsers {
  users: XUser[];
  nextToken?: string;
}

export async function listFollowing(
  accessToken: string,
  userId: string,
  paginationToken?: string,
  maxResults = 1000,
): Promise<PagedUsers> {
  return listConnections("following", accessToken, userId, paginationToken, maxResults);
}

export async function listFollowers(
  accessToken: string,
  userId: string,
  paginationToken?: string,
  maxResults = 1000,
): Promise<PagedUsers> {
  return listConnections("followers", accessToken, userId, paginationToken, maxResults);
}

async function listConnections(
  kind: "following" | "followers",
  accessToken: string,
  userId: string,
  paginationToken: string | undefined,
  maxResults: number,
): Promise<PagedUsers> {
  const params = new URLSearchParams({
    max_results: String(maxResults),
    "user.fields": USER_FIELDS,
  });
  if (paginationToken) params.set("pagination_token", paginationToken);
  const res = await xFetch(`/users/${userId}/${kind}?${params.toString()}`, accessToken);
  const json = await res.json();
  return {
    users: json.data ?? [],
    nextToken: json.meta?.next_token,
  };
}

/** Batch-fetch tweets by id (max 100 per call) to read their created_at timestamp. */
export async function getTweetCreatedAtByIds(
  accessToken: string,
  tweetIds: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (let i = 0; i < tweetIds.length; i += 100) {
    const chunk = tweetIds.slice(i, i + 100);
    if (chunk.length === 0) continue;
    const params = new URLSearchParams({
      ids: chunk.join(","),
      "tweet.fields": "created_at",
    });
    const res = await xFetch(`/tweets?${params.toString()}`, accessToken);
    const json = await res.json();
    for (const tweet of json.data ?? []) {
      result.set(tweet.id, tweet.created_at);
    }
  }
  return result;
}

export interface XPost {
  id: string;
  text: string;
  created_at: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
  };
}

/**
 * Fetches a user's own posts since a given date, with engagement metrics,
 * via their tweet timeline (not the search/counts endpoints, which cap
 * history at 7 days on non-Enterprise tiers). Capped at `maxPages` requests
 * (100 posts each) to bound API credit usage for very high-volume accounts.
 */
export async function getUserPostsWithMetrics(
  accessToken: string,
  userId: string,
  since: Date,
  maxPages = 5,
): Promise<XPost[]> {
  const posts: XPost[] = [];
  let token: string | undefined;
  let pages = 0;
  do {
    const params = new URLSearchParams({
      max_results: "100",
      start_time: since.toISOString(),
      "tweet.fields": "created_at,public_metrics",
    });
    if (token) params.set("pagination_token", token);
    const res = await xFetch(`/users/${userId}/tweets?${params.toString()}`, accessToken);
    const json = await res.json();
    posts.push(...(json.data ?? []));
    token = json.meta?.next_token;
    pages += 1;
  } while (token && pages < maxPages);
  return posts;
}

export async function getUserByUsername(accessToken: string, username: string): Promise<XUser> {
  const res = await xFetch(`/users/by/username/${encodeURIComponent(username)}?user.fields=${USER_FIELDS}`, accessToken);
  const json = await res.json();
  return json.data;
}

export interface XTrend {
  trend_name: string;
  tweet_count?: number;
}

/**
 * Trending topics for a location (WOEID, default 1 = worldwide). Note:
 * access to this endpoint varies by API plan -- callers should treat a
 * failure here as "unavailable on this tier" rather than a hard error.
 */
export async function getTrendingTopics(accessToken: string, woeid = 1): Promise<XTrend[]> {
  const res = await xFetch(`/trends/by/woeid/${woeid}`, accessToken);
  const json = await res.json();
  return json.data ?? [];
}

export async function unfollowUser(accessToken: string, sourceUserId: string, targetUserId: string): Promise<void> {
  await xFetch(`/users/${sourceUserId}/following/${targetUserId}`, accessToken, { method: "DELETE" });
}

/**
 * X's API has no direct "remove follower" endpoint. The standard workaround
 * is to block the account (which immediately removes them as a follower)
 * and then unblock right away so they aren't left permanently blocked.
 */
export async function removeFollower(accessToken: string, sourceUserId: string, targetUserId: string): Promise<void> {
  await xFetch(`/users/${sourceUserId}/blocking`, accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_user_id: targetUserId }),
  });
  await xFetch(`/users/${sourceUserId}/blocking/${targetUserId}`, accessToken, { method: "DELETE" });
}
