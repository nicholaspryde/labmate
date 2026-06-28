import { NextResponse } from "next/server";
import {
  calendarBadRequest,
  calendarUnauthorizedResponse,
  ensureCalendarConfigured,
} from "@/lib/calendar/apiHelpers";
import { getAuthenticatedUserIdFromRequest, getCalendarConnection } from "@/lib/calendar/db";
import { parsePushRequestBody } from "@/lib/calendar/requestBody";
import { previewSeriesPush } from "@/lib/calendar/syncEngine";
import { deriveConnectionPhase } from "@/lib/calendar/types";

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

  const parsed = parsePushRequestBody(body);
  if ("error" in parsed) {
    return calendarBadRequest(parsed.error);
  }

  const { series } = parsed;

  const connection = await getCalendarConnection(userId);
  const connectionPhase = deriveConnectionPhase(connection);
  if (connectionPhase !== "calendar_ready") {
    return calendarBadRequest("Calendar is not ready for preview.");
  }

  try {
    const preview = await previewSeriesPush(userId, series);
    return NextResponse.json(preview);
  } catch (error) {
    return calendarBadRequest(error instanceof Error ? error.message : "Unable to preview push.");
  }
}
