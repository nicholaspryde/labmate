import { describe, expect, it } from "vitest";
import { seriesReducer } from "@/lib/seriesReducer";
import type { AppState } from "@/lib/types";

describe("calendar drag behavior", () => {
  it("shifts series anchor date by whole day delta", () => {
    const anchorAt = new Date("2026-05-01T08:00:00.000Z").toISOString();
    const state: AppState = {
      activeSeriesId: "s1",
      offsetMode: "from-start",
      series: [
        {
          id: "s1",
          name: "Series A",
          color: "#2563eb",
          anchorAt,
          timepoints: [
            { id: "a", name: "Anchor", description: "", offsetFromStartMinutes: 0 },
            { id: "b", name: "TP 2", description: "", offsetFromStartMinutes: 60 },
          ],
        },
      ],
    };

    const next = seriesReducer(state, {
      type: "shift-series-days",
      seriesId: "s1",
      deltaDays: 3,
    });

    expect(new Date(next.series[0].anchorAt).toISOString()).toBe(
      new Date("2026-05-04T08:00:00.000Z").toISOString(),
    );
  });
});
