import { prisma } from "@/lib/prisma";
import { requireAccessToken } from "@/lib/auth";
import { getTrendingTopics, XApiError } from "@/lib/x-api";

const MIN_CHECK_INTERVAL_MS = Number(process.env.MIN_TRENDS_CHECK_INTERVAL_MS ?? 3 * 60 * 60 * 1000);
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface TrendCheckResult {
  checked: boolean;
  matches: number;
  error?: string;
}

/**
 * Matches current trending topics against the user's configured niche/keywords
 * and creates in-app Notification rows for new matches. Throttled per user via
 * lastTrendsCheckAt, and access to the underlying trends endpoint varies by X
 * API plan -- a failure here is surfaced as a soft `error`, not thrown, since
 * it shouldn't break the rest of the dashboard.
 */
export async function checkTrendsForUser(userId: string): Promise<TrendCheckResult> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.keywords.length) return { checked: false, matches: 0 };

  const isStale = !user.lastTrendsCheckAt || Date.now() - user.lastTrendsCheckAt.getTime() > MIN_CHECK_INTERVAL_MS;
  if (!isStale) return { checked: false, matches: 0 };

  await prisma.user.update({ where: { id: userId }, data: { lastTrendsCheckAt: new Date() } });

  let trends;
  try {
    const { accessToken } = await requireAccessToken(userId);
    trends = await getTrendingTopics(accessToken);
  } catch (err) {
    const message =
      err instanceof XApiError
        ? "Trending topics aren't available on your current X API plan."
        : (err as Error).message;
    return { checked: true, matches: 0, error: message };
  }

  const keywords = user.keywords.map((k) => k.toLowerCase());
  const matched = trends.filter((t) => keywords.some((k) => t.trend_name.toLowerCase().includes(k)));

  let created = 0;
  for (const trend of matched) {
    const recentDupe = await prisma.notification.findFirst({
      where: {
        userId,
        type: "TREND_MATCH",
        title: trend.trend_name,
        createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
      },
    });
    if (recentDupe) continue;

    await prisma.notification.create({
      data: {
        userId,
        type: "TREND_MATCH",
        title: trend.trend_name,
        body: `"${trend.trend_name}" is trending and matches your niche/keywords${
          trend.tweet_count ? ` (${trend.tweet_count.toLocaleString()} posts)` : ""
        }.`,
      },
    });
    created += 1;
  }

  return { checked: true, matches: created };
}
