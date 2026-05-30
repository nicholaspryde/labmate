import { v4 as uuid } from "uuid";
import { presetToTimepoints } from "@/lib/presets/serialize";
import type { ProtocolPreset } from "@/lib/presets/types";
import { RELATIVE_TO_PREVIOUS, type AppState, type OffsetMode, type Series } from "@/lib/types";
import {
  defaultRelativeToTimepointId,
  isDefaultRelativeReference,
  MINUTES_IN_DAY,
} from "@/lib/timepointMath";

const SERIES_COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#4f46e5",
  "#be123c",
];

export type SeriesAction =
  | { type: "create-series"; name: string }
  | { type: "delete-series"; seriesId: string }
  | { type: "set-active-series"; seriesId: string | null }
  | { type: "set-offset-mode"; mode: OffsetMode }
  | { type: "set-series-name"; seriesId: string; name: string }
  | { type: "set-anchor-date-time"; seriesId: string; anchorAt: string }
  | { type: "set-timepoint-name"; seriesId: string; timepointId: string; name: string }
  | { type: "set-timepoint-description"; seriesId: string; timepointId: string; description: string }
  | { type: "set-timepoint-scheduled-time"; seriesId: string; timepointId: string; hasScheduledTime: boolean }
  | { type: "set-timepoint-duration"; seriesId: string; timepointId: string; durationMinutes: number }
  | { type: "add-timepoint"; seriesId: string }
  | { type: "delete-timepoint"; seriesId: string; timepointId: string }
  | { type: "reorder-timepoints"; seriesId: string; fromIndex: number; toIndex: number }
  | {
      type: "set-timepoint-offset";
      seriesId: string;
      timepointId: string;
      minutes: number;
      mode: OffsetMode;
      /** "toggle" = main display input (series +0 / previous). "author" = picker calculator. */
      referenceBasis?: "toggle" | "author";
    }
  | {
      type: "set-timepoint-relative-to";
      seriesId: string;
      timepointId: string;
      relativeToTimepointId: string | null;
      mode: OffsetMode;
    }
  | { type: "shift-series-days"; seriesId: string; deltaDays: number }
  | {
      type: "apply-preset";
      preset: ProtocolPreset;
      target: "replace" | "new";
      seriesId?: string;
    }
  | { type: "replace-state"; state: AppState };

export function nowAnchorIso(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString();
}

function createSeries(name: string, color: string): Series {
  return {
    id: uuid(),
    name,
    color,
    anchorAt: nowAnchorIso(),
    timepoints: [
      {
        id: uuid(),
        name: "",
        description: "",
        offsetFromStartMinutes: 0,
        hasScheduledTime: false,
        durationMinutes: 60,
      },
    ],
  };
}

export const BOOTSTRAP_SERIES_ID = "00000000-0000-4000-a000-000000000001";
export const BOOTSTRAP_TIMEPOINT_ID = "00000000-0000-4000-a000-000000000002";
const BOOTSTRAP_PLACEHOLDER_ANCHOR_AT = "1970-01-01T14:00:00.000Z";

function createBootstrapSeries(): Series {
  return {
    id: BOOTSTRAP_SERIES_ID,
    name: "",
    color: SERIES_COLORS[0],
    anchorAt: BOOTSTRAP_PLACEHOLDER_ANCHOR_AT,
    timepoints: [
      {
        id: BOOTSTRAP_TIMEPOINT_ID,
        name: "",
        description: "",
        offsetFromStartMinutes: 0,
        hasScheduledTime: false,
        durationMinutes: 60,
      },
    ],
  };
}

function updateSeries(state: AppState, seriesId: string, updater: (series: Series) => Series): AppState {
  return {
    ...state,
    series: state.series.map((series) => (series.id === seriesId ? updater(series) : series)),
  };
}

export const initialState: AppState = {
  series: [createBootstrapSeries()],
  activeSeriesId: BOOTSTRAP_SERIES_ID,
  offsetMode: "from-start",
};

function applyPresetToSeries(series: Series, preset: ProtocolPreset): Series {
  return {
    ...series,
    anchorAt: nowAnchorIso(),
    timepoints: presetToTimepoints(preset),
  };
}

function createSeriesFromPreset(preset: ProtocolPreset, color: string): Series {
  return {
    id: uuid(),
    name: preset.name,
    color,
    anchorAt: nowAnchorIso(),
    timepoints: presetToTimepoints(preset),
  };
}

