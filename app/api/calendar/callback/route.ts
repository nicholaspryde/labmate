import { NextResponse } from "next/server";
import { ensureCalendarConfigured } from "@/lib/calendar/apiHelpers";
import { upsertCalendarConnection } from "@/lib/calendar/db";
import { exchangeCodeForTokens, verifyOAuthState } from "@/lib/calendar/google/oauth";
import { encryptToken } from "@/lib/calendar/tokenCrypto";

export async function GET(request: Request) {
  const configured = ensureCalendarConfigured();
  if (configured) {
    return configured;
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${url.origin}/?calendar=error`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${url.origin}/?calendar=error`);
  }

  try {
    const { userId, returnTo } = verifyOAuthState(state);
    const tokens = await exchangeCodeForTokens(code, url.origin);

    await upsertCalendarConnection(userId, {
      refresh_token_encrypted: encryptToken(tokens.refreshToken),
      token_expires_at: tokens.expiryDate,
      sync_status: "idle",
      last_sync_error: null,
    });

    const redirectTarget = new URL(returnTo, url.origin);
    redirectTarget.searchParams.set("calendar", "connected");
    return NextResponse.redirect(redirectTarget.toString());
  } catch {
    return NextResponse.redirect(`${url.origin}/?calendar=error`);
  }
}
