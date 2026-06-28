import type { IlamyCalendarProps } from "@ilamy/calendar";

type IlamyCalendarEvent = NonNullable<IlamyCalendarProps["events"]>[number];
import dayjs from "@/lib/dayjs";
import { buildSeriesEvents, DEFAULT_EVENT_DURATION_MINUTES } from "@/lib/calendarEvents";
import type { Series } from "@/lib/types";

export type CalendarEventData = {
  seriesId: string;
  timepointId: string;
  timepointNumber: number;
  timepointName: string;
  timeLabel: string;
  accentColor: string;
};

export function formatCalendarPreviewLabel(data: CalendarEventData): string {
  return data.timepointName;
}

export function mapSeriesToCalendarEvents(series: Series[]): IlamyCalendarEvent[] {
  return series.flatMap((item) =>
    buildSeriesEvents(item, { defaultDurationMinutes: DEFAULT_EVENT_DURATION_MINUTES }).map((event) => {
      const timepoint = item.timepoints[event.index];
      const timepointName =
        timepoint?.name.trim() || `Timepoint ${event.index + 1}`;

      return {
        id: `${event.seriesId}:${event.timepointId}`,
        title: timepointName,
        start: dayjs(event.start),
        end: dayjs(event.end),
        color: event.color,
        backgroundColor: event.color,
        data: {
          seriesId: event.seriesId,
          timepointId: event.timepointId,
          timepointNumber: event.index + 1,
          timepointName,
          timeLabel:
            timepoint?.hasScheduledTime === true
              ? event.start.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "",
          accentColor: event.color,
        } satisfies CalendarEventData,
      };
    }),
  );
}

export { DEFAULT_EVENT_DURATION_MINUTES };
