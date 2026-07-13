import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications";
import { checkTrendsForUser } from "@/lib/trends";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { items, unreadCount } = await listNotifications(userId);
  return NextResponse.json({ notifications: items, unreadCount });
}

// Safe to call on every dashboard load: checkTrendsForUser only hits the X
// API when the per-user throttle has elapsed and the user has keywords set.
export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const result = await checkTrendsForUser(userId);
  const { items, unreadCount } = await listNotifications(userId);
  return NextResponse.json({ notifications: items, unreadCount, trendCheck: result });
}
