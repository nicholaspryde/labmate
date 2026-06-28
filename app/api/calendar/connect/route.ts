import { NextResponse } from "next/server";
import { ensureCalendarConfigured } from "@/lib/calendar/apiHelpers";
import { getAuthenticatedUserIdFromRequest } from "@/lib/calendar/db";
import { getAuthorizationUrl } from "@/lib/calendar/google/oauth";

export async function GET(request: Request) {
  const configured = ensureCalendarConfigured();
  if (configured) {
    return configured;
  }

  const userId = await getAuthenticatedUserIdFromRequest();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/";
  const origin = url.origin;
  const authUrl = getAuthorizationUrl(userId, origin, returnTo);
  return NextResponse.redirect(authUrl);
}
