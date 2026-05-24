"use client";

import { useReducer } from "react";
import { initialState, seriesReducer } from "@/lib/seriesReducer";
import { TimepointEditor } from "@/components/editor/TimepointEditor";
import { Button } from "@/components/ui/button";

export function TimepointCalendarApp() {
  const [state, dispatch] = useReducer(seriesReducer, initialState);
  const activeSeries =
    state.series.find((series) => series.id === state.activeSeriesId) ??
    state.series[0] ??
    null;

  const createSeries = () => {
    dispatch({ type: "create-series", name: "Time series" });
  };

  return (
    <main className="min-h-screen bg-[#ffffff] p-4 md:p-6">
      <div className="mx-auto max-w-[600px]">
        {state.series.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-center text-muted-foreground">
              Create your protocol to begin editing timepoints.
            </p>
            <Button onClick={createSeries}>Create protocol</Button>
          </div>
        ) : (
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
            dispatch({ type: "set-timepoint-description", seriesId: activeSeries.id, timepointId, description });
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
          onTimepointOffsetChange={(timepointId, minutes) => {
            if (!activeSeries) return;
            dispatch({
              type: "set-timepoint-offset",
              seriesId: activeSeries.id,
              timepointId,
              minutes,
              mode: state.offsetMode,
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
          />
        )}
      </div>
    </main>
  );
}
