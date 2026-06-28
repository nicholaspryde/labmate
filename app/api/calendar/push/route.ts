import { NextResponse } from "next/server";
import {
  calendarBadRequest,
  calendarUnauthorizedResponse,
  ensureCalendarConfigured,
} from "@/lib/calendar/apiHelpers";
import {
  dequeuePush,
  enqueuePush,
  getAuthenticatedUserIdFromRequest,
  getCalendarConnection,
  setCalendarId,
  updateConnectionSyncStatus,
} from "@/lib/calendar/db";
import { createLabMateCalendar } from "@/lib/calendar/google/calendar";
import { parsePushRequestBody } from "@/lib/calendar/requestBody";
import { pushSeriesToGoogleCalendar } from "@/lib/calendar/syncEngine";
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

  const { seriesId, series } = parsed;

  const connection = await getCalendarConnection(userId);
  const connectionPhase = deriveConnectionPhase(connection);
  if (connectionPhase === "not_connected") {
    return calendarBadRequest("Connect Google Calendar before pushing.");
  }

  if (series.timepoints.length === 0) {
    return calendarBadRequest("Series has no events to push.");
  }

  try {
    await updateConnectionSyncStatus(userId, "syncing", null);

    let calendarId = connection?.calendar_id ?? null;
    if (!calendarId) {
      calendarId = await createLabMateCalendar(connection!.refresh_token_encrypted);
      await setCalendarId(userId, calendarId);
    }

    const result = await pushSeriesToGoogleCalendar({
      userId,
      series,
      refreshTokenEncrypted: connection!.refresh_token_encrypted,
      calendarId,
    });

    await updateConnectionSyncStatus(userId, "idle", null);
    await dequeuePush(userId, seriesId);

    return NextResponse.json({
      summary: result.summary,
      lastPublishedAt: result.lastPublishedAt,
      lastPublishedHash: result.lastPublishedHash,
      connectionPhase: "calendar_ready",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Push failed.";
    await updateConnectionSyncStatus(userId, "error", message);
    await enqueuePush(userId, seriesId, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
