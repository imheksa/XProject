"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";
import { MOCK_PROFILE } from "@/lib/mockData";
import { IconUserMinus, IconChart, IconCompare, IconBell } from "@/components/icons";

interface ProfileSummary {
  followersCount: number;
  followingCount: number;
  postsLast30d: number;
  followersGrowth30d: number | null;
  followersGrowthSince: string | null;
  capturedAt: string;
}

const QUICK_LINKS = [
  {
    id: "cleanup",
    label: "Clean Up",
    description: "Unfollow non-followers, non-Premium or inactive accounts, or remove inactive followers.",
    icon: <IconUserMinus />,
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Engagement, reply share, follower growth, and your top posts.",
    icon: <IconChart />,
  },
  {
    id: "competitors",
    label: "Competitors",
    description: "See how your numbers stack up against accounts you're tracking.",
    icon: <IconCompare />,
  },
  {
    id: "alerts",
    label: "Alerts",
    description: "Set a niche and keywords to get notified about matching trends.",
    icon: <IconBell />,
  },
];

export default function OverviewSection({ demo, onNavigate }: { demo: boolean; onNavigate: (id: string) => void }) {
  const [profile, setProfile] = useState<ProfileSummary | null>(demo ? MOCK_PROFILE : null);

  useEffect(() => {
    if (demo) return;
    api<{ profile: ProfileSummary | null }>("/api/profile", { method: "POST" })
      .then(({ profile }) => setProfile(profile))
      .catch(() => {});
  }, [demo]);

  return (
    <div className="flex flex-col gap-6">
      {profile && (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="Followers" value={profile.followersCount} />
          <StatTile label="Following" value={profile.followingCount} />
          <StatTile label="Posts (30d)" value={profile.postsLast30d} />
          <GrowthTile growth={profile.followersGrowth30d} since={profile.followersGrowthSince} />
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        {QUICK_LINKS.map((link) => (
          <button
            key={link.id}
            onClick={() => onNavigate(link.id)}
            className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-left hover:border-neutral-700"
          >
            <div className="flex items-center gap-2 font-semibold text-neutral-200">
              {link.icon}
              {link.label}
            </div>
            <div className="text-sm text-neutral-500">{link.description}</div>
          </button>
        ))}
      </section>
    </div>
  );
}

function StatTile({ label, value, small }: { label: string; value: number | string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`mt-1 font-mono tabular-nums ${small ? "text-base font-medium" : "text-2xl font-bold"}`}>
        {value}
      </div>
    </div>
  );
}

function GrowthTile({ growth, since }: { growth: number | null; since: string | null }) {
  const color = growth === null || growth === 0 ? "#898781" : growth > 0 ? "#0ca30c" : "#d03b3b";
  const display = growth === null ? "–" : `${growth > 0 ? "+" : ""}${growth}`;
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="text-xs text-neutral-500">Followers growth (30d)</div>
      <div className="mt-1 font-mono text-2xl font-bold tabular-nums" style={{ color }}>
        {display}
      </div>
      <div className="mt-0.5 text-xs text-neutral-600">
        {since ? `since ${formatDate(since)}` : "not enough history yet"}
      </div>
    </div>
  );
}
