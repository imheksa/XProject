"use client";

import { useCallback, useEffect, useState } from "react";
import { JOB_TYPE_LABELS, JOB_TYPE_TO_CATEGORY, SCAN_CATEGORIES, type JobType, type ScanCategory } from "@/lib/types";
import { daysAgo, formatDate } from "@/lib/format";

interface Me {
  id: string;
  username: string;
  name: string;
  profileImageUrl: string | null;
}

interface ScanSummary {
  id: string;
  completedAt: string;
  followingCount: number;
  followersCount: number;
  counts: Record<ScanCategory, number>;
}

interface JobRow {
  id: string;
  type: JobType;
  status: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  pausedUntil: string | null;
}

interface ReviewItem {
  targetUserId: string;
  targetUsername: string;
  targetName: string;
  targetProfileImageUrl: string | null;
  verified: boolean;
  lastActiveAt: string | null;
}

const CATEGORY_LABELS: Record<ScanCategory, string> = {
  NOT_FOLLOWING_BACK: "Don't follow you back",
  NON_PREMIUM: "Non-Premium accounts you follow",
  INACTIVE_FOLLOWING: "Accounts you follow, inactive 90+ days",
  INACTIVE_FOLLOWER: "Followers inactive 90+ days",
};

// "unfollow" actions are reversible (you can re-follow); "remove" is the more
// destructive one (X has no direct API to re-add a follower), so it gets the
// critical accent instead of the neutral/info one.
const CATEGORY_ACCENT: Record<ScanCategory, string> = {
  NOT_FOLLOWING_BACK: "#3987e5",
  NON_PREMIUM: "#3987e5",
  INACTIVE_FOLLOWING: "#3987e5",
  INACTIVE_FOLLOWER: "#d03b3b",
};

const CATEGORY_TO_JOB_TYPE = Object.fromEntries(
  (Object.keys(JOB_TYPE_TO_CATEGORY) as JobType[]).map((jt) => [JOB_TYPE_TO_CATEGORY[jt], jt]),
) as Record<ScanCategory, JobType>;

const ACTIVE_STATUSES = new Set(["PENDING", "RUNNING", "PAUSED"]);

