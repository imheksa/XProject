import { NextRequest, NextResponse } from "next/server";
import { tick } from "@/lib/worker";

/**
 * Fallback for deployments without a long-running Node process (e.g.
 * serverless): point an external cron at this endpoint every few seconds.
 * When CRON_SECRET is set, callers must send it as `Authorization: Bearer <secret>`.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await tick();
  return NextResponse.json({ ok: true });
}
