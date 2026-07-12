import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { createJobFromLatestScan } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { JOB_TYPES, type JobType } from "@/lib/types";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const jobs = await prisma.job.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const type = body.type as JobType;
  if (!JOB_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid job type" }, { status: 400 });
  }

  try {
    const job = await createJobFromLatestScan(userId, type);
    return NextResponse.json({ job });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
