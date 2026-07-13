"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import Sidebar, { type NavItem } from "@/components/Sidebar";
import NotificationsBell from "@/components/NotificationsBell";
import OverviewSection from "@/components/OverviewSection";
import CleanupSection from "@/components/CleanupSection";
import AnalyticsSection from "@/components/AnalyticsSection";
import CompetitorsSection from "@/components/CompetitorsSection";
import AlertsSection from "@/components/AlertsSection";
import { IconHome, IconUserMinus, IconChart, IconCompare, IconBell } from "@/components/icons";

interface Me {
  id: string;
  username: string;
  name: string;
  profileImageUrl: string | null;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: <IconHome /> },
  { id: "cleanup", label: "Clean Up", icon: <IconUserMinus /> },
  { id: "analytics", label: "Analytics", icon: <IconChart /> },
  { id: "competitors", label: "Competitors", icon: <IconCompare /> },
  { id: "alerts", label: "Alerts", icon: <IconBell /> },
];

export default function Dashboard({ me, demo = false }: { me: Me; demo?: boolean }) {
  const [active, setActive] = useState("overview");

  async function handleSignOut() {
    if (demo) {
      window.location.href = "/";
      return;
    }
    await api("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      {demo && (
        <div className="border-b border-[#3987e5]/40 bg-[#3987e5]/10 p-3 text-center text-sm text-[#86b6ef]">
          Demo mode &mdash; all data on this page is mock data. Nothing here calls X or touches a real account.{" "}
          <Link href="/" className="underline hover:no-underline">
            Back to home
          </Link>
        </div>
      )}

      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div className="flex items-center gap-3">
          {me.profileImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={me.profileImageUrl}
              alt={me.username}
              className="h-10 w-10 rounded-full ring-1 ring-neutral-700"
            />
          )}
          <div>
            <div className="font-semibold">{me.name}</div>
            <div className="text-sm text-neutral-500">@{me.username}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsBell demo={demo} />
          <button
            onClick={handleSignOut}
            className="rounded-full border border-neutral-800 px-3 py-1.5 text-sm text-neutral-400 hover:border-neutral-700 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar items={NAV_ITEMS} active={active} onSelect={setActive} />

        <main className="flex-1 p-6">
          <div className="mx-auto w-full max-w-3xl">
            {active === "overview" && <OverviewSection demo={demo} onNavigate={setActive} />}
            {active === "cleanup" && <CleanupSection demo={demo} />}
            {active === "analytics" && <AnalyticsSection demo={demo} />}
            {active === "competitors" && <CompetitorsSection demo={demo} />}
            {active === "alerts" && <AlertsSection demo={demo} />}
          </div>
        </main>
      </div>
    </div>
  );
}
