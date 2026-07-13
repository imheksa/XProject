import { prisma } from "@/lib/prisma";
import { requireAccessToken } from "@/lib/auth";
import { getMe, getUserPostCountSince } from "@/lib/x-api";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_REFRESH_INTERVAL_MS = Number(process.env.MIN_PROFILE_REFRESH_INTERVAL_MS ?? 6 * 60 * 60 * 1000);

export interface ProfileSummary {
  followersCount: number;
  followingCount: number;
  postsLast30d: number;
  followersGrowth30d: number | null;
  followersGrowthSince: string | null;
  capturedAt: string;
}

function toSummary(
  latest: { followersCount: number; followingCount: number; postsLast30d: number; capturedAt: Date },
  baseline: { followersCount: number; capturedAt: Date } | null,
): ProfileSummary {
  return {
    followersCount: latest.followersCount,
    followingCount: latest.followingCount,
    postsLast30d: latest.postsLast30d,
    followersGrowth30d: baseline ? latest.followersCount - baseline.followersCount : null,
    followersGrowthSince: baseline ? baseline.capturedAt.toISOString() : null,
    capturedAt: latest.capturedAt.toISOString(),
  };
}

async function findBaseline(userId: string, latestId: string) {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const atOrBeforeCutoff = await prisma.profileSnapshot.findFirst({
    where: { userId, capturedAt: { lte: since } },
    orderBy: { capturedAt: "desc" },
  });
  if (atOrBeforeCutoff) return atOrBeforeCutoff;

  const oldest = await prisma.profileSnapshot.findFirst({ where: { userId }, orderBy: { capturedAt: "asc" } });
  return oldest && oldest.id !== latestId ? oldest : null;
}

/** Returns the cached profile summary, refreshing from X only if the cache is stale. */
export async function getOrRefreshProfileSummary(userId: string): Promise<ProfileSummary | null> {
  const latest = await prisma.profileSnapshot.findFirst({ where: { userId }, orderBy: { capturedAt: "desc" } });
  const isStale = !latest || Date.now() - latest.capturedAt.getTime() > MIN_REFRESH_INTERVAL_MS;

  if (!isStale) {
    return toSummary(latest, await findBaseline(userId, latest.id));
  }

  const { accessToken } = await requireAccessToken(userId);
  const me = await getMe(accessToken);
  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const postsLast30d = await getUserPostCountSince(accessToken, userId, since);

  const fresh = await prisma.profileSnapshot.create({
    data: {
      userId,
      followersCount: me.public_metrics?.followers_count ?? 0,
      followingCount: me.public_metrics?.following_count ?? 0,
      postsLast30d,
    },
  });

  return toSummary(fresh, await findBaseline(userId, fresh.id));
}
