import { prisma } from "@/lib/prisma";
import { requireAccessToken } from "@/lib/auth";
import { getMe, getUserPostsWithMetrics } from "@/lib/x-api";

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

/**
 * Pulls the user's own posts from the last 30 days (with engagement
 * metrics) and upserts them into PostMetric, dropping anything that's
 * aged out of the 30-day window. Shared by the profile snapshot (which
 * only needs the count) and the analytics dashboard (which needs the
 * metrics) so both features cost a single API round-trip per refresh.
 */
async function refreshPostMetrics(userId: string, accessToken: string, since: Date) {
  const posts = await getUserPostsWithMetrics(accessToken, userId, since);

  await prisma.$transaction([
    prisma.postMetric.deleteMany({ where: { userId, postedAt: { lt: since } } }),
    ...posts.map((p) =>
      prisma.postMetric.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          userId,
          text: p.text,
          postedAt: new Date(p.created_at),
          likeCount: p.public_metrics?.like_count ?? 0,
          retweetCount: p.public_metrics?.retweet_count ?? 0,
          replyCount: p.public_metrics?.reply_count ?? 0,
          quoteCount: p.public_metrics?.quote_count ?? 0,
          impressionCount: p.public_metrics?.impression_count,
        },
        update: {
          likeCount: p.public_metrics?.like_count ?? 0,
          retweetCount: p.public_metrics?.retweet_count ?? 0,
          replyCount: p.public_metrics?.reply_count ?? 0,
          quoteCount: p.public_metrics?.quote_count ?? 0,
          impressionCount: p.public_metrics?.impression_count,
          capturedAt: new Date(),
        },
      }),
    ),
  ]);

  return posts.length;
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
  const postsLast30d = await refreshPostMetrics(userId, accessToken, since);

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
