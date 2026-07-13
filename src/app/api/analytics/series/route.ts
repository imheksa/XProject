import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getMetricSeries, type AnalyticsWindow } from "@/lib/analytics";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const windowParam = new URL(req.url).searchParams.get("window");
  const windowDays: AnalyticsWindow = windowParam === "7" ? 7 : 30;

  try {
    const series = await getMetricSeries(userId, windowDays);
    return NextResponse.json({ series });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
