import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { removeCompetitor } from "@/lib/competitors";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  await removeCompetitor(userId, id);
  return NextResponse.json({ ok: true });
}
