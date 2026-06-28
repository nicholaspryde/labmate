import type { Series, Timepoint } from "@/lib/types";
import { buildGoogleEventDescription } from "@/lib/seriesLinks";
import { hashValue } from "@/lib/stableHash";
import { computeOffsetFromPrevious, fromTotalMinutes, resolveSeriesDates } from "@/lib/timepointMath";

export const DEFAULT_EVENT_DURATION_MINUTES = 60;

export type ResolvedCalendarEvent = {
  seriesId: string;
  timepointId: string;
  start: Date;
  end: Date;
  title: string;
  description: string;
  color: string;
  index: number;
};

export type EventMapping = {
  seriesId: string;
  timepointId: string;
  externalEventId: string;
  contentHash: string;
};

export type SyncDiffUpdated = {
  timepointId: string;
  title: string;
  changedFields: string[];
};

export type SyncDiff = {
  added: ResolvedCalendarEvent[];
  updated: SyncDiffUpdated[];
  removed: { timepointId: string; title: string }[];
  summary: { added: number; updated: number; removed: number };
};

type BuildSeriesEventsOptions = {
  defaultDurationMinutes?: number;
};

function hashPayload(payload: unknown): string {
  return hashValue(payload);
}

function buildEventDescription(series: Series, timepoint: Timepoint, index: number): string {
  const previousOffset = fromTotalMinutes(computeOffsetFromPrevious(series, index));
  return [
    index === 0
      ? "Day 0 anchor"
      : `+${previousOffset.days}d ${previousOffset.hours}h ${previousOffset.minutes}m from previous`,
    timepoint.description.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildStableIcsUid(seriesId: string, timepointId: string): string {
  return `${seriesId}/${timepointId}@labmate.app`;
}

export function buildSeriesEvents(
  series: Series,
  options: BuildSeriesEventsOptions = {},
): ResolvedCalendarEvent[] {
  const defaultDurationMinutes = options.defaultDurationMinutes ?? DEFAULT_EVENT_DURATION_MINUTES;

  return resolveSeriesDates(series).map((timepoint, index) => {
    const durationMinutes = timepoint.durationMinutes ?? defaultDurationMinutes;
    const start = timepoint.resolvedAt;
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const timepointTitle = timepoint.name.trim() || `Timepoint ${index + 1}`;

    return {
      seriesId: series.id,
      timepointId: timepoint.id,
      start,
      end,
      title: `${series.name.trim() || "Untitled series"} - ${timepointTitle}`,
      description: buildEventDescription(series, timepoint, index),
      color: series.color,
      index,
    };
  });
}

export function buildSeriesContentHash(series: Series): string {
  const payload = {
    id: series.id,
    name: series.name,
    color: series.color,
    anchorAt: series.anchorAt,
    timepoints: series.timepoints.map((timepoint) => ({
      id: timepoint.id,
      name: timepoint.name,
      description: timepoint.description,
      offsetFromStartMinutes: timepoint.offsetFromStartMinutes,
      relativeToTimepointId: timepoint.relativeToTimepointId ?? null,
      hasScheduledTime: timepoint.hasScheduledTime ?? false,
      durationMinutes: timepoint.durationMinutes ?? null,
    })),
  };

  return hashPayload(payload);
}

export function buildEventContentHash(event: ResolvedCalendarEvent): string {
  const payload = {
    title: event.title,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    description: event.description,
    color: event.color,
  };

  return hashPayload(payload);
}

/** Hash of the full payload sent to Google, including the managed footer + deep link. */
export function buildGoogleSyncHash(event: ResolvedCalendarEvent): string {
  const payload = {
    title: event.title,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    description: buildGoogleEventDescription(event.description, event.seriesId, event.timepointId),
    color: event.color,
  };

  return hashPayload(payload);
}

export function computeSyncDiff(
  desiredEvents: ResolvedCalendarEvent[],
  mappings: EventMapping[],
  seriesId: string,
): SyncDiff {
  const seriesMappings = mappings.filter((mapping) => mapping.seriesId === seriesId);
  const mappingByTimepoint = new Map(seriesMappings.map((mapping) => [mapping.timepointId, mapping]));
  const desiredByTimepoint = new Map(desiredEvents.map((event) => [event.timepointId, event]));

  const added: ResolvedCalendarEvent[] = [];
  const updated: SyncDiffUpdated[] = [];
  const removed: { timepointId: string; title: string }[] = [];

  for (const event of desiredEvents) {
    const mapping = mappingByTimepoint.get(event.timepointId);
    const nextHash = buildGoogleSyncHash(event);

    if (!mapping) {
      added.push(event);
      continue;
    }

    if (mapping.contentHash !== nextHash) {
      updated.push({
        timepointId: event.timepointId,
        title: event.title,
        changedFields: ["title", "start", "end", "description", "color"].filter(Boolean),
      });
    }
  }

  for (const mapping of seriesMappings) {
    if (!desiredByTimepoint.has(mapping.timepointId)) {
      removed.push({
        timepointId: mapping.timepointId,
        title: mapping.timepointId,
      });
    }
  }

  return {
    added,
    updated,
    removed,
    summary: {
      added: added.length,
      updated: updated.length,
      removed: removed.length,
    },
  };
}

export function isSeriesDirty(
  series: Series,
  lastPublishedHash: string | null | undefined,
  connectionPhase: "not_connected" | "oauth_connected" | "calendar_ready",
): boolean {
  if (connectionPhase === "not_connected") {
    return false;
  }

  if (connectionPhase === "oauth_connected") {
    return series.timepoints.length > 0;
  }

  if (!lastPublishedHash) {
    return series.timepoints.length > 0;
  }

  return buildSeriesContentHash(series) !== lastPublishedHash;
}

export function hasStaleGoogleEventMappings(series: Series, mappings: EventMapping[]): boolean {
  const desiredEvents = buildSeriesEvents(series);
  const mappingByTimepoint = new Map(
    mappings
      .filter((mapping) => mapping.seriesId === series.id)
      .map((mapping) => [mapping.timepointId, mapping]),
  );

  for (const event of desiredEvents) {
    const mapping = mappingByTimepoint.get(event.timepointId);
    if (!mapping) {
      continue;
    }

    if (mapping.contentHash !== buildGoogleSyncHash(event)) {
      return true;
    }
  }

  return false;
}
