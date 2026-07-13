import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { niche: true, keywords: true } });
  return NextResponse.json({ preferences: user });
}

export async function PUT(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const niche = typeof body.niche === "string" ? body.niche.slice(0, 200) : null;
  const keywords = Array.isArray(body.keywords)
    ? body.keywords
        .filter((k: unknown): k is string => typeof k === "string" && k.trim().length > 0)
        .map((k: string) => k.trim().slice(0, 50))
        .slice(0, 20)
    : [];

  const user = await prisma.user.update({
    where: { id: userId },
    data: { niche, keywords },
    select: { niche: true, keywords: true },
  });
  return NextResponse.json({ preferences: user });
}
