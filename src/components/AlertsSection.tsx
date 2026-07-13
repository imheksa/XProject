"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { MOCK_NOTIFICATIONS } from "@/lib/mockData";
import { formatDate } from "@/lib/format";
import PreferencesForm from "@/components/PreferencesForm";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export default function AlertsSection({ demo }: { demo: boolean }) {
  const [items, setItems] = useState<NotificationRow[]>(demo ? MOCK_NOTIFICATIONS : []);
  const [loading, setLoading] = useState(!demo);

  useEffect(() => {
    if (demo) return;
    api<{ notifications: NotificationRow[] }>("/api/notifications")
      .then(({ notifications }) => setItems(notifications))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [demo]);

  return (
    <div className="flex flex-col gap-6">
      <PreferencesForm demo={demo} />

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-4 font-semibold">Recent alerts</div>
        {loading && <div className="text-sm text-neutral-500">Loading…</div>}
        <div className="flex flex-col gap-2">
          {!loading && items.length === 0 && (
            <div className="text-sm text-neutral-500">
              No alerts yet. Set a niche/keywords above to start getting matches.
            </div>
          )}
          {items.map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border p-3 text-sm ${
                n.read ? "border-neutral-800" : "border-[#3987e5]/40 bg-[#3987e5]/5"
              }`}
            >
              <div className="font-medium">{n.title}</div>
              <div className="mt-0.5 text-neutral-400">{n.body}</div>
              <div className="mt-1 text-xs text-neutral-600">{formatDate(n.createdAt)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
