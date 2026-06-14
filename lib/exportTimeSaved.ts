import { hasWeekendTimepoints } from "@/lib/timepointMath";
import type { Series } from "@/lib/types";

export type ExportSeriesSummary = {
  id: string;
  name: string;
  eventCount: number;
  color: string;
};

export function calculateTimeSavedMinutes(seriesList: Series[]): number {
  const seriesCount = seriesList.length;
  const totalEvents = seriesList.reduce((count, series) => count + series.timepoints.length, 0);
  const additionalEvents = Math.max(0, totalEvents - seriesCount);

  const customReferenceCount = seriesList.reduce(
    (count, series) =>
      count +
      series.timepoints.filter((timepoint, index) => index > 0 && Boolean(timepoint.relativeToTimepointId))
        .length,
    0,
  );

  const weekendSeriesCount = seriesList.filter(
    (series) => series.timepoints.length >= 3 && hasWeekendTimepoints(series),
  ).length;

  return (
    additionalEvents * 4 +
    seriesCount * 3 +
    customReferenceCount * 2 +
    weekendSeriesCount * 5 +
    Math.max(0, seriesCount - 1) * 3
  );
}

export function roundSavedMinutes(minutes: number): number {
  return Math.max(5, Math.round(minutes / 5) * 5);
}

export function buildExportSeriesSummaries(
  seriesList: Series[],
  placeholder = "Untitled series",
): ExportSeriesSummary[] {
  return seriesList
    .filter((series) => series.timepoints.length > 0)
    .map((series) => ({
      id: series.id,
      name: series.name.trim() || placeholder,
      eventCount: series.timepoints.length,
      color: series.color,
    }));
}

function formatSavedTimeLabel(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (remainder === 0) {
    return hours === 1 ? "an hour" : `${hours} hours`;
  }

  if (remainder === 30 && hours > 0) {
    return hours === 1 ? "an hour and a half" : `${hours} and a half hours`;
  }

  const hourLabel = hours === 1 ? "an hour" : `${hours} hours`;
  const minuteLabel = `${remainder} minutes`;
  return `${hourLabel} and ${minuteLabel}`;
}

export function formatSavedTimeMessage(savedMinutes: number): string {
  const rounded = roundSavedMinutes(savedMinutes);
  return `You saved ~${formatSavedTimeLabel(rounded)} based on my napkin math!`;
}
