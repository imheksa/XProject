import { prisma } from "@/lib/prisma";
import { requireAccessToken } from "@/lib/auth";
import { RateLimitedError, removeFollower, unfollowUser } from "@/lib/x-api";

// Conservative global pacing between individual follow/unfollow/block API calls.
// This is intentionally cautious and independent of the exact rate limit numbers
// for your API tier (which change over time) -- the live 429 handling below is
// the real safety net; this just avoids bursting requests.
const MIN_ACTION_INTERVAL_MS = Number(process.env.MIN_ACTION_INTERVAL_MS ?? 3000);

let lastActionAt = 0;
let loopStarted = false;

/** Processes at most one job item across all active jobs. Safe to call repeatedly. */
export async function tick(): Promise<void> {
  const now = Date.now();
  if (now - lastActionAt < MIN_ACTION_INTERVAL_MS) return;

  const job = await prisma.job.findFirst({
    where: {
      status: { in: ["PENDING", "RUNNING"] },
      OR: [{ pausedUntil: null }, { pausedUntil: { lte: new Date() } }],
    },
    orderBy: { createdAt: "asc" },
  });
  if (!job) return;

  if (job.status === "PENDING") {
    await prisma.job.update({ where: { id: job.id }, data: { status: "RUNNING", pausedUntil: null } });
  }

  const item = await prisma.jobItem.findFirst({
    where: { jobId: job.id, status: "PENDING" },
    orderBy: { id: "asc" },
  });
  if (!item) {
    await prisma.job.update({ where: { id: job.id }, data: { status: "COMPLETED" } });
    return;
  }

  lastActionAt = now;
  try {
    const { accessToken } = await requireAccessToken(job.userId);
    if (job.type === "REMOVE_INACTIVE_FOLLOWERS") {
      await removeFollower(accessToken, job.userId, item.targetUserId);
    } else {
      await unfollowUser(accessToken, job.userId, item.targetUserId);
    }
    await prisma.$transaction([
      prisma.jobItem.update({ where: { id: item.id }, data: { status: "DONE", processedAt: new Date() } }),
      prisma.job.update({ where: { id: job.id }, data: { processedItems: { increment: 1 } } }),
    ]);
  } catch (err) {
    if (err instanceof RateLimitedError) {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "PAUSED", pausedUntil: new Date(err.rateLimitReset! * 1000) },
      });
      return;
    }
    await prisma.$transaction([
      prisma.jobItem.update({
        where: { id: item.id },
        data: { status: "FAILED", error: (err as Error).message, processedAt: new Date() },
      }),
      prisma.job.update({
        where: { id: job.id },
        data: { processedItems: { increment: 1 }, failedItems: { increment: 1 } },
      }),
    ]);
  }

  const remaining = await prisma.jobItem.count({ where: { jobId: job.id, status: "PENDING" } });
  if (remaining === 0) {
    await prisma.job.update({ where: { id: job.id }, data: { status: "COMPLETED" } });
  }
}

/**
 * Starts an in-process interval that drives `tick()`. Intended for a
 * long-running Node server (`next start`). Call once from instrumentation.ts.
 * If you deploy to a serverless platform without a long-running process,
 * hit POST /api/jobs/tick from an external cron instead.
 */
export function startWorkerLoop(): void {
  if (loopStarted) return;
  loopStarted = true;
  setInterval(() => {
    tick().catch((err) => console.error("Job worker tick failed:", err));
  }, 1000);
}
