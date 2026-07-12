import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { encrypt } from "@/lib/crypto";
import { exchangeCodeForToken, getMe } from "@/lib/x-api";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const pending = session.oauth;
  session.oauth = undefined;

  if (error) {
    await session.save();
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, req.url));
  }

  if (!code || !state || !pending || state !== pending.state) {
    await session.save();
    return NextResponse.redirect(new URL("/?error=invalid_oauth_state", req.url));
  }

  try {
    const token = await exchangeCodeForToken(code, pending.codeVerifier);
    const me = await getMe(token.access_token);

    await prisma.user.upsert({
      where: { id: me.id },
      create: {
        id: me.id,
        username: me.username,
        name: me.name,
        profileImageUrl: me.profile_image_url,
        accessTokenEnc: encrypt(token.access_token),
        refreshTokenEnc: token.refresh_token ? encrypt(token.refresh_token) : null,
        tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
        scope: token.scope,
      },
      update: {
        username: me.username,
        name: me.name,
        profileImageUrl: me.profile_image_url,
        accessTokenEnc: encrypt(token.access_token),
        refreshTokenEnc: token.refresh_token ? encrypt(token.refresh_token) : undefined,
        tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
        scope: token.scope,
      },
    });

    session.userId = me.id;
    await session.save();
    return NextResponse.redirect(new URL("/", req.url));
  } catch (err) {
    await session.save();
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(message)}`, req.url));
  }
}
