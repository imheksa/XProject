"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { MOCK_METRIC_SERIES } from "@/lib/mockData";
import MiniSparkline from "@/components/MiniSparkline";

interface MetricPoint {
  date: string;
  followersCount: number;
  postsCount: number;
  likes: number;
  retweets: number;
  replies: number;
  engagementRatePct: number;
}

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

export default function MetricsGrid({ demo }: { demo: boolean }) {
  const [windowDays, setWindowDays] = useState<7 | 30>(30);
  const [series, setSeries] = useState<MetricPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (w: 7 | 30) => {
      setLoading(true);
      if (demo) {
        setSeries(MOCK_METRIC_SERIES[w]);
        setLoading(false);
        return;
      }
      try {
        const { series } = await api<{ series: MetricPoint[] }>(`/api/analytics/series?window=${w}`);
        setSeries(series);
      } finally {
        setLoading(false);
      }
    },
    [demo],
  );

  useEffect(() => {
    async function run() {
      await load(windowDays);
    }
    void run();
  }, [windowDays, load]);

  const followers = series.map((s) => s.followersCount);
  const engagementRate = series.map((s) => s.engagementRatePct);
  const posts = series.map((s) => s.postsCount);
  const replies = series.map((s) => s.replies);
  const likes = series.map((s) => s.likes);
  const reposts = series.map((s) => s.retweets);

  const followerDelta = followers.length >= 2 ? followers[followers.length - 1] - followers[0] : 0;
  const avgEngagementRate = engagementRate.length ? sum(engagementRate) / engagementRate.length : 0;

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-semibold">Metrics</div>
        <div className="flex gap-0.5 rounded-full border border-neutral-800 p-0.5 text-xs">
          {([7, 30] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWindowDays(w)}
              className={`rounded-full px-3 py-1 ${
                windowDays === w ? "bg-white font-semibold text-black" : "text-neutral-400 hover:text-white"
              }`}
            >
              {w}D
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-sm text-neutral-500">Loading…</div>}

      {!loading && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <MetricCard
            label="Follower growth"
            headline={`${followerDelta > 0 ? "+" : ""}${followerDelta}`}
            headlineColor={followerDelta > 0 ? "#0ca30c" : followerDelta < 0 ? "#d03b3b" : undefined}
            values={followers}
          />
          <MetricCard label="Engagement rate" headline={`${avgEngagementRate.toFixed(2)}%`} values={engagementRate} />
          <MetricCard label="Total posts" headline={sum(posts).toLocaleString()} values={posts} />
          <MetricCard label="Total comments" headline={sum(replies).toLocaleString()} values={replies} />
          <MetricCard label="Likes" headline={sum(likes).toLocaleString()} values={likes} />
          <MetricCard label="Reposts" headline={sum(reposts).toLocaleString()} values={reposts} />
        </div>
      )}
    </section>
  );
}

function MetricCard({
  label,
  headline,
  headlineColor,
  values,
}: {
  label: string;
  headline: string;
  headlineColor?: string;
  values: number[];
}) {
  return (
    <div className="rounded-lg border border-neutral-800 p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold tabular-nums" style={{ color: headlineColor }}>
        {headline}
      </div>
      <div className="mt-2">
        <MiniSparkline data={values} />
      </div>
    </div>
  );
}
