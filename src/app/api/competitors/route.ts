import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { addCompetitor, getCompetitorsWithComparison } from "@/lib/competitors";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const competitors = await getCompetitorsWithComparison(userId);
    return NextResponse.json({ competitors });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username : "";

  try {
    await addCompetitor(userId, username);
    const competitors = await getCompetitorsWithComparison(userId);
    return NextResponse.json({ competitors });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
