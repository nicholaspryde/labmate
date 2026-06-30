import { describe, expect, it } from "vitest";
import { BOOTSTRAP_PLACEHOLDER_ANCHOR_AT } from "@/lib/seriesReducer";
import { isSeriesHistory, partitionSeries } from "@/lib/seriesStatus";
import type { Series, Timepoint } from "@/lib/types";

const NOW = new Date("2026-06-30T12:00:00.000Z");
const DAY_MINUTES = 24 * 60;

/** ISO anchor `dayOffset` days from NOW (local), at local midday — timezone independent. */
function anchorFromNow(dayOffset: number): string {
  const d = new Date(NOW);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString();
}

function tp(offsetFromStartMinutes: number, id = `t${offsetFromStartMinutes}`): Timepoint {
  return { id, name: "", description: "", offsetFromStartMinutes };
}

function makeSeries(overrides: Partial<Series> = {}): Series {
  return {
    id: "s",
    name: "Test",
    color: "#2563eb",
    anchorAt: anchorFromNow(0),
    timepoints: [tp(0)],
    ...overrides,
  };
}

describe("isSeriesHistory", () => {
  it("treats a series anchored today as active", () => {
    expect(isSeriesHistory(makeSeries(), NOW)).toBe(false);
  });

  it("treats a series with all past events as history", () => {
    const series = makeSeries({ anchorAt: anchorFromNow(-10), timepoints: [tp(0), tp(DAY_MINUTES)] });
    expect(isSeriesHistory(series, NOW)).toBe(true);
  });

  it("keeps a series active when at least one event is in the future", () => {
    const series = makeSeries({
      anchorAt: anchorFromNow(-10),
      timepoints: [tp(0), tp(30 * DAY_MINUTES)],
    });
    expect(isSeriesHistory(series, NOW)).toBe(false);
  });

  it("forces archived series into history regardless of dates", () => {
    expect(isSeriesHistory(makeSeries({ archived: true }), NOW)).toBe(true);
  });

  it("keeps a newly-created bootstrap series active", () => {
    expect(isSeriesHistory(makeSeries({ anchorAt: BOOTSTRAP_PLACEHOLDER_ANCHOR_AT }), NOW)).toBe(false);
  });

  it("treats an event earlier today as still active", () => {
    const early = new Date(NOW);
    early.setHours(1, 0, 0, 0);
    expect(isSeriesHistory(makeSeries({ anchorAt: early.toISOString() }), NOW)).toBe(false);
  });
});

describe("partitionSeries", () => {
  it("splits series into active and history preserving order", () => {
    const active = makeSeries({ id: "active" });
    const past = makeSeries({ id: "past", anchorAt: anchorFromNow(-180) });
    const archived = makeSeries({ id: "archived", archived: true });

    const result = partitionSeries([active, past, archived], NOW);
    expect(result.active.map((s) => s.id)).toEqual(["active"]);
    expect(result.history.map((s) => s.id)).toEqual(["past", "archived"]);
  });
});