// Fixed status palette -- always paired with an icon/label, never color alone.
const JOB_STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  PENDING: { dot: "#3987e5", label: "Queued" },
  RUNNING: { dot: "#3987e5", label: "Running" },
  PAUSED: { dot: "#fab219", label: "Paused (rate limit)" },
  COMPLETED: { dot: "#0ca30c", label: "Completed" },
  FAILED: { dot: "#d03b3b", label: "Failed" },
  CANCELLED: { dot: "#898781", label: "Cancelled" },
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Request to ${path} failed`);
  return json;
}

function StatusDot({ color }: { color: string }) {
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

export default function Dashboard({ me }: { me: Me }) {
  const [scan, setScan] = useState<ScanSummary | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewCategory, setReviewCategory] = useState<ScanCategory | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [confirmType, setConfirmType] = useState<JobType | null>(null);
  const [startingJob, setStartingJob] = useState(false);

  const refreshScan = useCallback(async () => {
    const { scan } = await api<{ scan: ScanSummary | null }>("/api/scan");
    setScan(scan);
  }, []);

  const refreshJobs = useCallback(async () => {
    const { jobs } = await api<{ jobs: JobRow[] }>("/api/jobs");
    setJobs(jobs);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        await Promise.all([refreshScan(), refreshJobs()]);
      } catch (e) {
        setError((e as Error).message);
      }
    }
    void load();
  }, [refreshScan, refreshJobs]);

  useEffect(() => {
    if (!jobs.some((j) => ACTIVE_STATUSES.has(j.status))) return;
    const interval = setInterval(() => refreshJobs().catch(() => {}), 3000);
    return () => clearInterval(interval);
  }, [jobs, refreshJobs]);

  async function handleScan() {
    setScanning(true);
    setError(null);
    try {
      await api("/api/scan", { method: "POST" });
      await refreshScan();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScanning(false);
    }
  }

  async function handleReview(category: ScanCategory) {
    setReviewCategory(category);
    setReviewItems([]);
    try {
      const { items } = await api<{ items: ReviewItem[] }>(`/api/scan/results?category=${category}`);
      setReviewItems(items);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleConfirmStart() {
    if (!confirmType) return;
    setStartingJob(true);
    setError(null);
    try {
      await api("/api/jobs", { method: "POST", body: JSON.stringify({ type: confirmType }) });
      setConfirmType(null);
      await refreshJobs();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStartingJob(false);
    }
  }

  async function handleCancel(jobId: string) {
    try {
      await api(`/api/jobs/${jobId}`, { method: "DELETE" });
      await refreshJobs();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleSignOut() {
    await api("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 p-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {me.profileImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={me.profileImageUrl}
              alt={me.username}
              className="h-12 w-12 rounded-full ring-1 ring-neutral-700"
            />
          )}
          <div>
            <div className="font-semibold">{me.name}</div>
            <div className="text-sm text-neutral-500">@{me.username}</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="rounded-full border border-neutral-800 px-3 py-1.5 text-sm text-neutral-400 hover:border-neutral-700 hover:text-white"
        >
          Sign out
        </button>
      </header>

      {error && (
        <div className="rounded-lg border border-[#d03b3b]/40 bg-[#d03b3b]/10 p-3 text-sm text-[#e66767]">{error}</div>
      )}

      {scan && (
        <section className="grid grid-cols-3 gap-4">
          <StatTile label="Following" value={scan.followingCount} />
          <StatTile label="Followers" value={scan.followersCount} />
          <StatTile label="Last scan" value={formatDate(scan.completedAt)} small />
        </section>
      )}

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold">Account scan</div>
            <div className="text-sm text-neutral-500">
              {scan ? "Rescan any time to refresh these numbers." : "Run a scan to see who to unfollow or remove."}
            </div>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50"
          >
            {scanning ? "Scanning…" : scan ? "Rescan" : "Scan now"}
          </button>
        </div>
      </section>

      {scan && (
        <section className="grid gap-4 sm:grid-cols-2">
          {SCAN_CATEGORIES.map((category) => (
            <div
              key={category}
              className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-5 border-l-2"
              style={{ borderLeftColor: CATEGORY_ACCENT[category] }}
            >
              <div>
                <div className="font-mono text-2xl font-bold tabular-nums">{scan.counts[category]}</div>
                <div className="text-sm text-neutral-400">{CATEGORY_LABELS[category]}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleReview(category)}
                  className="rounded-full border border-neutral-700 px-3 py-1.5 text-xs font-medium hover:bg-neutral-800"
                >
                  Review
                </button>
                <button
                  onClick={() => setConfirmType(CATEGORY_TO_JOB_TYPE[category])}
                  disabled={scan.counts[category] === 0}
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                  style={{ backgroundColor: CATEGORY_ACCENT[category] }}
                >
                  {category === "INACTIVE_FOLLOWER" ? "Remove all" : "Unfollow all"}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {jobs.length > 0 && (
        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="mb-4 font-semibold">Bulk actions</div>
          <div className="flex flex-col gap-4">
            {jobs.map((job) => {
              const style = JOB_STATUS_STYLE[job.status] ?? { dot: "#898781", label: job.status };
              const pct = job.totalItems ? (job.processedItems / job.totalItems) * 100 : 0;
              return (
                <div key={job.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span>{JOB_TYPE_LABELS[job.type]}</span>
                      <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                        <StatusDot color={style.dot} />
                        {style.label}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                      <div
                        className="h-full rounded-full transition-[width]"
                        style={{ width: `${pct}%`, backgroundColor: style.dot }}
                      />
                    </div>
                    <div className="mt-1 font-mono text-xs tabular-nums text-neutral-500">
                      {job.processedItems}/{job.totalItems} processed
                      {job.failedItems > 0 && ` · ${job.failedItems} failed`}
                      {job.status === "PAUSED" && job.pausedUntil && ` · resumes ${formatDate(job.pausedUntil)}`}
                    </div>
                  </div>
                  {ACTIVE_STATUSES.has(job.status) && (
                    <button
                      onClick={() => handleCancel(job.id)}
                      className="shrink-0 rounded-full border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {reviewCategory && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 p-4" onClick={() => setReviewCategory(null)}>
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold">{CATEGORY_LABELS[reviewCategory]}</div>
              <button onClick={() => setReviewCategory(null)} className="text-neutral-400 hover:text-white">
                Close
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {reviewItems.map((item) => (
                <div key={item.targetUserId} className="flex items-center gap-3 text-sm">
                  {item.targetProfileImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.targetProfileImageUrl} alt={item.targetUsername} className="h-8 w-8 rounded-full" />
                  )}
                  <div className="flex-1">
                    <div>{item.targetName}</div>
                    <div className="text-xs text-neutral-500">@{item.targetUsername}</div>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {item.lastActiveAt
                      ? `${daysAgo(item.lastActiveAt)}d inactive`
                      : "no recent activity"}
                  </div>
                </div>
              ))}
              {reviewItems.length === 0 && <div className="text-sm text-neutral-500">Loading…</div>}
            </div>
          </div>
        </div>
      )}

      {confirmType && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmType(null)}>
          <div
            className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 font-semibold">Confirm action</div>
            <p className="mb-4 text-sm text-neutral-400">
              {JOB_TYPE_LABELS[confirmType]}. This will run gradually in the background to stay within X&apos;s rate
              limits, and can&apos;t be undone. Continue?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmType(null)}
                className="rounded-full border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStart}
                disabled={startingJob}
                className="rounded-full bg-[#d03b3b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e66767] disabled:opacity-50"
              >
                {startingJob ? "Starting…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
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
