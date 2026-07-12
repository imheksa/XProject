import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";
import { refreshAccessToken } from "@/lib/x-api";
import { getSession } from "@/lib/session";

const REFRESH_MARGIN_MS = 2 * 60 * 1000;

/** Returns the current user's row plus a guaranteed-valid (refreshed if needed) access token. */
export async function requireAccessToken(userId: string): Promise<{ accessToken: string }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const expiringSoon = user.tokenExpiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS;
  if (!expiringSoon) {
    return { accessToken: decrypt(user.accessTokenEnc) };
  }

  if (!user.refreshTokenEnc) {
    throw new Error("Access token expired and no refresh token is available; please sign in again.");
  }

  const refreshed = await refreshAccessToken(decrypt(user.refreshTokenEnc));
  await prisma.user.update({
    where: { id: userId },
    data: {
      accessTokenEnc: encrypt(refreshed.access_token),
      refreshTokenEnc: refreshed.refresh_token ? encrypt(refreshed.refresh_token) : user.refreshTokenEnc,
      tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      scope: refreshed.scope,
    },
  });
  return { accessToken: refreshed.access_token };
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session.userId ?? null;
}
