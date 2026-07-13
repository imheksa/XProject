"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { MOCK_ANALYTICS } from "@/lib/mockData";
import { formatDate } from "@/lib/format";
import GrowthChart from "@/components/GrowthChart";

interface TopPost {
  id: string;
  text: string;
  postedAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  quoteCount: number;
  engagement: number;
}

interface AnalyticsSummary {
  windowDays: 7 | 30;
  totalPosts: number;
  totalEngagement: number;
  engagementRatePct: number | null;
  replySharePct: number | null;
  growth: { date: string; followersCount: number }[];
  topPosts: TopPost[];
}

export default function AnalyticsSection({ demo }: { demo: boolean }) {
  const [windowDays, setWindowDays] = useState<7 | 30>(30);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (w: 7 | 30) => {
      setLoading(true);
      if (demo) {
        setData(MOCK_ANALYTICS[w]);
        setLoading(false);
        return;
      }
      try {
        const { analytics } = await api<{ analytics: AnalyticsSummary | null }>(`/api/analytics?window=${w}`);
        setData(analytics);
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

  if (!loading && !data) return null;

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-semibold">Analytics</div>
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

      {!loading && data && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniStat label="Posts" value={data.totalPosts} />
            <MiniStat label="Total engagement" value={data.totalEngagement} />
            <MiniStat
              label="Engagement rate"
              value={data.engagementRatePct !== null ? `${data.engagementRatePct.toFixed(2)}%` : "–"}
            />
            <MiniStat label="Reply share" value={data.replySharePct !== null ? `${data.replySharePct.toFixed(0)}%` : "–"} />
          </div>

          <div>
            <div className="mb-2 text-xs text-neutral-500">Follower growth</div>
            <GrowthChart data={data.growth} />
          </div>

          <div>
            <div className="mb-2 text-xs text-neutral-500">Top content ({windowDays}D)</div>
            <div className="flex flex-col gap-2">
              {data.topPosts.length === 0 && <div className="text-sm text-neutral-500">No posts in this window.</div>}
              {data.topPosts.map((p) => (
                <div key={p.id} className="rounded-lg border border-neutral-800 p-3 text-sm">
                  <div className="line-clamp-2 text-neutral-200">{p.text}</div>
                  <div className="mt-1 flex flex-wrap gap-3 font-mono text-xs tabular-nums text-neutral-500">
                    <span>{formatDate(p.postedAt)}</span>
                    <span>♥ {p.likeCount}</span>
                    <span>↻ {p.retweetCount}</span>
                    <span>↩ {p.replyCount}</span>
                    <span>{p.engagement} total</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-neutral-800 p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
