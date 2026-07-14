"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { MOCK_COMPETITORS, MOCK_COMPETITOR_COMPARE } from "@/lib/mockData";
import CompareGrowthChart from "@/components/CompareGrowthChart";

interface CompetitorOption {
  id: string;
  username: string;
}

interface CompareData {
  id: string;
  username: string;
  growth: { date: string; followersCount: number }[];
  totals: {
    postsLast30d: number;
    totalLikes: number;
    totalRetweets: number;
    totalReplies: number;
    engagementRatePct: number | null;
  };
}

export interface YourSide {
  growth: { date: string; value: number }[];
  totalPosts: number;
  totalLikes: number;
  totalRetweets: number;
  totalReplies: number;
  engagementRatePct: number | null;
}

export default function CompetitorCompare({
  demo,
  windowDays,
  you,
}: {
  demo: boolean;
  windowDays: 7 | 30;
  you: YourSide;
}) {
  const [options, setOptions] = useState<CompetitorOption[]>(
    demo ? MOCK_COMPETITORS.map((c) => ({ id: c.id, username: c.username })) : [],
  );
  const [selectedId, setSelectedId] = useState("");
  const [compare, setCompare] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (demo) return;
    api<{ competitors: CompetitorOption[] }>("/api/competitors")
      .then(({ competitors }) => setOptions(competitors))
      .catch(() => {});
  }, [demo]);

  const loadCompare = useCallback(
    async (id: string) => {
      if (!id) {
        setCompare(null);
        return;
      }
      setLoading(true);
      if (demo) {
        setCompare(MOCK_COMPETITOR_COMPARE[windowDays]);
        setLoading(false);
        return;
      }
      try {
        const { comparison } = await api<{ comparison: CompareData }>(`/api/competitors/${id}/compare?window=${windowDays}`);
        setCompare(comparison);
      } finally {
        setLoading(false);
      }
    },
    [demo, windowDays],
  );

  useEffect(() => {
    async function run() {
      await loadCompare(selectedId);
    }
    void run();
  }, [selectedId, loadCompare]);

  if (options.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 p-4 text-sm text-neutral-500">
        Track a competitor in the Competitors tab to compare them here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="w-full rounded-full border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm outline-none focus:border-neutral-500"
      >
        <option value="">Compare with a tracked competitor…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            @{o.username}
          </option>
        ))}
      </select>

      {loading && <div className="text-sm text-neutral-500">Loading…</div>}

      {!loading && compare && (
        <>
          <CompareGrowthChart
            you={you.growth}
            competitor={compare.growth.map((g) => ({ date: g.date, value: g.followersCount }))}
            youLabel="You"
            competitorLabel={`@${compare.username}`}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <CompareStat label="Posts" you={you.totalPosts} them={compare.totals.postsLast30d} />
            <CompareStat
              label="Engagement rate"
              you={you.engagementRatePct}
              them={compare.totals.engagementRatePct}
              format={(v) => `${v.toFixed(2)}%`}
            />
            <CompareStat label="Likes" you={you.totalLikes} them={compare.totals.totalLikes} />
            <CompareStat label="Comments" you={you.totalReplies} them={compare.totals.totalReplies} />
            <CompareStat label="Reposts" you={you.totalRetweets} them={compare.totals.totalRetweets} />
          </div>
          <div className="text-xs text-neutral-600">
            Your numbers reflect the {windowDays}D window above; @{compare.username}&apos;s reflect their last 30 days.
          </div>
        </>
      )}
    </div>
  );
}

function CompareStat({
  label,
  you,
  them,
  format,
}: {
  label: string;
  you: number | null;
  them: number | null;
  format?: (v: number) => string;
}) {
  const fmt = format ?? ((v: number) => v.toLocaleString());
  return (
    <div className="rounded-lg border border-neutral-800 p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="font-mono text-base font-bold tabular-nums">{you === null ? "–" : fmt(you)}</span>
        <span className="text-xs text-neutral-500">you</span>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between">
        <span className="font-mono text-sm tabular-nums text-neutral-400">{them === null ? "–" : fmt(them)}</span>
        <span className="text-xs text-neutral-600">them</span>
      </div>
    </div>
  );
}
