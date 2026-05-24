import { addMinutes, differenceInCalendarDays, format } from "date-fns";
import type { Offset, Series, Timepoint } from "@/lib/types";

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
