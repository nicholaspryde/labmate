"use client";

import { useCallback, useEffect, useState } from "react";
import { FirstPushDialog } from "@/components/calendar/FirstPushDialog";
import { NavigationPromptDialog } from "@/components/calendar/NavigationPromptDialog";
import { PushPreviewDialog } from "@/components/calendar/PushPreviewDialog";
import { SyncBadge } from "@/components/calendar/SyncBadge";
import { useOptionalCalendarSyncContext } from "@/components/calendar/CalendarSyncProvider";
import type { PushPreviewResponse } from "@/hooks/use-calendar-sync";
import type { Series } from "@/lib/types";

type CalendarSyncControlsProps = {
  activeSeries: Series | null;
  pendingSeriesSwitchId: string | null;
  onPendingSeriesSwitchHandled: () => void;
  onConfirmSeriesSwitch: (seriesId: string) => void;
};

export function CalendarSyncControls({
  activeSeries,
  pendingSeriesSwitchId,
  onPendingSeriesSwitchHandled,
  onConfirmSeriesSwitch,
}: CalendarSyncControlsProps) {
  const calendarSync = useOptionalCalendarSyncContext();
  const [firstPushOpen, setFirstPushOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [navigationPromptOpen, setNavigationPromptOpen] = useState(false);
  const [preview, setPreview] = useState<PushPreviewResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeSeriesId = activeSeries?.id ?? null;
  const badgeState = activeSeriesId && calendarSync ? calendarSync.getBadgeState(activeSeriesId) : "hidden";
  const syncState =
    activeSeriesId && calendarSync ? calendarSync.getSeriesSyncState(activeSeriesId) : null;
  const connectionPhase = calendarSync?.status?.connectionPhase ?? "not_connected";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar") === "connected") {
      setFirstPushOpen(true);
      params.delete("calendar");
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    }
  }, []);

  useEffect(() => {
    if (!pendingSeriesSwitchId || !activeSeriesId || !calendarSync) {
      return;
    }

    const syncStateForActive = calendarSync.getSeriesSyncState(activeSeriesId);
    if (
      syncStateForActive.dirty &&
      (connectionPhase === "calendar_ready" || connectionPhase === "oauth_connected")
    ) {
      setNavigationPromptOpen(true);
      return;
    }

    onConfirmSeriesSwitch(pendingSeriesSwitchId);
    onPendingSeriesSwitchHandled();
  }, [
    activeSeriesId,
    calendarSync,
    connectionPhase,
    onConfirmSeriesSwitch,
    onPendingSeriesSwitchHandled,
    pendingSeriesSwitchId,
  ]);

  const runPush = useCallback(async () => {
    if (!calendarSync || !activeSeriesId) {
      return;
    }

    setIsSubmitting(true);
    try {
      await calendarSync.pushSeries(activeSeriesId);
      setFirstPushOpen(false);
      setPreviewOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [activeSeriesId, calendarSync]);

  const handleBadgeClick = useCallback(async () => {
    if (!calendarSync || !activeSeriesId) {
      return;
    }

    if (connectionPhase === "not_connected") {
      calendarSync.connect("/");
      return;
    }

    if (connectionPhase === "oauth_connected") {
      setFirstPushOpen(true);
      return;
    }

    if (badgeState === "error" || badgeState === "queued" || badgeState === "unsynced") {
      setIsSubmitting(true);
      try {
        const nextPreview = await calendarSync.previewPush(activeSeriesId);
        setPreview(nextPreview);
        setPreviewOpen(true);
      } catch {
        await runPush();
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [activeSeriesId, badgeState, calendarSync, connectionPhase, runPush]);

  if (!calendarSync || !activeSeries) {
    return null;
  }

  return (
    <>
      <SyncBadge
        state={badgeState}
        lastPublishedAt={syncState?.lastPublishedAt ?? null}
        onClick={() => {
          void handleBadgeClick();
        }}
      />

      <FirstPushDialog
        open={firstPushOpen}
        onOpenChange={setFirstPushOpen}
        onConfirm={runPush}
        isSubmitting={isSubmitting || calendarSync.pushingSeriesId === activeSeries.id}
        needsOAuth={connectionPhase === "not_connected"}
        onConnect={() => calendarSync.connect("/")}
      />

      <PushPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        preview={preview}
        onConfirm={runPush}
        isSubmitting={isSubmitting || calendarSync.pushingSeriesId === activeSeries.id}
      />

      <NavigationPromptDialog
        open={navigationPromptOpen}
        onOpenChange={setNavigationPromptOpen}
        onPush={() => {
          setNavigationPromptOpen(false);
          void handleBadgeClick();
          onPendingSeriesSwitchHandled();
        }}
        onSkip={() => {
          setNavigationPromptOpen(false);
          if (pendingSeriesSwitchId) {
            onConfirmSeriesSwitch(pendingSeriesSwitchId);
          }
          onPendingSeriesSwitchHandled();
        }}
      />
    </>
  );
}
