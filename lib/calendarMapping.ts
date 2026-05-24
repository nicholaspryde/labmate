import type { EventInput } from "@fullcalendar/core";
import type { Series } from "@/lib/types";
import { resolveSeriesDates } from "@/lib/timepointMath";

export type CalendarEventExtended = {
  seriesId: string;
  timepointId: string;
  timeLabel: string;
};

export function mapSeriesToCalendarEvents(series: Series[]): EventInput[] {
  return series.flatMap((item) =>
    resolveSeriesDates(item).map((timepoint) => ({
      id: `${item.id}:${timepoint.id}`,
      title: `${item.name} - ${timepoint.name}`,
      start: timepoint.resolvedAt,
      allDay: false,
      backgroundColor: item.color,
      borderColor: item.color,
      extendedProps: {
        seriesId: item.id,
        timepointId: timepoint.id,
        timeLabel: timepoint.resolvedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      } satisfies CalendarEventExtended,
    })),
  );
}
