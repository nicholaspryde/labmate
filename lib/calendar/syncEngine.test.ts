import { describe, expect, it } from "vitest";
import {
  buildGoogleSyncHash,
  buildSeriesEvents,
  computeSyncDiff,
} from "@/lib/calendarEvents";
import { buildPatchFields } from "@/lib/calendar/syncEngine";
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
    {
      id: "tp-2",
      name: "Day 2",
      description: "",
      offsetFromStartMinutes: 1440,
    },
  ],
};

describe("syncEngine helpers", () => {
  it("detects added, updated, and removed events", () => {
    const desired = buildSeriesEvents(series);
    const initial = computeSyncDiff(desired, [], series.id);
    expect(initial.summary.added).toBe(2);

    const mappings = [
      {
        seriesId: series.id,
        timepointId: "tp-1",
        externalEventId: "evt-1",
        contentHash: buildGoogleSyncHash(desired[0]!),
      },
      {
        seriesId: series.id,
        timepointId: "tp-2",
        externalEventId: "evt-2",
        contentHash: buildGoogleSyncHash(desired[1]!),
      },
    ];

    const updatedSeries: Series = {
      ...series,
      timepoints: [series.timepoints[0]!],
    };
    const nextDesired = buildSeriesEvents(updatedSeries);
    const diff = computeSyncDiff(nextDesired, mappings, series.id);

    expect(diff.summary.removed).toBe(1);
    expect(diff.summary.added).toBe(0);
  });

  it("builds patch fields for changed event properties", () => {
    const desired = buildSeriesEvents(series);
    const renamed = buildSeriesEvents({
      ...series,
      timepoints: series.timepoints.map((timepoint, index) =>
        index === 1 ? { ...timepoint, name: "Day 2 renamed" } : timepoint,
      ),
    });

    const fields = buildPatchFields(desired[1]!, renamed[1]!);
    expect(fields).toContain("summary");
  });
});
