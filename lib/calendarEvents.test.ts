import { describe, expect, it } from "vitest";
import {
  buildEventContentHash,
  buildGoogleSyncHash,
  buildSeriesContentHash,
  buildSeriesEvents,
  computeSyncDiff,
} from "@/lib/calendarEvents";
import type { Series } from "@/lib/types";

const baseSeries: Series = {
  id: "series-1",
  name: "Experiment A",
  color: "#2563eb",
  anchorAt: "2026-06-01T09:00:00.000Z",
  timepoints: [
    {
      id: "tp-1",
      name: "Anchor",
      description: "Start",
      offsetFromStartMinutes: 0,
    },
    {
      id: "tp-2",
      name: "Day 2",
      description: "Check cells",
      offsetFromStartMinutes: 24 * 60,
      durationMinutes: 45,
    },
  ],
};

describe("calendarEvents", () => {
  it("builds resolved events with stable titles", () => {
    const events = buildSeriesEvents(baseSeries);
    expect(events).toHaveLength(2);
    expect(events[0]?.title).toBe("Experiment A - Anchor");
    expect(events[1]?.end.getTime() - events[1]?.start.getTime()).toBe(45 * 60 * 1000);
  });

  it("uses distinct series and event hashes", () => {
    const events = buildSeriesEvents(baseSeries);
    const seriesHash = buildSeriesContentHash(baseSeries);
    const eventHash = buildEventContentHash(events[0]!);

    expect(seriesHash).not.toBe(eventHash);

    const renamedSeries = {
      ...baseSeries,
      timepoints: baseSeries.timepoints.map((timepoint, index) =>
        index === 1 ? { ...timepoint, name: "Day 2 updated" } : timepoint,
      ),
    };

    expect(buildSeriesContentHash(renamedSeries)).not.toBe(seriesHash);
    expect(buildEventContentHash(buildSeriesEvents(renamedSeries)[1]!)).not.toBe(
      buildEventContentHash(events[1]!),
    );
  });

  it("computes sync diff from per-event hashes", () => {
    const desired = buildSeriesEvents(baseSeries);
    const diff = computeSyncDiff(desired, [], baseSeries.id);

    expect(diff.summary.added).toBe(2);
    expect(diff.summary.updated).toBe(0);
    expect(diff.summary.removed).toBe(0);

    const mappings = desired.map((event) => ({
      seriesId: event.seriesId,
      timepointId: event.timepointId,
      externalEventId: `google-${event.timepointId}`,
      contentHash: buildGoogleSyncHash(event),
    }));

    const noChange = computeSyncDiff(desired, mappings, baseSeries.id);
    expect(noChange.summary.added).toBe(0);
    expect(noChange.summary.updated).toBe(0);
    expect(noChange.summary.removed).toBe(0);
  });

  it("detects legacy mappings missing the Google footer hash", () => {
    const desired = buildSeriesEvents(baseSeries);
    const legacyMappings = desired.map((event) => ({
      seriesId: event.seriesId,
      timepointId: event.timepointId,
      externalEventId: `google-${event.timepointId}`,
      contentHash: buildEventContentHash(event),
    }));

    const diff = computeSyncDiff(desired, legacyMappings, baseSeries.id);
    expect(diff.summary.updated).toBe(desired.length);
    expect(diff.summary.added).toBe(0);
  });
});
