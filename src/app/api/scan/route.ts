import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getLatestCompletedScan, runScan } from "@/lib/scan";
import { SCAN_CATEGORIES } from "@/lib/types";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const { scanRunId } = await runScan(userId);
    return NextResponse.json({ scanRunId });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const scan = await getLatestCompletedScan(userId);
  if (!scan) return NextResponse.json({ scan: null });

  const counts = Object.fromEntries(SCAN_CATEGORIES.map((c) => [c, 0])) as Record<string, number>;
  for (const item of scan.items) counts[item.category] += 1;

  return NextResponse.json({
    scan: {
      id: scan.id,
      completedAt: scan.completedAt,
      followingCount: scan.followingCount,
      followersCount: scan.followersCount,
      counts,
    },
  });
}
