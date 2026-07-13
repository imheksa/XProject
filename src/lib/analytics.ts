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
