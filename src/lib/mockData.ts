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

function mockMetricSeries(windowDays: 7 | 30) {
  const startFollowers = 1240 - 18 * (windowDays / 30);
  return Array.from({ length: windowDays }, (_, i) => {
    const followersCount = Math.round(startFollowers + (18 * (windowDays / 30) * i) / (windowDays - 1) + Math.sin(i) * 2);
    const postsCount = Math.random() < 0.6 ? Math.round(Math.random() * 2) : 0;
    const likes = postsCount ? Math.round(80 + Math.random() * 300) : 0;
    const retweets = Math.round(likes * 0.18);
    const replies = Math.round(likes * 0.12);
    const engagementRatePct = followersCount > 0 ? ((likes + retweets + replies) / followersCount) * 100 : 0;
    return {
      date: daysAgo(windowDays - 1 - i).toISOString(),
      followersCount,
      postsCount,
      likes,
      retweets,
      replies,
      engagementRatePct,
    };
  });
}

export const MOCK_METRIC_SERIES: Record<7 | 30, ReturnType<typeof mockMetricSeries>> = {
  7: mockMetricSeries(7),
  30: mockMetricSeries(30),
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

const TOP_POST_TEXTS = [
  "Shipped a big update today — here's what's new and why it matters for you.",
  "Hot take: most \"productivity\" advice is just procrastination with extra steps.",
  "Thread: everything I learned building this in public over the last 90 days 🧵",
  "Small thing that made a huge difference this week.",
  "Ask me anything — I'll answer the best ones tonight.",
];

function mockAnalytics(windowDays: 7 | 30) {
  const postCount = windowDays === 7 ? 8 : 34;
  const topPosts = TOP_POST_TEXTS.map((text, i) => {
    const likeCount = Math.round((windowDays === 7 ? 420 : 1200) / (i + 1));
    const retweetCount = Math.round(likeCount * 0.18);
    const replyCount = Math.round(likeCount * 0.12);
    const quoteCount = Math.round(likeCount * 0.05);
    return {
      id: `demo-post-${i}`,
      text,
      postedAt: daysAgo(i * 2 + 1).toISOString(),
      likeCount,
      retweetCount,
      replyCount,
      quoteCount,
      engagement: likeCount + retweetCount + replyCount + quoteCount,
    };
  });
  const totalLikes = topPosts.reduce((a, p) => a + p.likeCount, 0);
  const totalRetweets = topPosts.reduce((a, p) => a + p.retweetCount, 0);
  const totalReplies = topPosts.reduce((a, p) => a + p.replyCount, 0);
  const totalQuotes = topPosts.reduce((a, p) => a + p.quoteCount, 0);
  const totalEngagement = totalLikes + totalRetweets + totalReplies + totalQuotes;

  const growthPoints = windowDays === 7 ? 7 : 12;
  const growth = Array.from({ length: growthPoints }, (_, i) => ({
    date: daysAgo(windowDays - (i * windowDays) / (growthPoints - 1)).toISOString(),
    followersCount: 1180 + Math.round((i / (growthPoints - 1)) * 60 + Math.sin(i) * 5),
  }));

  return {
    windowDays,
    totalPosts: postCount,
    totalEngagement,
    totalLikes,
    totalRetweets,
    totalReplies,
    totalQuotes,
    avgEngagementPerPost: totalEngagement / topPosts.length,
    engagementRatePct: (totalEngagement / topPosts.length / 1240) * 100,
    replySharePct: (totalReplies / totalEngagement) * 100,
    followingFollowersRatio: 890 / 1240,
    growth,
    topPosts,
  };
}

export const MOCK_ANALYTICS: Record<7 | 30, ReturnType<typeof mockAnalytics>> = {
  7: mockAnalytics(7),
  30: mockAnalytics(30),
};

export function mockTopPost(seed: number) {
  const likeCount = 300 + seed * 47;
  const retweetCount = Math.round(likeCount * 0.2);
  const replyCount = Math.round(likeCount * 0.1);
  const quoteCount = Math.round(likeCount * 0.04);
  return {
    id: `demo-competitor-post-${seed}`,
    text: "We just crossed a big milestone -- here's a behind-the-scenes look at how we got here.",
    postedAt: daysAgo(3).toISOString(),
    likeCount,
    retweetCount,
    replyCount,
    quoteCount,
    engagement: likeCount + retweetCount + replyCount + quoteCount,
  };
}

export const MOCK_COMPETITORS = [
  {
    id: "demo-competitor-1",
    username: "rival_creator",
    followersCount: 2100,
    followingCount: 340,
    postsLast30d: 21,
    followersGrowth30d: 45,
    vsYourFollowers: 2100 - 1240,
    vsYourPosts30d: 21 - 34,
    topPost: mockTopPost(1),
  },
];

export const MOCK_NOTIFICATIONS = [
  {
    id: "demo-notif-1",
    type: "TREND_MATCH",
    title: "#BuildInPublic",
    body: '"#BuildInPublic" is trending and matches your niche/keywords (48,200 posts).',
    read: false,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-notif-2",
    type: "TREND_MATCH",
    title: "indie hackers",
    body: '"indie hackers" is trending and matches your niche/keywords (12,900 posts).',
    read: true,
    createdAt: daysAgo(1).toISOString(),
  },
];

export const MOCK_PREFERENCES = {
  niche: "Indie SaaS / dev tools",
  keywords: ["build in public", "indie hacker", "saas"],
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
