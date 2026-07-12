import { prisma } from "@/lib/prisma";
import { getLatestCompletedScan } from "@/lib/scan";
import { JOB_TYPE_TO_CATEGORY, type JobType } from "@/lib/types";

export async function createJobFromLatestScan(userId: string, type: JobType) {
  const scan = await getLatestCompletedScan(userId);
  if (!scan) {
    throw new Error("Run a scan first before starting a bulk action.");
  }

  const category = JOB_TYPE_TO_CATEGORY[type];
  const targets = scan.items.filter((i) => i.category === category);
  if (targets.length === 0) {
    throw new Error("No accounts matched this action in the latest scan.");
  }

  return prisma.job.create({
    data: {
      userId,
      type,
      status: "PENDING",
      totalItems: targets.length,
      items: {
        create: targets.map((t) => ({
          targetUserId: t.targetUserId,
          targetUsername: t.targetUsername,
          status: "PENDING",
        })),
      },
    },
    include: { items: true },
  });
}

export async function cancelJob(userId: string, jobId: string) {
  const job = await prisma.job.findFirstOrThrow({ where: { id: jobId, userId } });
  await prisma.$transaction([
    prisma.jobItem.updateMany({
      where: { jobId: job.id, status: "PENDING" },
      data: { status: "SKIPPED" },
    }),
    prisma.job.update({ where: { id: job.id }, data: { status: "CANCELLED" } }),
  ]);
}
