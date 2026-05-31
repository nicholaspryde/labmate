"use client";

import { useCallback, useDeferredValue, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { CalendarPreview } from "@/components/calendar/CalendarPreview";
import { TimepointEditor } from "@/components/editor/TimepointEditor";
import { Button } from "@/components/ui/button";
import { mapSeriesToCalendarEvents } from "@/lib/calendarMapping";
import { BOOTSTRAP_SERIES_ID, initialState, nowAnchorIso, seriesReducer } from "@/lib/seriesReducer";

export function TimepointCalendarApp() {
  const [state, dispatch] = useReducer(seriesReducer, initialState);
  const [highlightedTimepointId, setHighlightedTimepointId] = useState<string | null>(null);
  const [optimizePulseKey, setOptimizePulseKey] = useState(0);
  const [isEditorScrolled, setIsEditorScrolled] = useState(false);
  const editorScrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    dispatch({
      type: "set-anchor-date-time",
      seriesId: BOOTSTRAP_SERIES_ID,
      anchorAt: nowAnchorIso(),
    });
  }, []);

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

  return (
    <main className="min-h-screen bg-background p-4 md:p-6 lg:h-screen lg:overflow-hidden lg:pb-0">
      <div className="h-full w-full">
        {state.series.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-center text-muted-foreground">
              Create your protocol to begin editing timepoints.
            </p>
            <Button onClick={createSeries}>Create protocol</Button>
          </div>
        ) : (
          <div className="grid h-full gap-x-6 gap-y-0 lg:h-[calc(100vh-1.5rem)] lg:grid-cols-[460px_1fr] lg:grid-rows-1">
            <div className="flex min-h-0 flex-col">
            <TimepointEditor
              series={activeSeries}
              mode={state.offsetMode}
              scrollContainerRef={editorScrollRef}
              onScrollContainerScroll={(scrollTop) => setIsEditorScrolled(scrollTop > 6)}
              showTopBarFade={isEditorScrolled}
              highlightedTimepointId={highlightedTimepointId}
              onModeChange={(mode) => dispatch({ type: "set-offset-mode", mode })}
              onSeriesNameChange={(name) =>
                activeSeries && dispatch({ type: "set-series-name", seriesId: activeSeries.id, name })
              }
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
            <div className="min-h-0 lg:sticky lg:top-0 lg:self-start">
            <CalendarPreview
              events={calendarEvents}
              focusDate={activeSeries?.anchorAt ?? null}
              highlightedTimepointId={highlightedTimepointId}
              onHoverTimepoint={setHighlightedTimepointId}
              onEventDayChange={handleEventDayChange}
            />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
