import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { buildAuthorizeUrl, generatePkcePair, generateState } from "@/lib/x-api";

export async function GET() {
  const session = await getSession();
  const { verifier, challenge } = generatePkcePair();
  const state = generateState();

  session.oauth = { state, codeVerifier: verifier };
  await session.save();

  const url = buildAuthorizeUrl(state, challenge);
  return NextResponse.redirect(url);
}
