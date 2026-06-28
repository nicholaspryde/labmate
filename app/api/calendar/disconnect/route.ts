import { NextResponse } from "next/server";
import { calendarUnauthorizedResponse, ensureCalendarConfigured } from "@/lib/calendar/apiHelpers";
import { deleteCalendarConnection, getAuthenticatedUserIdFromRequest, getCalendarConnection } from "@/lib/calendar/db";
import { deleteLabMateCalendar } from "@/lib/calendar/google/calendar";

export async function DELETE(request: Request) {
  const configured = ensureCalendarConfigured();
  if (configured) {
    return configured;
  }

  const userId = await getAuthenticatedUserIdFromRequest();
  if (!userId) {
    return calendarUnauthorizedResponse();
  }

  const url = new URL(request.url);
  const deleteRemote = url.searchParams.get("deleteRemote") === "true";
  const connection = await getCalendarConnection(userId);

  if (deleteRemote && connection?.calendar_id) {
    try {
      await deleteLabMateCalendar(connection.refresh_token_encrypted, connection.calendar_id);
    } catch {
      // Best effort — still clear local connection state.
    }
  }

  await deleteCalendarConnection(userId);
  return NextResponse.json({ success: true });
}
