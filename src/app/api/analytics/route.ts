import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getAnalyticsSummary, type AnalyticsWindow } from "@/lib/analytics";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const windowParam = new URL(req.url).searchParams.get("window");
  const windowDays: AnalyticsWindow = windowParam === "7" ? 7 : 30;

  try {
    const analytics = await getAnalyticsSummary(userId, windowDays);
    return NextResponse.json({ analytics });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
