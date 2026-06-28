import { NextResponse } from "next/server";
import {
  calendarBadRequest,
  calendarUnauthorizedResponse,
  ensureCalendarConfigured,
} from "@/lib/calendar/apiHelpers";
import { getAuthenticatedUserIdFromRequest, getCalendarConnection, loadUserWorkspace } from "@/lib/calendar/db";
import { previewSeriesPush } from "@/lib/calendar/syncEngine";
import { deriveConnectionPhase } from "@/lib/calendar/types";
import { getSeriesFromWorkspace } from "@/lib/calendar/status";

export async function GET(request: Request) {
  const configured = ensureCalendarConfigured();
  if (configured) {
    return configured;
  }

  const userId = await getAuthenticatedUserIdFromRequest();
  if (!userId) {
    return calendarUnauthorizedResponse();
  }

  const url = new URL(request.url);
  const seriesId = url.searchParams.get("seriesId");
  if (!seriesId) {
    return calendarBadRequest("seriesId is required.");
  }

  const connection = await getCalendarConnection(userId);
  const connectionPhase = deriveConnectionPhase(connection);
  if (connectionPhase !== "calendar_ready") {
    return calendarBadRequest("Calendar is not ready for preview.");
  }

  const workspaceRaw = await loadUserWorkspace(userId);
  if (!workspaceRaw) {
    return calendarBadRequest("Workspace not found.");
  }

  try {
    const series = getSeriesFromWorkspace(workspaceRaw, seriesId);
    const preview = await previewSeriesPush(userId, series);
    return NextResponse.json(preview);
  } catch (error) {
    return calendarBadRequest(error instanceof Error ? error.message : "Unable to preview push.");
  }
}
