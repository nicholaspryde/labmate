"use client";

import { useLayoutEffect, useMemo, useReducer } from "react";
import { CalendarPreview } from "@/components/calendar/CalendarPreview";
import { TimepointEditor } from "@/components/editor/TimepointEditor";
import { Button } from "@/components/ui/button";
import { mapSeriesToCalendarEvents } from "@/lib/calendarMapping";
import { BOOTSTRAP_SERIES_ID, initialState, nowAnchorIso, seriesReducer } from "@/lib/seriesReducer";

export function TimepointCalendarApp() {
  const [state, dispatch] = useReducer(seriesReducer, initialState);

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
  const calendarEvents = useMemo(() => mapSeriesToCalendarEvents(state.series), [state.series]);

  const createSeries = () => {
    dispatch({ type: "create-series", name: "" });
  };

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
            <div className="scrollbar-thin min-h-0 overflow-y-auto pr-3">
            <TimepointEditor
              series={activeSeries}
              mode={state.offsetMode}
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
            />
            </div>
            <div className="min-h-0 lg:sticky lg:top-0 lg:self-start">
            <CalendarPreview
              events={calendarEvents}
              focusDate={activeSeries?.anchorAt ?? null}
              onShiftSeriesDays={(seriesId, deltaDays) =>
                dispatch({ type: "shift-series-days", seriesId, deltaDays })
              }
            />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
