"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { CalendarSyncProvider } from "@/components/calendar/CalendarSyncProvider";
import { CalendarSyncControls } from "@/components/calendar/CalendarSyncControls";
import { SaveStatusIndicator } from "@/components/workspace/SaveStatusIndicator";
import { CalendarPreview, type TimepointHoverHighlight } from "@/components/calendar/CalendarPreview";
import { SeriesTabBar } from "@/components/editor/SeriesTabBar";
import { TimepointEditor } from "@/components/editor/TimepointEditor";
import { Button } from "@/components/ui/button";
import { useWorkspaceSync } from "@/hooks/use-workspace-sync";
import { mapSeriesToCalendarEvents } from "@/lib/calendarMapping";
import { initialState, seriesReducer } from "@/lib/seriesReducer";
import type { AppState } from "@/lib/types";

type TimepointCalendarAppProps = {
  deepLinkSeriesId?: string;
  deepLinkTimepointId?: string | null;
};

export function TimepointCalendarApp({
  deepLinkSeriesId,
  deepLinkTimepointId = null,
}: TimepointCalendarAppProps = {}) {
  const { user, loading: authLoading } = useAuth();
  const [state, dispatch] = useReducer(seriesReducer, initialState);
  const [highlightedTimepoint, setHighlightedTimepoint] = useState<TimepointHoverHighlight | null>(null);
  const [optimizePulseKey, setOptimizePulseKey] = useState(0);
  const [isEditorScrolled, setIsEditorScrolled] = useState(false);
  const [pendingSeriesSwitchId, setPendingSeriesSwitchId] = useState<string | null>(null);
  const [pendingDeepLinkTimepointId, setPendingDeepLinkTimepointId] = useState<string | null>(null);
  const [deepLinkMessage, setDeepLinkMessage] = useState<string | null>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const deepLinkHandledRef = useRef(false);

  const handleHydrate = useCallback((nextState: AppState) => {
    dispatch({ type: "replace-state", state: nextState });
  }, []);

  const { hydrated, saveStatus } = useWorkspaceSync({
    state,
    onHydrate: handleHydrate,
    user,
    authLoading,
  });

  const activeSeries =
    state.series.find((series) => series.id === state.activeSeriesId) ??
    state.series[0] ??
    null;
  // Defer calendar event mapping so heavy calendar re-renders don't block keystroke commits.
  const deferredSeries = useDeferredValue(state.series);
  const calendarEvents = useMemo(() => mapSeriesToCalendarEvents(deferredSeries), [deferredSeries]);

  const createSeries = () => {
    dispatch({ type: "create-series", name: "" });
  };

  const handleEventDayChange = useCallback(
    ({
      seriesId,
      timepointId,
      isAnchor,
      newStart,
      deltaDays,
    }: {
      seriesId: string;
      timepointId: string;
      isAnchor: boolean;
      newStart: Date;
      deltaDays: number;
    }) => {
      if (isAnchor) {
        dispatch({ type: "shift-series-days", seriesId, deltaDays });
        return;
      }

      const series = state.series.find((item) => item.id === seriesId);
      if (!series) {
        return;
      }

      const anchorDate = new Date(series.anchorAt);
      const minutesFromStart = Math.max(0, Math.round((newStart.getTime() - anchorDate.getTime()) / 60_000));
      dispatch({
        type: "set-timepoint-offset",
        seriesId,
        timepointId,
        minutes: minutesFromStart,
        mode: "from-start",
      });
    },
    [state.series],
  );

  const handleApplyWeekendAvoidance = useCallback(
    (deltaDays: number) => {
      if (!activeSeries || deltaDays === 0) {
        return;
      }
      dispatch({ type: "shift-series-days", seriesId: activeSeries.id, deltaDays });
      setOptimizePulseKey((key) => key + 1);
    },
    [activeSeries],
  );

  useEffect(() => {
    if (!hydrated || !deepLinkSeriesId || deepLinkHandledRef.current) {
      return;
    }

    deepLinkHandledRef.current = true;

    const targetSeries = state.series.find((series) => series.id === deepLinkSeriesId);
    if (!targetSeries) {
      setDeepLinkMessage("Series not found.");
      return;
    }

    dispatch({ type: "set-active-series", seriesId: deepLinkSeriesId });

    if (
      deepLinkTimepointId &&
      targetSeries.timepoints.some((timepoint) => timepoint.id === deepLinkTimepointId)
    ) {
      setPendingDeepLinkTimepointId(deepLinkTimepointId);
    }

    window.history.replaceState({}, "", `/series/${deepLinkSeriesId}`);
  }, [hydrated, deepLinkSeriesId, deepLinkTimepointId, state.series]);

  useEffect(() => {
    if (!pendingDeepLinkTimepointId || !activeSeries || activeSeries.id !== deepLinkSeriesId) {
      return;
    }

    const timepointId = pendingDeepLinkTimepointId;
    setPendingDeepLinkTimepointId(null);
    setHighlightedTimepoint({
      timepointId,
      accentColor: activeSeries.color,
    });

    requestAnimationFrame(() => {
      const row = document.querySelector(`[data-timepoint-id="${timepointId}"]`);
      row?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [pendingDeepLinkTimepointId, activeSeries, deepLinkSeriesId]);

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="text-sm text-muted-foreground">Loading your workspace...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-6 lg:h-screen lg:overflow-hidden lg:pb-0">
      <SaveStatusIndicator status={saveStatus} />
      {deepLinkMessage ? (
        <p className="mb-3 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          {deepLinkMessage}
        </p>
      ) : null}
      <div className="h-full w-full">
        {state.series.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-center text-muted-foreground">
              Create your protocol to begin editing timepoints.
            </p>
            <Button onClick={createSeries}>Create protocol</Button>
          </div>
        ) : (
          <CalendarSyncProvider userId={user?.id ?? null} authLoading={authLoading} series={state.series}>
            <div className="flex h-full flex-col lg:h-[calc(100vh-1.5rem)]">
              <SeriesTabBar
                allSeries={state.series}
                activeSeries={activeSeries}
                activeSeriesId={state.activeSeriesId}
                onCreateSeries={createSeries}
                onSetActiveSeries={(seriesId) => dispatch({ type: "set-active-series", seriesId })}
                onRequestSetActiveSeries={setPendingSeriesSwitchId}
                onDeleteSeries={(seriesId) => dispatch({ type: "delete-series", seriesId })}
                onSeriesNameChange={(seriesId, name) =>
                  dispatch({ type: "set-series-name", seriesId, name })
                }
                syncControls={
                  <CalendarSyncControls
                    activeSeries={activeSeries}
                    pendingSeriesSwitchId={pendingSeriesSwitchId}
                    onPendingSeriesSwitchHandled={() => setPendingSeriesSwitchId(null)}
                    onConfirmSeriesSwitch={(seriesId) =>
                      dispatch({ type: "set-active-series", seriesId })
                    }
                  />
                }
              />
            <div className="grid min-h-0 flex-1 gap-x-6 gap-y-4 pt-[8px] pb-[20px] lg:grid-cols-[460px_1fr]">
            <div className="flex min-h-0 flex-col">
            <TimepointEditor
              series={activeSeries}
              mode={state.offsetMode}
              scrollContainerRef={editorScrollRef}
              onScrollContainerScroll={(scrollTop) => setIsEditorScrolled(scrollTop > 6)}
              showTopBarFade={isEditorScrolled}
              highlightedTimepointId={highlightedTimepoint?.timepointId ?? null}
              highlightedAccentColor={highlightedTimepoint?.accentColor ?? null}
              onModeChange={(mode) => dispatch({ type: "set-offset-mode", mode })}
              onAnchorDateTimeChange={(anchorAt) => {
                if (!activeSeries) return;
                dispatch({ type: "set-anchor-date-time", seriesId: activeSeries.id, anchorAt });
              }}
              onAddTimepoint={() => {
                if (!activeSeries) return;
                dispatch({ type: "add-timepoint", seriesId: activeSeries.id });
              }}
              onDeleteTimepoint={(timepointId) => {
                if (!activeSeries) return;
                dispatch({ type: "delete-timepoint", seriesId: activeSeries.id, timepointId });
              }}
              onReorderTimepoint={(fromIndex, toIndex) => {
                if (!activeSeries) return;
                dispatch({
                  type: "reorder-timepoints",
                  seriesId: activeSeries.id,
                  fromIndex,
                  toIndex,
                });
              }}
              onTimepointNameChange={(timepointId, name) => {
                if (!activeSeries) return;
                dispatch({ type: "set-timepoint-name", seriesId: activeSeries.id, timepointId, name });
              }}
              onTimepointDescriptionChange={(timepointId, description) => {
                if (!activeSeries) return;
                dispatch({
                  type: "set-timepoint-description",
                  seriesId: activeSeries.id,
                  timepointId,
                  description,
                });
              }}
              onTimepointScheduledTimeChange={(timepointId, hasScheduledTime) => {
                if (!activeSeries) return;
                dispatch({
                  type: "set-timepoint-scheduled-time",
                  seriesId: activeSeries.id,
                  timepointId,
                  hasScheduledTime,
                });
              }}
              onTimepointDurationChange={(timepointId, durationMinutes) => {
                if (!activeSeries) return;
                dispatch({
                  type: "set-timepoint-duration",
                  seriesId: activeSeries.id,
                  timepointId,
                  durationMinutes,
                });
              }}
              onTimepointDisplayOffsetChange={(timepointId, minutes) => {
                if (!activeSeries) return;
                dispatch({
                  type: "set-timepoint-offset",
                  seriesId: activeSeries.id,
                  timepointId,
                  minutes,
                  mode: state.offsetMode,
                  referenceBasis: "toggle",
                });
              }}
              onTimepointAuthorOffsetChange={(timepointId, minutes) => {
                if (!activeSeries) return;
                dispatch({
                  type: "set-timepoint-offset",
                  seriesId: activeSeries.id,
                  timepointId,
                  minutes,
                  mode: state.offsetMode,
                  referenceBasis: "author",
                });
              }}
              onTimepointAbsoluteOffsetChange={(timepointId, minutesFromStart) => {
                if (!activeSeries) return;
                dispatch({
                  type: "set-timepoint-offset",
                  seriesId: activeSeries.id,
                  timepointId,
                  minutes: minutesFromStart,
                  mode: "from-start",
                });
              }}
              onTimepointRelativeReferenceChange={(timepointId, relativeToTimepointId) => {
                if (!activeSeries) return;
                dispatch({
                  type: "set-timepoint-relative-to",
                  seriesId: activeSeries.id,
                  timepointId,
                  relativeToTimepointId,
                  mode: state.offsetMode,
                });
              }}
              onApplyPreset={(preset) => {
                if (!activeSeries) return;
                dispatch({
                  type: "apply-preset",
                  preset,
                  target: "replace",
                  seriesId: activeSeries.id,
                });
              }}
              onApplyWeekendAvoidance={handleApplyWeekendAvoidance}
              optimizePulseKey={optimizePulseKey}
            />
            </div>
            <div className="flex min-h-0 flex-col">
            <CalendarPreview
              events={calendarEvents}
              focusDate={activeSeries?.anchorAt ?? null}
              highlightedTimepointId={highlightedTimepoint?.timepointId ?? null}
              onHoverTimepoint={setHighlightedTimepoint}
              onEventDayChange={handleEventDayChange}
            />
            </div>
            </div>
            </div>
          </CalendarSyncProvider>
        )}
      </div>
    </main>
  );
}
