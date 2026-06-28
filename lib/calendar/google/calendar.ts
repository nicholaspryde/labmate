import type { calendar_v3 } from "googleapis";
import type { ResolvedCalendarEvent } from "@/lib/calendarEvents";
import { createGoogleCalendarClient } from "@/lib/calendar/google/client";
import { mapHexToGoogleColorId } from "@/lib/calendar/google/colors";
import { buildGoogleEventDescription } from "@/lib/seriesLinks";

export const LABMATE_CALENDAR_NAME = "Labmate";

export async function createLabMateCalendar(refreshTokenEncrypted: string): Promise<string> {
  const calendar = await createGoogleCalendarClient(refreshTokenEncrypted);
  const response = await calendar.calendars.insert({
    requestBody: {
      summary: LABMATE_CALENDAR_NAME,
      description: "Managed by Labmate — edit events in the Labmate app",
      timeZone: "UTC",
    },
  });

  if (!response.data.id) {
    throw new Error("Google Calendar did not return a calendar id.");
  }

  return response.data.id;
}

function toGoogleEventBody(event: ResolvedCalendarEvent): calendar_v3.Schema$Event {
  return {
    summary: event.title,
    description: buildGoogleEventDescription(event.description, event.seriesId, event.timepointId),
    start: {
      dateTime: event.start.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: event.end.toISOString(),
      timeZone: "UTC",
    },
    colorId: mapHexToGoogleColorId(event.color),
    extendedProperties: {
      private: {
        labmateSeriesId: event.seriesId,
        labmateTimepointId: event.timepointId,
      },
    },
  };
}

export function buildPatchBody(
  event: ResolvedCalendarEvent,
  previousHash?: string,
  nextHash?: string,
): calendar_v3.Schema$Event {
  void previousHash;
  void nextHash;
  return toGoogleEventBody(event);
}

export async function insertGoogleEvent(
  refreshTokenEncrypted: string,
  calendarId: string,
  event: ResolvedCalendarEvent,
): Promise<string> {
  const calendar = await createGoogleCalendarClient(refreshTokenEncrypted);
  const response = await calendar.events.insert({
    calendarId,
    requestBody: toGoogleEventBody(event),
  });

  if (!response.data.id) {
    throw new Error("Google Calendar did not return an event id.");
  }

  return response.data.id;
}

export async function patchGoogleEvent(
  refreshTokenEncrypted: string,
  calendarId: string,
  externalEventId: string,
  event: ResolvedCalendarEvent,
): Promise<string> {
  const calendar = await createGoogleCalendarClient(refreshTokenEncrypted);
  try {
    const response = await calendar.events.patch({
      calendarId,
      eventId: externalEventId,
      requestBody: buildPatchBody(event),
    });
    return response.data.id ?? externalEventId;
  } catch (error) {
    const status = (error as { code?: number }).code;
    if (status === 404) {
      return insertGoogleEvent(refreshTokenEncrypted, calendarId, event);
    }
    throw error;
  }
}

export async function deleteGoogleEvent(
  refreshTokenEncrypted: string,
  calendarId: string,
  externalEventId: string,
): Promise<void> {
  const calendar = await createGoogleCalendarClient(refreshTokenEncrypted);
  try {
    await calendar.events.delete({ calendarId, eventId: externalEventId });
  } catch (error) {
    const status = (error as { code?: number }).code;
    if (status === 404) {
      return;
    }
    throw error;
  }
}

export async function deleteLabMateCalendar(
  refreshTokenEncrypted: string,
  calendarId: string,
): Promise<void> {
  const calendar = await createGoogleCalendarClient(refreshTokenEncrypted);
  try {
    await calendar.calendars.delete({ calendarId });
  } catch (error) {
    const status = (error as { code?: number }).code;
    if (status === 404) {
      return;
    }
    throw error;
  }
}
