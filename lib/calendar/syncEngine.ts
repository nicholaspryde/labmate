import {
  buildGoogleSyncHash,
  buildSeriesContentHash,
  buildSeriesEvents,
  computeSyncDiff,
  type EventMapping,
  type ResolvedCalendarEvent,
} from "@/lib/calendarEvents";
import {
  deleteEventMapping,
  getEventMappings,
  upsertEventMapping,
  upsertSeriesSync,
} from "@/lib/calendar/db";
import {
  deleteGoogleEvent,
  insertGoogleEvent,
  patchGoogleEvent,
} from "@/lib/calendar/google/calendar";
import type { Series } from "@/lib/types";

const CHUNK_SIZE = 50;

export type PushSummary = {
  added: number;
  updated: number;
  removed: number;
};

export type PushProgress = {
  completed: number;
  total: number;
};

function toEventMappings(rows: Awaited<ReturnType<typeof getEventMappings>>): EventMapping[] {
  return rows.map((row) => ({
    seriesId: row.series_id,
    timepointId: row.timepoint_id,
    externalEventId: row.external_event_id,
    contentHash: row.content_hash,
  }));
}

export async function previewSeriesPush(userId: string, series: Series) {
  const mappings = toEventMappings(await getEventMappings(userId));
  const desiredEvents = buildSeriesEvents(series);
  const diff = computeSyncDiff(desiredEvents, mappings, series.id);

  return {
    added: diff.added.map(serializeEvent),
    updated: diff.updated,
    removed: diff.removed,
    summary: diff.summary,
  };
}

function serializeEvent(event: ResolvedCalendarEvent) {
  return {
    seriesId: event.seriesId,
    timepointId: event.timepointId,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    title: event.title,
    description: event.description,
    color: event.color,
    index: event.index,
  };
}

async function executeChunk<T>(items: T[], handler: (item: T) => Promise<void>): Promise<void> {
  for (let index = 0; index < items.length; index += CHUNK_SIZE) {
    const chunk = items.slice(index, index + CHUNK_SIZE);
    await Promise.all(chunk.map((item) => handler(item)));
  }
}

export async function pushSeriesToGoogleCalendar(options: {
  userId: string;
  series: Series;
  refreshTokenEncrypted: string;
  calendarId: string;
  onProgress?: (progress: PushProgress) => void;
}): Promise<{ summary: PushSummary; lastPublishedAt: string; lastPublishedHash: string }> {
  const { userId, series, refreshTokenEncrypted, calendarId, onProgress } = options;
  const mappings = toEventMappings(await getEventMappings(userId));
  const desiredEvents = buildSeriesEvents(series);
  const diff = computeSyncDiff(desiredEvents, mappings, series.id);
  const total = diff.added.length + diff.updated.length + diff.removed.length;
  let completed = 0;

  const report = () => {
    onProgress?.({ completed, total });
  };

  await executeChunk(diff.added, async (event) => {
    const externalEventId = await insertGoogleEvent(refreshTokenEncrypted, calendarId, event);
    await upsertEventMapping(userId, {
      series_id: series.id,
      timepoint_id: event.timepointId,
      external_event_id: externalEventId,
      content_hash: buildGoogleSyncHash(event),
    });
    completed += 1;
    report();
  });

  await executeChunk(diff.updated, async (update) => {
    const event = desiredEvents.find((item) => item.timepointId === update.timepointId);
    const mapping = mappings.find(
      (item) => item.seriesId === series.id && item.timepointId === update.timepointId,
    );
    if (!event || !mapping) {
      return;
    }

    const externalEventId = await patchGoogleEvent(
      refreshTokenEncrypted,
      calendarId,
      mapping.externalEventId,
      event,
    );
    await upsertEventMapping(userId, {
      series_id: series.id,
      timepoint_id: event.timepointId,
      external_event_id: externalEventId,
      content_hash: buildGoogleSyncHash(event),
    });
    completed += 1;
    report();
  });

  await executeChunk(diff.removed, async (removed) => {
    const mapping = mappings.find(
      (item) => item.seriesId === series.id && item.timepointId === removed.timepointId,
    );
    if (!mapping) {
      return;
    }

    await deleteGoogleEvent(refreshTokenEncrypted, calendarId, mapping.externalEventId);
    await deleteEventMapping(userId, series.id, removed.timepointId);
    completed += 1;
    report();
  });

  const lastPublishedHash = buildSeriesContentHash(series);
  const lastPublishedAt = await upsertSeriesSync(userId, series.id, lastPublishedHash);

  return {
    summary: diff.summary,
    lastPublishedAt,
    lastPublishedHash,
  };
}

export function buildPatchFields(
  previous: ResolvedCalendarEvent,
  next: ResolvedCalendarEvent,
): string[] {
  const fields: string[] = [];
  if (previous.title !== next.title) fields.push("summary");
  if (previous.start.getTime() !== next.start.getTime()) fields.push("start");
  if (previous.end.getTime() !== next.end.getTime()) fields.push("end");
  if (previous.description !== next.description) fields.push("description");
  if (previous.color !== next.color) fields.push("colorId");
  return fields;
}
