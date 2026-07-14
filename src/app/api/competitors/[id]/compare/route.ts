import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getCompetitorAnalyticsComparison } from "@/lib/competitors";
import type { AnalyticsWindow } from "@/lib/analytics";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const windowParam = new URL(req.url).searchParams.get("window");
  const windowDays: AnalyticsWindow = windowParam === "7" ? 7 : 30;

  const comparison = await getCompetitorAnalyticsComparison(userId, id, windowDays);
  if (!comparison) return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
  return NextResponse.json({ comparison });
}
