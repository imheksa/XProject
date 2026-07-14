import { prisma } from "@/lib/prisma";
import { requireAccessToken } from "@/lib/auth";
import { getUserByUsername, getUserPostsWithMetrics, type XPost, XApiError } from "@/lib/x-api";
import { DAY_MS, startOfDay, type AnalyticsWindow } from "@/lib/analytics";

export const MAX_TRACKED_COMPETITORS = 3;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_REFRESH_INTERVAL_MS = Number(process.env.MIN_PROFILE_REFRESH_INTERVAL_MS ?? 6 * 60 * 60 * 1000);

function engagementOf(p: XPost): number {
  const m = p.public_metrics;
  return (m?.like_count ?? 0) + (m?.retweet_count ?? 0) + (m?.reply_count ?? 0) + (m?.quote_count ?? 0);
}

function topPostData(posts: XPost[]) {
  if (posts.length === 0) return null;
  const top = posts.reduce((best, p) => (engagementOf(p) > engagementOf(best) ? p : best));
  return {
    topPostId: top.id,
    topPostText: top.text,
    topPostedAt: new Date(top.created_at),
    topPostLikeCount: top.public_metrics?.like_count ?? 0,
    topPostRetweetCount: top.public_metrics?.retweet_count ?? 0,
    topPostReplyCount: top.public_metrics?.reply_count ?? 0,
    topPostQuoteCount: top.public_metrics?.quote_count ?? 0,
  };
}

async function fetchCompetitorMetrics(accessToken: string, competitorUserId: string) {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const posts = await getUserPostsWithMetrics(accessToken, competitorUserId, since, 2);
  return {
    postsLast30d: posts.length,
    totalLikes: posts.reduce((a, p) => a + (p.public_metrics?.like_count ?? 0), 0),
    totalRetweets: posts.reduce((a, p) => a + (p.public_metrics?.retweet_count ?? 0), 0),
    totalReplies: posts.reduce((a, p) => a + (p.public_metrics?.reply_count ?? 0), 0),
    topPost: topPostData(posts),
  };
}

export async function addCompetitor(userId: string, username: string) {
  const cleanUsername = username.replace(/^@/, "").trim();
  if (!cleanUsername) throw new Error("Enter a username to compare against.");

  const count = await prisma.trackedCompetitor.count({ where: { userId } });
  if (count >= MAX_TRACKED_COMPETITORS) {
    throw new Error(`You can track up to ${MAX_TRACKED_COMPETITORS} competitors at a time.`);
  }

  const { accessToken } = await requireAccessToken(userId);
  const competitor = await getUserByUsername(accessToken, cleanUsername);
  if (competitor.id === userId) throw new Error("You can't track your own account as a competitor.");

  const existing = await prisma.trackedCompetitor.findUnique({
    where: { userId_competitorUserId: { userId, competitorUserId: competitor.id } },
  });
  if (existing) throw new Error(`You're already tracking @${cleanUsername}.`);

  const { postsLast30d, totalLikes, totalRetweets, totalReplies, topPost } = await fetchCompetitorMetrics(
    accessToken,
    competitor.id,
  );

  return prisma.trackedCompetitor.create({
    data: {
      userId,
      competitorUserId: competitor.id,
      competitorUsername: competitor.username,
      snapshots: {
        create: {
          followersCount: competitor.public_metrics?.followers_count ?? 0,
          followingCount: competitor.public_metrics?.following_count ?? 0,
          postsLast30d,
          totalLikes,
          totalRetweets,
          totalReplies,
          ...topPost,
        },
      },
    },
    include: { snapshots: true },
  });
}

export async function removeCompetitor(userId: string, trackedCompetitorId: string) {
  await prisma.trackedCompetitor.deleteMany({ where: { id: trackedCompetitorId, userId } });
}

export interface CompetitorComparison {
  id: string;
  username: string;
  followersCount: number;
  followingCount: number;
  postsLast30d: number;
  followersGrowth30d: number | null;
  vsYourFollowers: number;
  vsYourPosts30d: number;
  topPost: {
    id: string;
    text: string;
    postedAt: string;
    likeCount: number;
    retweetCount: number;
    replyCount: number;
    quoteCount: number;
    engagement: number;
  } | null;
}

