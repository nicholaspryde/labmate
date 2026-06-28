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
  loadUserWorkspace,
  setCalendarId,
  updateConnectionSyncStatus,
} from "@/lib/calendar/db";
import { createLabMateCalendar } from "@/lib/calendar/google/calendar";
import { pushSeriesToGoogleCalendar } from "@/lib/calendar/syncEngine";
import { deriveConnectionPhase } from "@/lib/calendar/types";
import { getSeriesFromWorkspace } from "@/lib/calendar/status";

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

  const connection = await getCalendarConnection(userId);
  const connectionPhase = deriveConnectionPhase(connection);
  if (connectionPhase === "not_connected") {
    return calendarBadRequest("Connect Google Calendar before pushing.");
  }

  const workspaceRaw = await loadUserWorkspace(userId);
  if (!workspaceRaw) {
    return calendarBadRequest("Workspace not found.");
  }

  let series;
  try {
    series = getSeriesFromWorkspace(workspaceRaw, seriesId);
  } catch (error) {
    return calendarBadRequest(error instanceof Error ? error.message : "Series not found.");
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
