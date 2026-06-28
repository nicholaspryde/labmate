import type { AppState, OffsetMode, Series, Timepoint } from "@/lib/types";

const OFFSET_MODES: OffsetMode[] = ["from-start", "from-previous", "custom"];

function isTimepoint(value: unknown): value is Timepoint {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.description === "string" &&
    typeof record.offsetFromStartMinutes === "number" &&
    record.offsetFromStartMinutes >= 0 &&
    (record.relativeToTimepointId === undefined || typeof record.relativeToTimepointId === "string") &&
    (record.hasScheduledTime === undefined || typeof record.hasScheduledTime === "boolean") &&
    (record.durationMinutes === undefined || typeof record.durationMinutes === "number")
  );
}

export function validateSeries(value: unknown): Series | null {
  return isSeries(value) ? value : null;
}

function isSeries(value: unknown): value is Series {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.color === "string" &&
    typeof record.anchorAt === "string" &&
    Array.isArray(record.timepoints) &&
    record.timepoints.length > 0 &&
    record.timepoints.every(isTimepoint)
  );
}

export function validateAppState(value: unknown): AppState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (!Array.isArray(record.series) || record.series.length === 0 || !record.series.every(isSeries)) {
    return null;
  }

  const offsetMode = record.offsetMode;
  if (offsetMode !== "from-start" && offsetMode !== "from-previous" && offsetMode !== "custom") {
    return null;
  }

  const activeSeriesId =
    record.activeSeriesId === null || typeof record.activeSeriesId === "string"
      ? record.activeSeriesId
      : null;

  const series = record.series as Series[];
  if (activeSeriesId && !series.some((item) => item.id === activeSeriesId)) {
    return null;
  }

  return {
    series,
    activeSeriesId: activeSeriesId ?? series[0]?.id ?? null,
    offsetMode,
  };
}

export function isOffsetMode(value: unknown): value is OffsetMode {
  return typeof value === "string" && OFFSET_MODES.includes(value as OffsetMode);
}
