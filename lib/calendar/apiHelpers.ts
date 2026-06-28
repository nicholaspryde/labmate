import { NextResponse } from "next/server";
import { isCalendarSyncConfigured } from "@/lib/calendar/env";

export function calendarNotConfiguredResponse() {
  return NextResponse.json({ error: "Calendar sync is not configured." }, { status: 503 });
}

export function calendarUnauthorizedResponse() {
  return NextResponse.json({ error: "Authentication required." }, { status: 401 });
}

export function calendarBadRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function ensureCalendarConfigured() {
  if (!isCalendarSyncConfigured()) {
    return calendarNotConfiguredResponse();
  }
  return null;
}
