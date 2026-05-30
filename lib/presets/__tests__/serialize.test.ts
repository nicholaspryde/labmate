import { describe, expect, it } from "vitest";
import {
  parsePresetJson,
  presetToTimepoints,
  PresetValidationError,
  seriesToPreset,
} from "@/lib/presets/serialize";
import { seriesReducer, initialState } from "@/lib/seriesReducer";
import { RELATIVE_TO_PREVIOUS, type Series } from "@/lib/types";
import { MINUTES_IN_DAY } from "@/lib/timepointMath";

function makeSeries(): Series {
  return {
    id: "series-1",
    name: "Test protocol",
    color: "#2563eb",
    anchorAt: "2026-05-01T12:00:00.000Z",
    timepoints: [
      {
        id: "tp-0",
        name: "Start",
        description: "Anchor",
        offsetFromStartMinutes: 0,
        hasScheduledTime: false,
        durationMinutes: 60,
      },
      {
        id: "tp-1",
        name: "Follow-up",
        description: "",
        offsetFromStartMinutes: MINUTES_IN_DAY,
        relativeToTimepointId: RELATIVE_TO_PREVIOUS,
        hasScheduledTime: false,
        durationMinutes: 30,
      },
      {
        id: "tp-2",
        name: "Week mark",
        description: "",
        offsetFromStartMinutes: MINUTES_IN_DAY * 7,
        relativeToTimepointId: "tp-0",
        hasScheduledTime: true,
        durationMinutes: 45,
      },
    ],
  };
}

describe("preset serialization", () => {
  it("round-trips a custom-mode series preserving gaps and relative refs", () => {
    const series = makeSeries();
    const preset = seriesToPreset(series, "custom", "My preset");

    expect(preset.offsetMode).toBe("custom");
    expect(preset.timepoints).toHaveLength(3);
    expect(preset.timepoints[1].relativeRef).toBe("previous");
    expect(preset.timepoints[2].relativeRef).toBe("index:0");
    expect(preset.timepoints[2].hasScheduledTime).toBe(true);

    const timepoints = presetToTimepoints(preset);
    expect(timepoints).toHaveLength(3);
    expect(timepoints[0].offsetFromStartMinutes).toBe(0);
    expect(timepoints[1].offsetFromStartMinutes).toBe(MINUTES_IN_DAY);
    expect(timepoints[2].offsetFromStartMinutes).toBe(MINUTES_IN_DAY * 7);
    expect(timepoints[1].relativeToTimepointId).toBe(RELATIVE_TO_PREVIOUS);
    expect(timepoints[2].relativeToTimepointId).toBe(timepoints[0].id);
    expect(timepoints.every((tp) => tp.id.length > 0)).toBe(true);
  });

  it("omits relative refs when not in custom mode", () => {
    const series = makeSeries();
    const preset = seriesToPreset(series, "from-previous", "Chain preset");
    expect(preset.timepoints[1].relativeRef).toBeUndefined();
    expect(preset.timepoints[2].relativeRef).toBeUndefined();
  });

  it("validates preset JSON and rejects bad versions", () => {
    expect(() => parsePresetJson("{")).toThrow(PresetValidationError);
    expect(() =>
      parsePresetJson(
        JSON.stringify({
          version: 99,
          name: "Bad",
          offsetMode: "from-start",
          timepoints: [{ name: "A", description: "", offsetFromStartMinutes: 0 }],
        }),
      ),
    ).toThrow(/Unsupported preset version/);
  });

  it("requires anchor timepoint at offset 0", () => {
    expect(() =>
      parsePresetJson(
        JSON.stringify({
          version: 1,
          name: "Bad anchor",
          offsetMode: "from-start",
          timepoints: [{ name: "A", description: "", offsetFromStartMinutes: 60 }],
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
      ),
    ).toThrow(/First timepoint must start at offset 0/);
  });
});

describe("apply-preset reducer", () => {
  const preset = seriesToPreset(
    {
      id: "series-1",
      name: "Saved template",
      color: "#2563eb",
      anchorAt: "2026-05-01T12:00:00.000Z",
      timepoints: [
        {
          id: "tp-0",
          name: "Day 0",
          description: "",
          offsetFromStartMinutes: 0,
          durationMinutes: 60,
        },
        {
          id: "tp-1",
          name: "Day 1",
          description: "",
          offsetFromStartMinutes: MINUTES_IN_DAY,
          durationMinutes: 30,
        },
      ],
    },
    "from-previous",
    "Saved template",
  );

  it("replaces the active series timepoints while keeping id and name", () => {
    const activeId = initialState.activeSeriesId!;
    const next = seriesReducer(initialState, {
      type: "apply-preset",
      preset,
      target: "replace",
      seriesId: activeId,
    });

    const updated = next.series.find((series) => series.id === activeId);
    expect(updated).toBeDefined();
    expect(updated?.name).toBe("");
    expect(updated?.timepoints).toHaveLength(preset.timepoints.length);
    expect(updated?.timepoints[0].name).toBe("Day 0");
    expect(next.offsetMode).toBe("from-previous");
  });

  it("creates a new series from a preset and sets it active", () => {
    const next = seriesReducer(initialState, {
      type: "apply-preset",
      preset,
      target: "new",
    });

    expect(next.series).toHaveLength(2);
    expect(next.activeSeriesId).not.toBe(initialState.activeSeriesId);
    const created = next.series.find((series) => series.id === next.activeSeriesId);
    expect(created?.name).toBe(preset.name);
    expect(created?.timepoints).toHaveLength(preset.timepoints.length);
  });
});