export function seriesReducer(state: AppState, action: SeriesAction): AppState {
  switch (action.type) {
    case "create-series": {
      const series = createSeries(
        action.name,
        SERIES_COLORS[state.series.length % SERIES_COLORS.length],
      );
      return {
        ...state,
        series: [...state.series, series],
        activeSeriesId: series.id,
      };
    }
    case "delete-series": {
      const nextSeries = state.series.filter((series) => series.id !== action.seriesId);
      const activeSeriesId =
        state.activeSeriesId === action.seriesId ? (nextSeries[0]?.id ?? null) : state.activeSeriesId;

      return {
        ...state,
        series: nextSeries,
        activeSeriesId,
      };
    }
    case "set-active-series":
      return { ...state, activeSeriesId: action.seriesId };
    case "set-offset-mode":
      return { ...state, offsetMode: action.mode };
    case "set-series-name":
      return updateSeries(state, action.seriesId, (series) => ({ ...series, name: action.name }));
    case "set-anchor-date-time":
      return updateSeries(state, action.seriesId, (series) => ({ ...series, anchorAt: action.anchorAt }));
    case "set-timepoint-name":
      return updateSeries(state, action.seriesId, (series) => ({
        ...series,
        timepoints: series.timepoints.map((timepoint) =>
          timepoint.id === action.timepointId ? { ...timepoint, name: action.name } : timepoint,
        ),
      }));
    case "set-timepoint-description":
      return updateSeries(state, action.seriesId, (series) => ({
        ...series,
        timepoints: series.timepoints.map((timepoint) =>
          timepoint.id === action.timepointId
            ? { ...timepoint, description: action.description }
            : timepoint,
        ),
      }));
    case "set-timepoint-scheduled-time":
      return updateSeries(state, action.seriesId, (series) => ({
        ...series,
        timepoints: series.timepoints.map((timepoint) =>
          timepoint.id === action.timepointId
            ? { ...timepoint, hasScheduledTime: action.hasScheduledTime }
            : timepoint,
        ),
      }));
    case "set-timepoint-duration":
      return updateSeries(state, action.seriesId, (series) => ({
        ...series,
        timepoints: series.timepoints.map((timepoint) =>
          timepoint.id === action.timepointId
            ? { ...timepoint, durationMinutes: Math.max(1, Math.floor(action.durationMinutes)) }
            : timepoint,
        ),
      }));
    case "add-timepoint":
      return updateSeries(state, action.seriesId, (series) => {
        const previous = series.timepoints[series.timepoints.length - 1];
        const lastOffset = previous?.offsetFromStartMinutes ?? 0;
        return {
          ...series,
          timepoints: [
            ...series.timepoints,
            {
              id: uuid(),
              name: "",
              description: "",
              offsetFromStartMinutes: lastOffset + MINUTES_IN_DAY,
              hasScheduledTime: previous?.hasScheduledTime ?? false,
              durationMinutes: previous?.durationMinutes ?? 60,
            },
          ],
        };
      });
    case "delete-timepoint":
      return updateSeries(state, action.seriesId, (series) => ({
        ...series,
        timepoints: series.timepoints
          .filter((timepoint, index) => {
            if (index === 0) {
              return true;
            }
            return timepoint.id !== action.timepointId;
          })
          .map((timepoint) =>
            timepoint.relativeToTimepointId === action.timepointId
              ? { ...timepoint, relativeToTimepointId: undefined }
              : timepoint,
          ),
      }));
    case "reorder-timepoints":
      return updateSeries(state, action.seriesId, (series) => {
        if (action.fromIndex === 0 || action.toIndex === 0) {
          return series;
        }
        const items = [...series.timepoints];
        const [moved] = items.splice(action.fromIndex, 1);
        if (!moved) {
          return series;
        }
        items.splice(action.toIndex, 0, moved);
        return { ...series, timepoints: items };
      });
    case "set-timepoint-offset":
      return updateSeries(state, action.seriesId, (series) => {
        const index = series.timepoints.findIndex((timepoint) => timepoint.id === action.timepointId);
        if (index <= 0) {
          return series;
        }
        const safeMinutes = Math.max(0, Math.floor(action.minutes));
        const next = [...series.timepoints];
        const timepoint = next[index];
        const referenceBasis = action.referenceBasis ?? "author";
        const usesCustomReference =
          referenceBasis === "author" && Boolean(timepoint.relativeToTimepointId);

        if (referenceBasis === "toggle" && action.mode !== "custom") {
          if (action.mode === "from-previous") {
            const previousOffset = next[index - 1].offsetFromStartMinutes;
            const currentOffset = next[index].offsetFromStartMinutes;
            const absoluteMinutes = previousOffset + safeMinutes;
            const delta = absoluteMinutes - currentOffset;

            for (let i = index; i < next.length; i += 1) {
              next[i] = {
                ...next[i],
                offsetFromStartMinutes: Math.max(0, next[i].offsetFromStartMinutes + delta),
              };
            }
            return { ...series, timepoints: next };
          }

          const referenceId = defaultRelativeToTimepointId(series, index, action.mode);
          const referenceIndex = series.timepoints.findIndex((candidate) => candidate.id === referenceId);
          const referenceOffset =
            referenceIndex >= 0 ? next[referenceIndex].offsetFromStartMinutes : next[0].offsetFromStartMinutes;
          next[index] = { ...next[index], offsetFromStartMinutes: referenceOffset + safeMinutes };
          return { ...series, timepoints: next };
        }

        if (usesCustomReference || action.mode === "from-start" || action.mode === "custom") {
          let referenceOffset: number;
          if (timepoint.relativeToTimepointId === RELATIVE_TO_PREVIOUS) {
            referenceOffset = next[index - 1]?.offsetFromStartMinutes ?? 0;
          } else {
            const referenceId = timepoint.relativeToTimepointId ?? defaultRelativeToTimepointId(series, index, action.mode);
            const referenceIndex = series.timepoints.findIndex((candidate) => candidate.id === referenceId);
            referenceOffset =
              referenceIndex >= 0 ? next[referenceIndex].offsetFromStartMinutes : next[0].offsetFromStartMinutes;
          }
          next[index] = { ...next[index], offsetFromStartMinutes: referenceOffset + safeMinutes };
          return { ...series, timepoints: next };
        }

        const previousOffset = next[index - 1].offsetFromStartMinutes;
        const currentOffset = next[index].offsetFromStartMinutes;
        const absoluteMinutes = previousOffset + safeMinutes;
        const delta = absoluteMinutes - currentOffset;

        for (let i = index; i < next.length; i += 1) {
          next[i] = {
            ...next[i],
            offsetFromStartMinutes: Math.max(0, next[i].offsetFromStartMinutes + delta),
          };
        }
        return { ...series, timepoints: next };
      });
    case "set-timepoint-relative-to":
      return updateSeries(state, action.seriesId, (series) => {
        const index = series.timepoints.findIndex((timepoint) => timepoint.id === action.timepointId);
        if (index <= 0) {
          return series;
        }

        const next = [...series.timepoints];
        const timepoint = next[index];
        const nextReferenceId = action.relativeToTimepointId;

        // Null / self-reference → clear to default (+0)
        if (!nextReferenceId || nextReferenceId === action.timepointId) {
          next[index] = { ...timepoint, relativeToTimepointId: undefined };
          return { ...series, timepoints: next };
        }

        // RELATIVE_TO_PREVIOUS sentinel — store as-is
        if (nextReferenceId === RELATIVE_TO_PREVIOUS) {
          next[index] = { ...timepoint, relativeToTimepointId: RELATIVE_TO_PREVIOUS };
          return { ...series, timepoints: next };
        }

        // Normalise specific IDs that happen to be the mode default back to undefined
        if (isDefaultRelativeReference(series, index, action.mode, nextReferenceId)) {
          next[index] = { ...timepoint, relativeToTimepointId: undefined };
          return { ...series, timepoints: next };
        }

        const referenceExists = series.timepoints.some((candidate) => candidate.id === nextReferenceId);
        if (!referenceExists) {
          return series;
        }

        next[index] = { ...timepoint, relativeToTimepointId: nextReferenceId };
        return { ...series, timepoints: next };
      });
    case "shift-series-days":
      return updateSeries(state, action.seriesId, (series) => {
        if (action.deltaDays === 0) {
          return series;
        }
        const anchor = new Date(series.anchorAt);
        anchor.setDate(anchor.getDate() + action.deltaDays);
        return { ...series, anchorAt: anchor.toISOString() };
      });
    case "apply-preset": {
      if (action.target === "replace") {
        if (!action.seriesId) {
          return state;
        }
        return {
          ...state,
          offsetMode: action.preset.offsetMode,
          series: state.series.map((series) =>
            series.id === action.seriesId ? applyPresetToSeries(series, action.preset) : series,
          ),
        };
      }

      const series = createSeriesFromPreset(
        action.preset,
        SERIES_COLORS[state.series.length % SERIES_COLORS.length],
      );
      return {
        ...state,
        offsetMode: action.preset.offsetMode,
        series: [...state.series, series],
        activeSeriesId: series.id,
      };
    }
    case "replace-state":
      return action.state;
    default:
      return state;
  }
}
