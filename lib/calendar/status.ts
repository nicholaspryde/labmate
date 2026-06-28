import {
  buildSeriesContentHash,
  hasStaleGoogleEventMappings,
  isSeriesDirty,
} from "@/lib/calendarEvents";
import {
  getCalendarConnection,
  getEventMappings,
  getPushQueue,
  getSeriesSyncRows,
  loadUserWorkspace,
} from "@/lib/calendar/db";
import { deriveConnectionPhase } from "@/lib/calendar/types";
import { validateAppState } from "@/lib/workspace/validate";

function toEventMappings(rows: Awaited<ReturnType<typeof getEventMappings>>) {
  return rows.map((row) => ({
    seriesId: row.series_id,
    timepointId: row.timepoint_id,
    externalEventId: row.external_event_id,
    contentHash: row.content_hash,
  }));
}

export async function buildCalendarStatusResponse(userId: string) {
  const [connection, seriesSyncRows, queuedPushes, workspaceRaw, eventMappingRows] = await Promise.all([
    getCalendarConnection(userId),
    getSeriesSyncRows(userId),
    getPushQueue(userId),
    loadUserWorkspace(userId),
    getEventMappings(userId),
  ]);

  const connectionPhase = deriveConnectionPhase(connection);
  const workspace = workspaceRaw ? validateAppState(workspaceRaw) : null;
  const eventMappings = toEventMappings(eventMappingRows);
  const seriesSync: Record<
    string,
    {
      lastPublishedAt: string | null;
      lastPublishedHash: string | null;
      dirty: boolean;
    }
  > = {};

  const syncBySeries = new Map(seriesSyncRows.map((row) => [row.series_id, row]));

  for (const series of workspace?.series ?? []) {
    const syncRow = syncBySeries.get(series.id);
    seriesSync[series.id] = {
      lastPublishedAt: syncRow?.last_published_at ?? null,
      lastPublishedHash: syncRow?.last_published_hash ?? null,
      dirty:
        isSeriesDirty(series, syncRow?.last_published_hash, connectionPhase) ||
        (connectionPhase === "calendar_ready" &&
          hasStaleGoogleEventMappings(series, eventMappings)),
    };
  }

  return {
    connectionPhase,
    syncStatus: connection?.sync_status ?? "idle",
    lastSyncError: connection?.last_sync_error ?? null,
    calendarId: connection?.calendar_id ?? null,
    seriesSync,
    eventMappings,
    queuedPushes: queuedPushes.map((item) => ({
      seriesId: item.series_id,
      queuedAt: item.queued_at,
    })),
  };
}

export function getSeriesFromWorkspace(workspaceRaw: unknown, seriesId: string) {
  const workspace = validateAppState(workspaceRaw);
  if (!workspace) {
    throw new Error("Workspace not found.");
  }
  const series = workspace.series.find((item) => item.id === seriesId);
  if (!series) {
    throw new Error("Series not found.");
  }
  return series;
}

export function getSeriesPublishedHash(series: Parameters<typeof buildSeriesContentHash>[0]) {
  return buildSeriesContentHash(series);
}
