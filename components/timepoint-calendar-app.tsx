"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { CalendarSyncProvider } from "@/components/calendar/CalendarSyncProvider";
import { CalendarSyncControls } from "@/components/calendar/CalendarSyncControls";
import { SaveStatusIndicator } from "@/components/workspace/SaveStatusIndicator";
import { CalendarPreview, type TimepointHoverHighlight } from "@/components/calendar/CalendarPreview";
import { ExperimentPanel } from "@/components/experiment/experiment-panel";
import { TimepointEditor } from "@/components/editor/TimepointEditor";
import { Button } from "@/components/ui/button";
import { useAppNavigation } from "@/components/app-navigation-provider";
import { useExperimentPanelSlot } from "@/components/workspace/workspace-chrome-context";
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
  const { section, setSection } = useAppNavigation();
  const experimentPanelSlot = useExperimentPanelSlot();
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
  const deferredSeries = useDeferredValue(state.series);
  const calendarEvents = useMemo(() => mapSeriesToCalendarEvents(deferredSeries), [deferredSeries]);
  const showWorkspace = section === "active" && state.series.length > 0 && activeSeries;

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
    if (deepLinkSeriesId) {
      setSection("active");
    }
  }, [deepLinkSeriesId, setSection]);

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

  const syncControls = (
    <CalendarSyncControls
      activeSeries={activeSeries}
      pendingSeriesSwitchId={pendingSeriesSwitchId}
      onPendingSeriesSwitchHandled={() => setPendingSeriesSwitchId(null)}
      onConfirmSeriesSwitch={(seriesId) => dispatch({ type: "set-active-series", seriesId })}
    />
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading your workspace...</p>
      </div>
    );
  }

  const mainContent =
    section === "history" ? (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      </div>
    ) : state.series.length === 0 ? (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-center text-muted-foreground">
          Create your protocol to begin editing timepoints.
        </p>
        <Button onClick={createSeries}>Create protocol</Button>
      </div>
    ) : showWorkspace ? (
      <div className="grid min-h-0 flex-1 gap-x-6 gap-y-4 lg:grid-cols-[360px_1fr]">
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
              dispatch({ type: "set-anchor-date-time", seriesId: activeSeries.id, anchorAt });
            }}
            onAddTimepoint={() => {
              dispatch({ type: "add-timepoint", seriesId: activeSeries.id });
            }}
            onDeleteTimepoint={(timepointId) => {
              dispatch({ type: "delete-timepoint", seriesId: activeSeries.id, timepointId });
            }}
            onReorderTimepoint={(fromIndex, toIndex) => {
              dispatch({
                type: "reorder-timepoints",
                seriesId: activeSeries.id,
                fromIndex,
                toIndex,
              });
            }}
            onTimepointNameChange={(timepointId, name) => {
              dispatch({ type: "set-timepoint-name", seriesId: activeSeries.id, timepointId, name });
            }}
            onTimepointDescriptionChange={(timepointId, description) => {
              dispatch({
                type: "set-timepoint-description",
                seriesId: activeSeries.id,
                timepointId,
                description,
              });
            }}
            onTimepointScheduledTimeChange={(timepointId, hasScheduledTime) => {
              dispatch({
                type: "set-timepoint-scheduled-time",
                seriesId: activeSeries.id,
                timepointId,
                hasScheduledTime,
              });
            }}
            onTimepointDurationChange={(timepointId, durationMinutes) => {
              dispatch({
                type: "set-timepoint-duration",
                seriesId: activeSeries.id,
                timepointId,
                durationMinutes,
              });
            }}
            onTimepointDisplayOffsetChange={(timepointId, minutes) => {
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
              dispatch({
                type: "set-timepoint-offset",
                seriesId: activeSeries.id,
                timepointId,
                minutes: minutesFromStart,
                mode: "from-start",
              });
            }}
            onTimepointRelativeReferenceChange={(timepointId, relativeToTimepointId) => {
              dispatch({
                type: "set-timepoint-relative-to",
                seriesId: activeSeries.id,
                timepointId,
                relativeToTimepointId,
                mode: state.offsetMode,
              });
            }}
            onApplyPreset={(preset) => {
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
            focusDate={activeSeries.anchorAt}
            highlightedTimepointId={highlightedTimepoint?.timepointId ?? null}
            onHoverTimepoint={setHighlightedTimepoint}
            onEventDayChange={handleEventDayChange}
          />
        </div>
      </div>
    ) : null;

  const experimentPanel = (
    <ExperimentPanel
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
      syncControls={state.series.length > 0 ? syncControls : undefined}
    />
  );

  const workspaceLayout = (
    <>
      {experimentPanelSlot && createPortal(experimentPanel, experimentPanelSlot)}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4 md:p-6 lg:overflow-hidden lg:pb-4">
        {mainContent}
      </div>
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:h-[calc(100svh-0px)]">
      <SaveStatusIndicator status={saveStatus} />
      {deepLinkMessage ? (
        <p className="mx-4 mt-3 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground md:mx-6">
          {deepLinkMessage}
        </p>
      ) : null}

      {state.series.length > 0 ? (
        <CalendarSyncProvider userId={user?.id ?? null} authLoading={authLoading} series={state.series}>
          {workspaceLayout}
        </CalendarSyncProvider>
      ) : (
        workspaceLayout
      )}
    </div>
  );
}
