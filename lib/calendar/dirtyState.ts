import {
  buildSeriesContentHash,
  isSeriesDirty,
  type ResolvedCalendarEvent,
} from "@/lib/calendarEvents";
import type { ConnectionPhase } from "@/lib/calendar/types";
import type { Series } from "@/lib/types";

export function computeSeriesDirtyState(
  series: Series,
  lastPublishedHash: string | null | undefined,
  connectionPhase: ConnectionPhase,
): boolean {
  return isSeriesDirty(series, lastPublishedHash, connectionPhase);
}

export function computePublishedSeriesHash(series: Series): string {
  return buildSeriesContentHash(series);
}

export type SerializedCalendarEvent = {
  seriesId: string;
  timepointId: string;
  start: string;
  end: string;
  title: string;
  description: string;
  color: string;
  index: number;
};

export function serializeCalendarEvent(event: ResolvedCalendarEvent): SerializedCalendarEvent {
  return {
    seriesId: event.seriesId,
    timepointId: event.timepointId,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    title: event.title,
    description: event.description,
    color: event.color,
    index: event.index,
  };
}
