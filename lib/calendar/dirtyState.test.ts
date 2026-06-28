import { describe, expect, it } from "vitest";
import { buildSeriesContentHash, isSeriesDirty } from "@/lib/calendarEvents";
import type { Series } from "@/lib/types";

const series: Series = {
  id: "series-1",
  name: "Experiment",
  color: "#2563eb",
  anchorAt: "2026-06-01T09:00:00.000Z",
  timepoints: [
    {
      id: "tp-1",
      name: "Anchor",
      description: "",
      offsetFromStartMinutes: 0,
    },
  ],
};

describe("dirty state", () => {
  it("treats oauth_connected series with events as publish-ready", () => {
    expect(isSeriesDirty(series, null, "oauth_connected")).toBe(true);
  });

  it("detects dirty when published hash differs", () => {
    const publishedHash = buildSeriesContentHash(series);
    expect(isSeriesDirty(series, publishedHash, "calendar_ready")).toBe(false);

    const edited = {
      ...series,
      timepoints: [{ ...series.timepoints[0]!, name: "Updated anchor" }],
    };
    expect(isSeriesDirty(edited, publishedHash, "calendar_ready")).toBe(true);
  });
});