export async function getCompetitorsWithComparison(userId: string): Promise<CompetitorComparison[]> {
  const [tracked, ownProfile] = await Promise.all([
    prisma.trackedCompetitor.findMany({
      where: { userId },
      include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.profileSnapshot.findFirst({ where: { userId }, orderBy: { capturedAt: "desc" } }),
  ]);

  const results: CompetitorComparison[] = [];
  for (const t of tracked) {
    const latest = await refreshCompetitorIfStale(t.id, userId);
    if (!latest) continue;

    const baseline = await prisma.competitorSnapshot.findFirst({
      where: { trackedCompetitorId: t.id, capturedAt: { lte: new Date(Date.now() - THIRTY_DAYS_MS) } },
      orderBy: { capturedAt: "desc" },
    });

    results.push({
      id: t.id,
      username: t.competitorUsername,
      followersCount: latest.followersCount,
      followingCount: latest.followingCount,
      postsLast30d: latest.postsLast30d,
      followersGrowth30d: baseline ? latest.followersCount - baseline.followersCount : null,
      vsYourFollowers: latest.followersCount - (ownProfile?.followersCount ?? 0),
      vsYourPosts30d: latest.postsLast30d - (ownProfile?.postsLast30d ?? 0),
      topPost: latest.topPostId
        ? {
            id: latest.topPostId,
            text: latest.topPostText ?? "",
            postedAt: latest.topPostedAt!.toISOString(),
            likeCount: latest.topPostLikeCount ?? 0,
            retweetCount: latest.topPostRetweetCount ?? 0,
            replyCount: latest.topPostReplyCount ?? 0,
            quoteCount: latest.topPostQuoteCount ?? 0,
            engagement:
              (latest.topPostLikeCount ?? 0) +
              (latest.topPostRetweetCount ?? 0) +
              (latest.topPostReplyCount ?? 0) +
              (latest.topPostQuoteCount ?? 0),
          }
        : null,
    });
  }
  return results;
}

async function refreshCompetitorIfStale(trackedCompetitorId: string, userId: string) {
  const latest = await prisma.competitorSnapshot.findFirst({
    where: { trackedCompetitorId },
    orderBy: { capturedAt: "desc" },
  });
  const isStale = !latest || Date.now() - latest.capturedAt.getTime() > MIN_REFRESH_INTERVAL_MS;
  if (!isStale) return latest;

  const tracked = await prisma.trackedCompetitor.findUnique({ where: { id: trackedCompetitorId } });
  if (!tracked) return latest;

  try {
    const { accessToken } = await requireAccessToken(userId);
    const competitor = await getUserByUsername(accessToken, tracked.competitorUsername);
    const { postsLast30d, totalLikes, totalRetweets, totalReplies, topPost } = await fetchCompetitorMetrics(
      accessToken,
      competitor.id,
    );
    return prisma.competitorSnapshot.create({
      data: {
        trackedCompetitorId,
        followersCount: competitor.public_metrics?.followers_count ?? 0,
        followingCount: competitor.public_metrics?.following_count ?? 0,
        postsLast30d,
        totalLikes,
        totalRetweets,
        totalReplies,
        ...topPost,
      },
    });
  } catch (err) {
    // Don't let one failed competitor refresh (e.g. rate limit) break the
    // whole comparison list -- fall back to the last good snapshot.
    if (err instanceof XApiError) return latest;
    throw err;
  }
}

export interface CompetitorGrowthPoint {
  date: string;
  followersCount: number;
}

/** Day-bucketed follower count history, same carry-forward approach as getMetricSeries. */
async function getCompetitorGrowthSeries(
  trackedCompetitorId: string,
  windowDays: AnalyticsWindow,
): Promise<CompetitorGrowthPoint[]> {
  const start = startOfDay(new Date(Date.now() - (windowDays - 1) * DAY_MS));

  const [snapshots, prior] = await Promise.all([
    prisma.competitorSnapshot.findMany({
      where: { trackedCompetitorId, capturedAt: { gte: start } },
      orderBy: { capturedAt: "asc" },
    }),
    prisma.competitorSnapshot.findFirst({
      where: { trackedCompetitorId, capturedAt: { lt: start } },
      orderBy: { capturedAt: "desc" },
    }),
  ]);

  const points: CompetitorGrowthPoint[] = [];
  let carried = prior?.followersCount ?? snapshots[0]?.followersCount ?? 0;
  let idx = 0;

  for (let i = 0; i < windowDays; i++) {
    const dayStart = new Date(start.getTime() + i * DAY_MS);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    while (idx < snapshots.length && snapshots[idx].capturedAt < dayEnd) {
      carried = snapshots[idx].followersCount;
      idx += 1;
    }
    points.push({ date: dayStart.toISOString(), followersCount: carried });
  }
  return points;
}

export interface CompetitorAnalyticsComparison {
  id: string;
  username: string;
  growth: CompetitorGrowthPoint[];
  totals: {
    // Competitor aggregates are always over their last 30 days -- that's the
    // window fetchCompetitorMetrics always uses -- regardless of the 7D/30D
    // toggle applied to "your" side of the comparison.
    postsLast30d: number;
    totalLikes: number;
    totalRetweets: number;
    totalReplies: number;
    engagementRatePct: number | null;
  };
}

/** Pure read-model -- relies on getCompetitorsWithComparison having refreshed recently. */
export async function getCompetitorAnalyticsComparison(
  userId: string,
  trackedCompetitorId: string,
  windowDays: AnalyticsWindow,
): Promise<CompetitorAnalyticsComparison | null> {
  const tracked = await prisma.trackedCompetitor.findFirst({ where: { id: trackedCompetitorId, userId } });
  if (!tracked) return null;

  const latest = await prisma.competitorSnapshot.findFirst({
    where: { trackedCompetitorId },
    orderBy: { capturedAt: "desc" },
  });
  if (!latest) return null;

  const growth = await getCompetitorGrowthSeries(trackedCompetitorId, windowDays);
  const totalEngagement = latest.totalLikes + latest.totalRetweets + latest.totalReplies;

  return {
    id: tracked.id,
    username: tracked.competitorUsername,
    growth,
    totals: {
      postsLast30d: latest.postsLast30d,
      totalLikes: latest.totalLikes,
      totalRetweets: latest.totalRetweets,
      totalReplies: latest.totalReplies,
      engagementRatePct: latest.followersCount > 0 ? (totalEngagement / latest.followersCount) * 100 : null,
    },
  };
}
