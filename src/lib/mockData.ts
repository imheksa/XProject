import type { ScanCategory } from "@/lib/types";

export const MOCK_ME = {
  id: "demo",
  username: "demo_user",
  name: "Demo Account",
  profileImageUrl: null as string | null,
};

const now = () => new Date();
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

export const MOCK_PROFILE = {
  followersCount: 1240,
  followingCount: 890,
  postsLast30d: 34,
  followersGrowth30d: 18,
  followersGrowthSince: daysAgo(30).toISOString(),
  capturedAt: now().toISOString(),
};

export const MOCK_SCAN = {
  id: "demo-scan",
  completedAt: now().toISOString(),
  followingCount: 890,
  followersCount: 1240,
  counts: {
    NOT_FOLLOWING_BACK: 156,
    NON_PREMIUM: 612,
    INACTIVE_FOLLOWING: 89,
    INACTIVE_FOLLOWER: 210,
  } as Record<ScanCategory, number>,
};

const NAMES = [
  ["alice_dev", "Alice Chen"],
  ["bob_writes", "Bob Nguyen"],
  ["carol.codes", "Carol Ibrahim"],
  ["dave_designs", "Dave Okafor"],
  ["erin_travels", "Erin Kowalski"],
  ["frank_music", "Frank Tanaka"],
  ["gina_art", "Gina Rossi"],
];

function mockItemsFor(category: ScanCategory, count: number, inactive: boolean) {
  return Array.from({ length: Math.min(count, NAMES.length) }, (_, i) => {
    const [username, name] = NAMES[i];
    return {
      targetUserId: `${category}-${i}`,
      targetUsername: username,
      targetName: name,
      targetProfileImageUrl: null as string | null,
      verified: category === "NON_PREMIUM" ? false : i % 3 === 0,
      lastActiveAt: inactive ? daysAgo(90 + i * 12).toISOString() : now().toISOString(),
    };
  });
}

export const MOCK_REVIEW_ITEMS: Record<ScanCategory, ReturnType<typeof mockItemsFor>> = {
  NOT_FOLLOWING_BACK: mockItemsFor("NOT_FOLLOWING_BACK", 156, false),
  NON_PREMIUM: mockItemsFor("NON_PREMIUM", 612, false),
  INACTIVE_FOLLOWING: mockItemsFor("INACTIVE_FOLLOWING", 89, true),
  INACTIVE_FOLLOWER: mockItemsFor("INACTIVE_FOLLOWER", 210, true),
};

export const MOCK_JOBS_SEED = [
  {
    id: "demo-job-1",
    type: "UNFOLLOW_NON_PREMIUM" as const,
    status: "COMPLETED",
    totalItems: 40,
    processedItems: 40,
    failedItems: 1,
    pausedUntil: null as string | null,
  },
  {
    id: "demo-job-2",
    type: "REMOVE_INACTIVE_FOLLOWERS" as const,
    status: "PAUSED",
    totalItems: 60,
    processedItems: 22,
    failedItems: 0,
    pausedUntil: new Date(Date.now() + 18 * 60 * 1000).toISOString(),
  },
];
