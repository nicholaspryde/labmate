import { describe, expect, it } from "vitest";
import { seriesReducer } from "@/lib/seriesReducer";
import type { AppState } from "@/lib/types";

describe("calendar drag behavior", () => {
  const baseState: AppState = {
    activeSeriesId: "s1",
    offsetMode: "from-start",
    series: [
      {
        id: "s1",
        name: "Series A",
        color: "#2563eb",
        anchorAt: new Date("2026-05-01T08:00:00.000Z").toISOString(),
        timepoints: [
          { id: "a", name: "Anchor", description: "", offsetFromStartMinutes: 0 },
          { id: "b", name: "TP 2", description: "", offsetFromStartMinutes: 60 },
        ],
      },
    ],
  };

  it("shifts series anchor date by whole day delta", () => {
    const next = seriesReducer(baseState, {
      type: "shift-series-days",
      seriesId: "s1",
      deltaDays: 3,
    });

    expect(new Date(next.series[0].anchorAt).toISOString()).toBe(
      new Date("2026-05-04T08:00:00.000Z").toISOString(),
    );
  });

  it("moves a non-anchor timepoint by setting absolute offset from start", () => {
    const next = seriesReducer(baseState, {
      type: "set-timepoint-offset",
      seriesId: "s1",
      timepointId: "b",
      minutes: 24 * 60 + 60,
      mode: "from-start",
    });

    expect(next.series[0].timepoints[1].offsetFromStartMinutes).toBe(24 * 60 + 60);
  });
});
