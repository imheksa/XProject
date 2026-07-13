import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getOrRefreshProfileSummary } from "@/lib/profile";

// GET and POST behave the same here: getOrRefreshProfileSummary only hits the
// X API when the cached snapshot is stale (see MIN_PROFILE_REFRESH_INTERVAL_MS),
// so it's safe to call on every dashboard load without burning API credits.
async function handle() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const profile = await getOrRefreshProfileSummary(userId);
    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
