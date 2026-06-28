import { NextResponse } from "next/server";
import { ensureCalendarConfigured, calendarUnauthorizedResponse } from "@/lib/calendar/apiHelpers";
import { getAuthenticatedUserIdFromRequest } from "@/lib/calendar/db";
import { buildCalendarStatusResponse } from "@/lib/calendar/status";

export async function GET() {
  const configured = ensureCalendarConfigured();
  if (configured) {
    return configured;
  }

  const userId = await getAuthenticatedUserIdFromRequest();
  if (!userId) {
    return calendarUnauthorizedResponse();
  }

  const status = await buildCalendarStatusResponse(userId);
  return NextResponse.json(status);
}
