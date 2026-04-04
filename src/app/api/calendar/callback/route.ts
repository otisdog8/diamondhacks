import { NextRequest } from "next/server";
import { exchangeCode } from "@/lib/google/calendar";
import { repo } from "@/lib/db";
import { verifyToken } from "@/lib/auth/jwt";
import { cookies } from "next/headers";

/**
 * GET /api/calendar/callback
 *
 * Google OAuth2 redirect handler. Exchanges the auth code for tokens,
 * stores the refresh token on the user, and redirects to /calendar.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // userId
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error) {
    return Response.redirect(`${appUrl}/calendar?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return Response.redirect(`${appUrl}/calendar?error=no_code`);
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return Response.redirect(`${appUrl}/login`);

    const payload = verifyToken(token);
    if (!payload) return Response.redirect(`${appUrl}/login`);

    if (state && state !== payload.userId) {
      return Response.redirect(`${appUrl}/calendar?error=user_mismatch`);
    }

    const { refreshToken } = await exchangeCode(code);
    await repo.updateUser(payload.userId, { googleRefreshToken: refreshToken });

    return Response.redirect(`${appUrl}/calendar?connected=true`);
  } catch (err) {
    console.error("Calendar callback error:", err);
    const msg = err instanceof Error ? err.message : "token_exchange_failed";
    return Response.redirect(`${appUrl}/calendar?error=${encodeURIComponent(msg)}`);
  }
}
