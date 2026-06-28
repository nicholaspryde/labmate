import { NextResponse } from "next/server";
import { calendarBadRequest, calendarUnauthorizedResponse, ensureCalendarConfigured } from "@/lib/calendar/apiHelpers";
import { enqueuePush, getAuthenticatedUserIdFromRequest } from "@/lib/calendar/db";

export async function POST(request: Request) {
  const configured = ensureCalendarConfigured();
  if (configured) {
    return configured;
  }

  const userId = await getAuthenticatedUserIdFromRequest();
  if (!userId) {
    return calendarUnauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return calendarBadRequest("Invalid request body.");
  }

  const seriesId =
    typeof body === "object" && body !== null && "seriesId" in body && typeof body.seriesId === "string"
      ? body.seriesId
      : "";

  if (!seriesId) {
    return calendarBadRequest("seriesId is required.");
  }

  await enqueuePush(userId, seriesId);
  return NextResponse.json({ queued: true });
}
