"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { MOCK_PROFILE } from "@/lib/mockData";
import MetricsGrid from "@/components/MetricsGrid";

interface Me {
  id: string;
  username: string;
  name: string;
  profileImageUrl: string | null;
}

interface ProfileSummary {
  followersCount: number;
  followingCount: number;
  postsLast30d: number;
}

export default function OverviewSection({ me, demo }: { me: Me; demo: boolean }) {
  const [profile, setProfile] = useState<ProfileSummary | null>(demo ? MOCK_PROFILE : null);

  useEffect(() => {
    if (demo) return;
    api<{ profile: ProfileSummary | null }>("/api/profile", { method: "POST" })
      .then(({ profile }) => setProfile(profile))
      .catch(() => {});
  }, [demo]);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        {me.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={me.profileImageUrl}
            alt={me.username}
            className="h-16 w-16 rounded-full ring-1 ring-neutral-700"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-800 text-xl font-semibold text-neutral-400 ring-1 ring-neutral-700">
            {me.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <div className="text-lg font-semibold">{me.name}</div>
          <div className="text-sm text-neutral-500">@{me.username}</div>
        </div>
      </section>

      {profile && (
        <section className="grid grid-cols-3 gap-4">
          <StatTile label="Total followers" value={profile.followersCount} />
          <StatTile label="Total following" value={profile.followingCount} />
          <StatTile label="Total posts (30d)" value={profile.postsLast30d} />
        </section>
      )}

      <MetricsGrid demo={demo} />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 font-mono text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
