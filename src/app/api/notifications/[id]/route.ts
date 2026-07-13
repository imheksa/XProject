import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { markNotificationRead } from "@/lib/notifications";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  await markNotificationRead(userId, id);
  return NextResponse.json({ ok: true });
}
