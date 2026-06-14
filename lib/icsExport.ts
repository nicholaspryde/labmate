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

function slugifyIcsBaseName(name: string, fallback: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

export function icsFileNameForSeries(seriesName: string, fallback = "timepoint-series"): string {
  return `${slugifyIcsBaseName(seriesName, fallback)}.ics`;
}

export function buildSeriesIcsExports(
  seriesList: Series[],
  durationMinutes: number,
  fallbackBaseName = "timepoint-series",
): Array<{ fileName: string; content: string }> {
  const exportableSeries = seriesList.filter((series) => series.timepoints.length > 0);
  const usedBaseNames = new Map<string, number>();

  return exportableSeries.map((series) => {
    const baseName = slugifyIcsBaseName(series.name, fallbackBaseName);
    const seenCount = usedBaseNames.get(baseName) ?? 0;
    usedBaseNames.set(baseName, seenCount + 1);
    const uniqueBaseName = seenCount === 0 ? baseName : `${baseName}-${seenCount + 1}`;

    return {
      fileName: `${uniqueBaseName}.ics`,
      content: buildIcs([series], durationMinutes),
    };
  });
}

const ICS_DOWNLOAD_STAGGER_MS = 150;

export function triggerIcsDownloads(exports: Array<{ fileName: string; content: string }>): void {
  exports.forEach(({ fileName, content }, index) => {
    window.setTimeout(() => triggerIcsDownload(content, fileName), index * ICS_DOWNLOAD_STAGGER_MS);
  });
}

export function exportAllSeriesAsIcs(
  seriesList: Series[],
  durationMinutes: number,
  fallbackBaseName = "timepoint-series",
): void {
  triggerIcsDownloads(buildSeriesIcsExports(seriesList, durationMinutes, fallbackBaseName));
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
