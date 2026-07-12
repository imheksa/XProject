import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getLatestCompletedScan } from "@/lib/scan";
import { SCAN_CATEGORIES, type ScanCategory } from "@/lib/types";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const category = new URL(req.url).searchParams.get("category") as ScanCategory | null;
  if (!category || !SCAN_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid or missing category" }, { status: 400 });
  }

  const scan = await getLatestCompletedScan(userId);
  if (!scan) return NextResponse.json({ items: [] });

  const items = scan.items
    .filter((i) => i.category === category)
    .map((i) => ({
      targetUserId: i.targetUserId,
      targetUsername: i.targetUsername,
      targetName: i.targetName,
      targetProfileImageUrl: i.targetProfileImageUrl,
      verified: i.verified,
      lastActiveAt: i.lastActiveAt,
    }));

  return NextResponse.json({ items });
}
