import { isBootstrapPlaceholderAnchor } from "@/lib/seriesReducer";
import { resolveTimepointDate } from "@/lib/timepointMath";
import type { Series } from "@/lib/types";

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * A series belongs to History when:
 *  - it has been manually archived, or
 *  - every event in the series is dated before today (all in the past).
 *
 * A series stays Active when it is still being built (no real dates yet) or has
 * at least one event dated today or in the future.
 */
export function isSeriesHistory(series: Series, now: Date = new Date()): boolean {
  if (series.archived) {
    return true;
  }

  // Newly created / still-being-built series have a placeholder anchor.
  if (isBootstrapPlaceholderAnchor(series.anchorAt)) {
    return false;
  }

  if (series.timepoints.length === 0) {
    return false;
  }

  const dayStart = startOfDay(now).getTime();
  return series.timepoints.every(
    (timepoint) => resolveTimepointDate(series.anchorAt, timepoint).getTime() < dayStart,
  );
}

export type PartitionedSeries = {
  active: Series[];
  history: Series[];
};

/** Split a flat series list into Active and History buckets, preserving order. */
export function partitionSeries(allSeries: Series[], now: Date = new Date()): PartitionedSeries {
  const active: Series[] = [];
  const history: Series[] = [];

  for (const series of allSeries) {
    if (isSeriesHistory(series, now)) {
      history.push(series);
    } else {
      active.push(series);
    }
  }

  return { active, history };
}
