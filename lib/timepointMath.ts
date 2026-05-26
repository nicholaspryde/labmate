import { addMinutes, differenceInCalendarDays, format } from "date-fns";
import { RELATIVE_TO_PREVIOUS, type Offset, type OffsetMode, type Series, type Timepoint } from "@/lib/types";

export const MINUTES_IN_DAY = 24 * 60;

export function toTotalMinutes(offset: Offset): number {
  return offset.days * MINUTES_IN_DAY + offset.hours * 60 + offset.minutes;
}

export function fromTotalMinutes(totalMinutes: number): Offset {
  const safe = Math.max(0, Math.floor(totalMinutes));
  const days = Math.floor(safe / MINUTES_IN_DAY);
  const remainder = safe % MINUTES_IN_DAY;
  const hours = Math.floor(remainder / 60);
  const minutes = remainder % 60;

  return { days, hours, minutes };
}

export function offsetLabel(totalMinutes: number): string {
  const offset = fromTotalMinutes(totalMinutes);
  return `+${offset.days}d ${offset.hours}h ${offset.minutes}m`;
}

export function resolveTimepointDate(anchorAt: string, timepoint: Timepoint): Date {
  return addMinutes(new Date(anchorAt), timepoint.offsetFromStartMinutes);
}

export function resolveSeriesDates(series: Series): Array<Timepoint & { resolvedAt: Date }> {
  return series.timepoints.map((timepoint) => ({
    ...timepoint,
    resolvedAt: resolveTimepointDate(series.anchorAt, timepoint),
  }));
}

export function computeOffsetFromPrevious(series: Series, index: number): number {
  if (index <= 0) {
    return 0;
  }
  const previous = series.timepoints[index - 1];
  const current = series.timepoints[index];
  return Math.max(0, current.offsetFromStartMinutes - previous.offsetFromStartMinutes);
}

export function defaultRelativeToTimepointId(series: Series, index: number, mode: OffsetMode): string {
  const defaultIndex = mode === "from-previous" ? Math.max(0, index - 1) : 0;
  return series.timepoints[defaultIndex]?.id ?? series.timepoints[0]?.id ?? "";
}

export function effectiveRelativeToTimepointId(
  series: Series,
  timepoint: Timepoint,
  index: number,
  mode: OffsetMode,
): string {
  if (timepoint.relativeToTimepointId === RELATIVE_TO_PREVIOUS) {
    const prevIndex = Math.max(0, index - 1);
    return series.timepoints[prevIndex]?.id ?? series.timepoints[0]?.id ?? "";
  }
  if (timepoint.relativeToTimepointId) {
    const exists = series.timepoints.some((candidate) => candidate.id === timepoint.relativeToTimepointId);
    if (exists) {
      return timepoint.relativeToTimepointId;
    }
  }
  return defaultRelativeToTimepointId(series, index, mode);
}

function referenceOffsetMinutesForId(series: Series, index: number, referenceId: string): number {
  const referenceIndex = series.timepoints.findIndex((candidate) => candidate.id === referenceId);
  if (referenceIndex >= 0) {
    return series.timepoints[referenceIndex].offsetFromStartMinutes;
  }
  return series.timepoints[0]?.offsetFromStartMinutes ?? 0;
}

/**
 * Offset shown in the main row input.
 * - In `from-start` / `from-previous`: always relative to the series toggle.
 * - In `custom`: relative to the per-timepoint authored reference (= author offset).
 */
export function computeDisplayOffsetMinutes(
  series: Series,
  index: number,
  mode: OffsetMode,
): number {
  const timepoint = series.timepoints[index];
  if (!timepoint) {
    return 0;
  }
  if (mode === "custom") {
    return computeAuthorOffsetMinutes(series, index, mode);
  }
  const referenceId = defaultRelativeToTimepointId(series, index, mode);
  const referenceOffset = referenceOffsetMinutesForId(series, index, referenceId);
  return Math.max(0, timepoint.offsetFromStartMinutes - referenceOffset);
}

/** Offset for the author calculator — relative to the timepoint's authored reference. */
export function computeAuthorOffsetMinutes(
  series: Series,
  index: number,
  mode: OffsetMode,
): number {
  const timepoint = series.timepoints[index];
  if (!timepoint) {
    return 0;
  }
  const referenceId = effectiveRelativeToTimepointId(series, timepoint, index, mode);
  const referenceOffset = referenceOffsetMinutesForId(series, index, referenceId);
  return Math.max(0, timepoint.offsetFromStartMinutes - referenceOffset);
}

export function isDefaultRelativeReference(
  series: Series,
  index: number,
  mode: OffsetMode,
  referenceId: string,
): boolean {
  return referenceId === defaultRelativeToTimepointId(series, index, mode);
}

export function shiftSeriesByCalendarDays(series: Series, deltaDays: number): Series {
  if (deltaDays === 0) {
    return series;
  }

  const anchor = new Date(series.anchorAt);
  anchor.setDate(anchor.getDate() + deltaDays);

  return {
    ...series,
    anchorAt: anchor.toISOString(),
  };
}

export function dayDeltaFromDates(oldDate: Date, newDate: Date): number {
  return differenceInCalendarDays(newDate, oldDate);
}

export function formatResolvedDate(date: Date): string {
  return format(date, "MMM d, yyyy h:mm aaa");
}
