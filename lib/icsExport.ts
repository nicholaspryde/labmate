import { createEvents } from "ics";
import { v4 as uuid } from "uuid";
import type { Series } from "@/lib/types";
import { computeOffsetFromPrevious, fromTotalMinutes, resolveSeriesDates } from "@/lib/timepointMath";

function toIcsDate(date: Date): [number, number, number, number, number] {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()];
}

export function buildIcs(seriesList: Series[], durationMinutes: number): string {
  const events = seriesList.flatMap((series) =>
    resolveSeriesDates(series).map((timepoint, index) => {
      const previousOffset = fromTotalMinutes(computeOffsetFromPrevious(series, index));
      const start = timepoint.resolvedAt;
      const eventDurationMinutes = timepoint.durationMinutes ?? durationMinutes;
      const end = new Date(start.getTime() + eventDurationMinutes * 60 * 1000);

      return {
        uid: uuid(),
        title: `${series.name} - ${timepoint.name}`,
        start: toIcsDate(start),
        end: toIcsDate(end),
        description: [
          index === 0
            ? "Day 0 anchor"
            : `+${previousOffset.days}d ${previousOffset.hours}h ${previousOffset.minutes}m from previous`,
          timepoint.description.trim(),
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }),
  );

  const { error, value } = createEvents(events);
  if (error || !value) {
    throw new Error(error?.message ?? "Failed to generate ICS file");
  }
  return value;
}

export function triggerIcsDownload(content: string, fileName = "timepoint-series.ics") {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
