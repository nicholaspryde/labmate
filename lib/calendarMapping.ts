import type { IlamyCalendarProps } from "@ilamy/calendar";

type IlamyCalendarEvent = NonNullable<IlamyCalendarProps["events"]>[number];
import dayjs from "@/lib/dayjs";
import type { Series } from "@/lib/types";
import { resolveSeriesDates } from "@/lib/timepointMath";

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

const DEFAULT_EVENT_DURATION_MINUTES = 60;

export function mapSeriesToCalendarEvents(series: Series[]): IlamyCalendarEvent[] {
  return series.flatMap((item) =>
    resolveSeriesDates(item).map((timepoint, index) => {
      const durationMinutes = timepoint.durationMinutes ?? DEFAULT_EVENT_DURATION_MINUTES;
      const end = new Date(timepoint.resolvedAt.getTime() + durationMinutes * 60 * 1000);

      return {
        id: `${item.id}:${timepoint.id}`,
        title: timepoint.name.trim() || `Timepoint ${index + 1}`,
        start: dayjs(timepoint.resolvedAt),
        end: dayjs(end),
        color: item.color,
        backgroundColor: item.color,
        data: {
          seriesId: item.id,
          timepointId: timepoint.id,
          timepointNumber: index + 1,
          timepointName: timepoint.name,
          timeLabel:
            timepoint.hasScheduledTime === true
              ? timepoint.resolvedAt.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "",
          accentColor: item.color,
        } satisfies CalendarEventData,
      };
    }),
  );
}
