"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { MOCK_METRIC_SERIES } from "@/lib/mockData";
import { formatDate } from "@/lib/format";
import MiniSparkline from "@/components/MiniSparkline";
import GrowthChart from "@/components/GrowthChart";

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
  const [selected, setSelected] = useState<string | null>(null);

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

  const dates = series.map((s) => s.date);
  const followers = series.map((s) => s.followersCount);
  const engagementRate = series.map((s) => s.engagementRatePct);
  const posts = series.map((s) => s.postsCount);
  const replies = series.map((s) => s.replies);
  const likes = series.map((s) => s.likes);
  const reposts = series.map((s) => s.retweets);

  const followerDelta = followers.length >= 2 ? followers[followers.length - 1] - followers[0] : 0;
  const avgEngagementRate = engagementRate.length ? sum(engagementRate) / engagementRate.length : 0;

  const metrics = [
    {
      id: "followers",
      label: "Follower growth",
      headline: `${followerDelta > 0 ? "+" : ""}${followerDelta}`,
      headlineColor: followerDelta > 0 ? "#0ca30c" : followerDelta < 0 ? "#d03b3b" : undefined,
      values: followers,
      formatValue: (v: number) => Math.round(v).toLocaleString(),
    },
    {
      id: "engagementRate",
      label: "Engagement rate",
      headline: `${avgEngagementRate.toFixed(2)}%`,
      values: engagementRate,
      formatValue: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      id: "posts",
      label: "Total posts",
      headline: sum(posts).toLocaleString(),
      values: posts,
      formatValue: (v: number) => Math.round(v).toLocaleString(),
    },
    {
      id: "comments",
      label: "Total comments",
      headline: sum(replies).toLocaleString(),
      values: replies,
      formatValue: (v: number) => Math.round(v).toLocaleString(),
    },
    {
      id: "likes",
      label: "Likes",
      headline: sum(likes).toLocaleString(),
      values: likes,
      formatValue: (v: number) => Math.round(v).toLocaleString(),
    },
    {
      id: "reposts",
      label: "Reposts",
      headline: sum(reposts).toLocaleString(),
      values: reposts,
      formatValue: (v: number) => Math.round(v).toLocaleString(),
    },
  ];

  const selectedMetric = metrics.find((m) => m.id === selected) ?? null;

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
          {metrics.map((m) => (
            <MetricCard
              key={m.id}
              label={m.label}
              headline={m.headline}
              headlineColor={m.headlineColor}
              values={m.values}
              onClick={() => setSelected(m.id)}
            />
          ))}
        </div>
      )}

      {selectedMetric && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelected(null)}>
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <div className="font-semibold">{selectedMetric.label}</div>
              <button onClick={() => setSelected(null)} className="text-neutral-400 hover:text-white">
                Close
              </button>
            </div>
            <div
              className="mb-4 font-mono text-2xl font-bold tabular-nums"
              style={{ color: selectedMetric.headlineColor }}
            >
              {selectedMetric.headline}
            </div>
            <GrowthChart
              data={dates.map((date, i) => ({ date, value: selectedMetric.values[i] }))}
              valueFormat={selectedMetric.formatValue}
            />
            <div className="mt-4 flex flex-col gap-1 text-sm">
              {dates
                .map((date, i) => ({ date, value: selectedMetric.values[i] }))
                .reverse()
                .map((row) => (
                  <div key={row.date} className="flex items-center justify-between border-b border-neutral-800 py-1.5 last:border-0">
                    <span className="text-neutral-500">{formatDate(row.date)}</span>
                    <span className="font-mono tabular-nums">{selectedMetric.formatValue(row.value)}</span>
                  </div>
                ))}
            </div>
          </div>
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
  onClick,
}: {
  label: string;
  headline: string;
  headlineColor?: string;
  values: number[];
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="rounded-lg border border-neutral-800 p-3 text-left hover:border-neutral-700">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold tabular-nums" style={{ color: headlineColor }}>
        {headline}
      </div>
      <div className="mt-2">
        <MiniSparkline data={values} />
      </div>
    </button>
  );
}
