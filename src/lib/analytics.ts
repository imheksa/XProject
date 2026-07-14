import { prisma } from "@/lib/prisma";

export type AnalyticsWindow = 7 | 30;

export interface AnalyticsSummary {
  windowDays: AnalyticsWindow;
  totalPosts: number;
  totalEngagement: number;
  totalLikes: number;
  totalRetweets: number;
  totalReplies: number;
  totalQuotes: number;
  avgEngagementPerPost: number;
  engagementRatePct: number | null;
  replySharePct: number | null;
  followingFollowersRatio: number | null;
  growth: { date: string; followersCount: number }[];
  topPosts: {
    id: string;
    text: string;
    postedAt: string;
    likeCount: number;
    retweetCount: number;
    replyCount: number;
    quoteCount: number;
    engagement: number;
  }[];
}

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

/**
 * Pure read-model over data already cached by profile.ts's throttled
 * refresh (PostMetric + ProfileSnapshot) -- this never calls the X API
 * itself, so it's safe to hit on every dashboard load / window toggle.
 */
export async function getAnalyticsSummary(
  userId: string,
  windowDays: AnalyticsWindow,
): Promise<AnalyticsSummary | null> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [posts, latestProfile, growthSnapshots] = await Promise.all([
    prisma.postMetric.findMany({ where: { userId, postedAt: { gte: since } }, orderBy: { postedAt: "desc" } }),
    prisma.profileSnapshot.findFirst({ where: { userId }, orderBy: { capturedAt: "desc" } }),
    prisma.profileSnapshot.findMany({ where: { userId, capturedAt: { gte: since } }, orderBy: { capturedAt: "asc" } }),
  ]);

  if (!latestProfile) return null;

  const withEngagement = posts.map((p) => ({
    ...p,
    engagement: p.likeCount + p.retweetCount + p.replyCount + p.quoteCount,
  }));

  const totalLikes = sum(posts.map((p) => p.likeCount));
  const totalRetweets = sum(posts.map((p) => p.retweetCount));
  const totalReplies = sum(posts.map((p) => p.replyCount));
  const totalQuotes = sum(posts.map((p) => p.quoteCount));
  const totalEngagement = totalLikes + totalRetweets + totalReplies + totalQuotes;
  const totalPosts = posts.length;
  const avgEngagementPerPost = totalPosts > 0 ? totalEngagement / totalPosts : 0;
  const engagementRatePct =
    latestProfile.followersCount > 0 ? (avgEngagementPerPost / latestProfile.followersCount) * 100 : null;
  const replySharePct = totalEngagement > 0 ? (totalReplies / totalEngagement) * 100 : null;
  const followingFollowersRatio =
    latestProfile.followersCount > 0 ? latestProfile.followingCount / latestProfile.followersCount : null;

  const topPosts = withEngagement
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      text: p.text,
      postedAt: p.postedAt.toISOString(),
      likeCount: p.likeCount,
      retweetCount: p.retweetCount,
      replyCount: p.replyCount,
      quoteCount: p.quoteCount,
      engagement: p.engagement,
    }));

  const growth = growthSnapshots.map((s) => ({ date: s.capturedAt.toISOString(), followersCount: s.followersCount }));

  return {
    windowDays,
    totalPosts,
    totalEngagement,
    totalLikes,
    totalRetweets,
    totalReplies,
    totalQuotes,
    avgEngagementPerPost,
    engagementRatePct,
    replySharePct,
    followingFollowersRatio,
    growth,
    topPosts,
  };
}

export interface MetricPoint {
  date: string;
  followersCount: number;
  postsCount: number;
  likes: number;
  retweets: number;
  replies: number;
  engagementRatePct: number;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * One data point per day over the window, for the Overview page's line
 * charts (follower count, posts, likes, retweets, replies, engagement
 * rate). Pure read-model, same as getAnalyticsSummary -- no X API calls.
 */
export async function getMetricSeries(userId: string, windowDays: AnalyticsWindow): Promise<MetricPoint[]> {
  const start = startOfDay(new Date(Date.now() - (windowDays - 1) * DAY_MS));

  const [snapshots, priorSnapshot, posts] = await Promise.all([
    prisma.profileSnapshot.findMany({ where: { userId, capturedAt: { gte: start } }, orderBy: { capturedAt: "asc" } }),
    prisma.profileSnapshot.findFirst({ where: { userId, capturedAt: { lt: start } }, orderBy: { capturedAt: "desc" } }),
    prisma.postMetric.findMany({ where: { userId, postedAt: { gte: start } } }),
  ]);

  const points: MetricPoint[] = [];
  let carriedFollowers = priorSnapshot?.followersCount ?? snapshots[0]?.followersCount ?? 0;
  let snapshotIdx = 0;

  for (let i = 0; i < windowDays; i++) {
    const dayStart = new Date(start.getTime() + i * DAY_MS);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);

    while (snapshotIdx < snapshots.length && snapshots[snapshotIdx].capturedAt < dayEnd) {
      carriedFollowers = snapshots[snapshotIdx].followersCount;
      snapshotIdx += 1;
    }

    const dayPosts = posts.filter((p) => p.postedAt >= dayStart && p.postedAt < dayEnd);
    const likes = sum(dayPosts.map((p) => p.likeCount));
    const retweets = sum(dayPosts.map((p) => p.retweetCount));
    const replies = sum(dayPosts.map((p) => p.replyCount));
    const quotes = sum(dayPosts.map((p) => p.quoteCount));
    const engagement = likes + retweets + replies + quotes;

    points.push({
      date: dayStart.toISOString(),
      followersCount: carriedFollowers,
      postsCount: dayPosts.length,
      likes,
      retweets,
      replies,
      engagementRatePct: carriedFollowers > 0 ? (engagement / carriedFollowers) * 100 : 0,
    });
  }

  return points;
}
