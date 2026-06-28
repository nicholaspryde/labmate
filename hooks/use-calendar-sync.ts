"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildSeriesContentHash, hasStaleGoogleEventMappings, isSeriesDirty } from "@/lib/calendarEvents";
import type { Series } from "@/lib/types";

export type ConnectionPhase = "not_connected" | "oauth_connected" | "calendar_ready";

export type CalendarSyncStatus = "idle" | "syncing" | "error" | "needs_reauth";

export type SeriesSyncState = {
  lastPublishedAt: string | null;
  lastPublishedHash: string | null;
  dirty: boolean;
};

export type CalendarStatusResponse = {
  connectionPhase: ConnectionPhase;
  syncStatus: CalendarSyncStatus;
  lastSyncError: string | null;
  calendarId: string | null;
  seriesSync: Record<string, SeriesSyncState>;
  eventMappings: Array<{ seriesId: string; timepointId: string; contentHash: string }>;
  queuedPushes: { seriesId: string; queuedAt: string }[];
};

export type PushPreviewResponse = {
  added: Array<{
    seriesId: string;
    timepointId: string;
    title: string;
  }>;
  updated: Array<{ timepointId: string; title: string; changedFields: string[] }>;
  removed: Array<{ timepointId: string; title: string }>;
  summary: { added: number; updated: number; removed: number };
};

export type BadgeState = "synced" | "unsynced" | "ready" | "syncing" | "error" | "queued" | "hidden";

type UseCalendarSyncOptions = {
  userId: string | null;
  authLoading: boolean;
  series: Series[];
};

function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export function useCalendarSync({ userId, authLoading, series }: UseCalendarSyncOptions) {
  const [status, setStatus] = useState<CalendarStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushingSeriesId, setPushingSeriesId] = useState<string | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const refreshStatus = useCallback(async () => {
    if (!userId) {
      setStatus(null);
      return null;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/calendar/status", { cache: "no-store" });
      if (!response.ok) {
        setStatus(null);
        return null;
      }
      const nextStatus = (await response.json()) as CalendarStatusResponse;
      setStatus(nextStatus);
      return nextStatus;
    } catch {
      setStatus(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    void refreshStatus();
  }, [authLoading, refreshStatus]);

  useEffect(() => {
    function handleOnline() {
      const queued = statusRef.current?.queuedPushes ?? [];
      if (!userId || queued.length === 0) {
        return;
      }
      void (async () => {
        for (const item of queued) {
          const seriesPayload = series.find((entry) => entry.id === item.seriesId);
          if (!seriesPayload) {
            continue;
          }
          try {
            await fetch("/api/calendar/push", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ seriesId: item.seriesId, series: seriesPayload }),
            });
          } catch {
            // Keep queued; user can retry manually.
          }
        }
        await refreshStatus();
      })();
    }

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [refreshStatus, series, userId]);

  const localSeriesSync = useMemo(() => {
    const connectionPhase = status?.connectionPhase ?? "not_connected";
    const eventMappings = status?.eventMappings ?? [];
    const result: Record<string, SeriesSyncState> = {};

    for (const item of series) {
      const serverState = status?.seriesSync[item.id];
      const lastPublishedHash = serverState?.lastPublishedHash ?? null;
      const contentDirty = isSeriesDirty(item, lastPublishedHash, connectionPhase);
      const staleGoogleDescriptions =
        connectionPhase === "calendar_ready" &&
        hasStaleGoogleEventMappings(
          item,
          eventMappings.map((mapping) => ({
            seriesId: mapping.seriesId,
            timepointId: mapping.timepointId,
            externalEventId: "",
            contentHash: mapping.contentHash,
          })),
        );

      result[item.id] = {
        lastPublishedAt: serverState?.lastPublishedAt ?? null,
        lastPublishedHash,
        dirty: contentDirty || staleGoogleDescriptions,
      };
    }

    return result;
  }, [series, status]);

  const getSeriesSyncState = useCallback(
    (seriesId: string): SeriesSyncState => {
      return (
        localSeriesSync[seriesId] ?? {
          lastPublishedAt: null,
          lastPublishedHash: null,
          dirty: false,
        }
      );
    },
    [localSeriesSync],
  );

  const getBadgeState = useCallback(
    (seriesId: string): BadgeState => {
      if (!userId || !status) {
        return "hidden";
      }

      const queued = status.queuedPushes.some((item) => item.seriesId === seriesId);
      if (queued) {
        return "queued";
      }

      if (pushingSeriesId === seriesId) {
        return "syncing";
      }

      if (pushError && getSeriesSyncState(seriesId).dirty) {
        return "error";
      }

      if (status.connectionPhase === "oauth_connected") {
        return "ready";
      }

      if (status.connectionPhase !== "calendar_ready") {
        return "hidden";
      }

      const syncState = getSeriesSyncState(seriesId);
      if (syncState.dirty) {
        return "unsynced";
      }

      return "synced";
    },
    [getSeriesSyncState, pushError, pushingSeriesId, status, userId],
  );

  const connect = useCallback((returnTo = "/") => {
    window.location.href = `/api/calendar/connect?returnTo=${encodeURIComponent(returnTo)}`;
  }, []);

  const disconnect = useCallback(async (deleteRemote = false) => {
    const response = await fetch(`/api/calendar/disconnect?deleteRemote=${deleteRemote}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to disconnect calendar.");
    }
    await refreshStatus();
  }, [refreshStatus]);

  const previewPush = useCallback(
    async (seriesId: string): Promise<PushPreviewResponse> => {
      const seriesPayload = series.find((item) => item.id === seriesId);
      if (!seriesPayload) {
        throw new Error("Series not found.");
      }

      const response = await fetch("/api/calendar/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId, series: seriesPayload }),
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Unable to preview push.");
      }
      return (await response.json()) as PushPreviewResponse;
    },
    [series],
  );

  const queuePush = useCallback(async (seriesId: string) => {
    await fetch("/api/calendar/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesId }),
    });
    await refreshStatus();
  }, [refreshStatus]);

  const pushSeries = useCallback(
    async (seriesId: string) => {
      if (!userId) {
        throw new Error("Sign in to push to Google Calendar.");
      }

      const seriesPayload = series.find((item) => item.id === seriesId);
      if (!seriesPayload) {
        throw new Error("Series not found.");
      }

      if (isBrowserOffline()) {
        await queuePush(seriesId);
        return null;
      }

      setPushError(null);
      setPushingSeriesId(seriesId);

      try {
        const response = await fetch("/api/calendar/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seriesId, series: seriesPayload }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { error?: string; lastPublishedAt?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "Push failed.");
        }

        await refreshStatus();
        return payload;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Push failed.";
        setPushError(message);
        if (isBrowserOffline()) {
          await queuePush(seriesId);
        }
        throw error;
      } finally {
        setPushingSeriesId(null);
      }
    },
    [queuePush, refreshStatus, series, userId],
  );

  const getLocalSeriesHash = useCallback((item: Series) => buildSeriesContentHash(item), []);

  return {
    status,
    loading,
    pushError,
    pushingSeriesId,
    refreshStatus,
    getSeriesSyncState,
    getBadgeState,
    connect,
    disconnect,
    previewPush,
    pushSeries,
    queuePush,
    getLocalSeriesHash,
  };
}

export type CalendarSyncContextValue = ReturnType<typeof useCalendarSync>;
