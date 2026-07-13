import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { markAllNotificationsRead } from "@/lib/notifications";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  await markAllNotificationsRead(userId);
  return NextResponse.json({ ok: true });
}
