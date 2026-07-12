import { prisma } from "@/lib/prisma";
import { requireAccessToken } from "@/lib/auth";
import { getTweetCreatedAtByIds, listFollowers, listFollowing, type XUser } from "@/lib/x-api";
import type { ScanCategory } from "@/lib/types";

const INACTIVE_DAYS = 90;
const PREMIUM_VERIFIED_TYPES = new Set(["blue", "business"]);

async function fetchAllConnections(
  accessToken: string,
  userId: string,
  kind: "following" | "followers",
): Promise<Map<string, XUser>> {
  const all = new Map<string, XUser>();
  let token: string | undefined;
  do {
    const page = kind === "following"
      ? await listFollowing(accessToken, userId, token)
      : await listFollowers(accessToken, userId, token);
    for (const u of page.users) all.set(u.id, u);
    token = page.nextToken;
  } while (token);
  return all;
}

function isInactive(lastActiveAt: Date | null): boolean {
  if (!lastActiveAt) return true;
  const cutoff = Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000;
  return lastActiveAt.getTime() < cutoff;
}

function isPremium(u: XUser): boolean {
  return !!u.verified_type && PREMIUM_VERIFIED_TYPES.has(u.verified_type);
}

export async function runScan(userId: string): Promise<{ scanRunId: string }> {
  const { accessToken } = await requireAccessToken(userId);

  const scanRun = await prisma.scanRun.create({
    data: { userId, status: "RUNNING" },
  });

  try {
    const [following, followers] = await Promise.all([
      fetchAllConnections(accessToken, userId, "following"),
      fetchAllConnections(accessToken, userId, "followers"),
    ]);

    const combined = new Map<string, XUser>([...following, ...followers]);
    const tweetIds = [...combined.values()]
      .map((u) => u.most_recent_tweet_id)
      .filter((id): id is string => !!id);
    const tweetCreatedAt = await getTweetCreatedAtByIds(accessToken, tweetIds);

    const lastActiveById = new Map<string, Date | null>();
    for (const u of combined.values()) {
      const createdAt = u.most_recent_tweet_id ? tweetCreatedAt.get(u.most_recent_tweet_id) : undefined;
      lastActiveById.set(u.id, createdAt ? new Date(createdAt) : null);
    }

    const followerIds = new Set(followers.keys());
    const results: {
      category: ScanCategory;
      targetUserId: string;
      targetUsername: string;
      targetName: string;
      targetProfileImageUrl: string | null;
      verified: boolean;
      lastActiveAt: Date | null;
    }[] = [];

    for (const u of following.values()) {
      const lastActiveAt = lastActiveById.get(u.id) ?? null;
      const base = {
        targetUserId: u.id,
        targetUsername: u.username,
        targetName: u.name,
        targetProfileImageUrl: u.profile_image_url ?? null,
        verified: isPremium(u),
        lastActiveAt,
      };
      if (!followerIds.has(u.id)) {
        results.push({ category: "NOT_FOLLOWING_BACK", ...base });
      }
      if (!isPremium(u)) {
        results.push({ category: "NON_PREMIUM", ...base });
      }
      if (isInactive(lastActiveAt)) {
        results.push({ category: "INACTIVE_FOLLOWING", ...base });
      }
    }

    for (const u of followers.values()) {
      const lastActiveAt = lastActiveById.get(u.id) ?? null;
      if (isInactive(lastActiveAt)) {
        results.push({
          category: "INACTIVE_FOLLOWER",
          targetUserId: u.id,
          targetUsername: u.username,
          targetName: u.name,
          targetProfileImageUrl: u.profile_image_url ?? null,
          verified: isPremium(u),
          lastActiveAt,
        });
      }
    }

    await prisma.$transaction([
      prisma.scanResult.createMany({
        data: results.map((r) => ({ ...r, scanRunId: scanRun.id })),
      }),
      prisma.scanRun.update({
        where: { id: scanRun.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          followingCount: following.size,
          followersCount: followers.size,
        },
      }),
    ]);

    return { scanRunId: scanRun.id };
  } catch (err) {
    await prisma.scanRun.update({
      where: { id: scanRun.id },
      data: { status: "FAILED", completedAt: new Date(), error: (err as Error).message },
    });
    throw err;
  }
}

export async function getLatestCompletedScan(userId: string) {
  return prisma.scanRun.findFirst({
    where: { userId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    include: { items: true },
  });
}
