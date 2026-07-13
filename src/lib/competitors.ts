import { prisma } from "@/lib/prisma";
import { requireAccessToken } from "@/lib/auth";
import { getUserByUsername, getUserPostsWithMetrics, XApiError } from "@/lib/x-api";

export const MAX_TRACKED_COMPETITORS = 3;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_REFRESH_INTERVAL_MS = Number(process.env.MIN_PROFILE_REFRESH_INTERVAL_MS ?? 6 * 60 * 60 * 1000);

async function fetchCompetitorMetrics(accessToken: string, competitorUserId: string) {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const posts = await getUserPostsWithMetrics(accessToken, competitorUserId, since, 2);
  return posts.length;
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

  const postsLast30d = await fetchCompetitorMetrics(accessToken, competitor.id);

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
    const postsLast30d = await fetchCompetitorMetrics(accessToken, competitor.id);
    return prisma.competitorSnapshot.create({
      data: {
        trackedCompetitorId,
        followersCount: competitor.public_metrics?.followers_count ?? 0,
        followingCount: competitor.public_metrics?.following_count ?? 0,
        postsLast30d,
      },
    });
  } catch (err) {
    // Don't let one failed competitor refresh (e.g. rate limit) break the
    // whole comparison list -- fall back to the last good snapshot.
    if (err instanceof XApiError) return latest;
    throw err;
  }
}
