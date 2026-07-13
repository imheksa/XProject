"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/apiClient";
import { MOCK_NOTIFICATIONS } from "@/lib/mockData";
import { formatDate } from "@/lib/format";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function NotificationsBell({ demo }: { demo: boolean }) {
  const [items, setItems] = useState<NotificationRow[]>(demo ? MOCK_NOTIFICATIONS : []);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (demo) return;
    api<{ notifications: NotificationRow[] }>("/api/notifications", { method: "POST" })
      .then(({ notifications }) => setItems(notifications))
      .catch(() => {});
  }, [demo]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const unreadCount = items.filter((n) => !n.read).length;

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (!demo) {
      await api(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
    }
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    if (!demo) {
      await api("/api/notifications/read-all", { method: "POST" }).catch(() => {});
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full border border-neutral-800 p-2.5 text-neutral-400 hover:border-neutral-700 hover:text-white"
        aria-label="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#d03b3b] px-1 font-mono text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-xl border border-neutral-800 bg-neutral-900 p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Notifications</div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-neutral-400 hover:text-white">
                Mark all read
              </button>
            )}
          </div>
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {items.length === 0 && <div className="text-xs text-neutral-500">No notifications yet.</div>}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`rounded-lg border p-2 text-left text-xs ${
                  n.read ? "border-neutral-800 text-neutral-500" : "border-[#3987e5]/40 bg-[#3987e5]/5 text-neutral-200"
                }`}
              >
                <div className="font-medium">{n.title}</div>
                <div className="mt-0.5 text-neutral-400">{n.body}</div>
                <div className="mt-1 text-[10px] text-neutral-600">{formatDate(n.createdAt)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
