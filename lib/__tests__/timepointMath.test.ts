import { describe, expect, it } from "vitest";
import {
  fromTotalMinutes,
  toTotalMinutes,
  computeAuthorOffsetMinutes,
  computeDisplayOffsetMinutes,
  computeOffsetFromPrevious,
  buildWeekendAvoidanceSuggestion,
  computeShiftToAvoidWeekends,
  dayDeltaFromDates,
  formatWeekendAvoidanceHeadline,
  hasWeekendTimepoints,
  shouldOfferWeekendAvoidance,
  MINUTES_IN_DAY,
} from "@/lib/timepointMath";
import type { Series } from "@/lib/types";

describe("timepoint math", () => {
  it("converts offsets to/from total minutes", () => {
    const total = toTotalMinutes({ days: 2, hours: 3, minutes: 15 });
    expect(total).toBe(3075);
    expect(fromTotalMinutes(total)).toEqual({ days: 2, hours: 3, minutes: 15 });
  });

  it("computes display offset from the series toggle, not the authored reference", () => {
    const series: Series = {
      id: "s1",
      name: "Series",
      color: "#000000",
      anchorAt: new Date("2026-05-01T08:00:00.000Z").toISOString(),
      timepoints: [
        { id: "t1", name: "Anchor", description: "", offsetFromStartMinutes: 0 },
        { id: "t2", name: "TP2", description: "", offsetFromStartMinutes: 120 },
        {
          id: "t3",
          name: "TP3",
          description: "",
          offsetFromStartMinutes: 360,
          relativeToTimepointId: "t1",
        },
      ],
    };
    expect(computeDisplayOffsetMinutes(series, 2, "from-previous")).toBe(240);
    expect(computeAuthorOffsetMinutes(series, 2, "from-previous")).toBe(360);
  });

  it("computes previous-gap offset correctly", () => {
    const series: Series = {
      id: "s1",
      name: "Series",
      color: "#000000",
      anchorAt: new Date("2026-05-01T08:00:00.000Z").toISOString(),
      timepoints: [
        { id: "t1", name: "Anchor", description: "", offsetFromStartMinutes: 0 },
        { id: "t2", name: "TP2", description: "", offsetFromStartMinutes: 120 },
        { id: "t3", name: "TP3", description: "", offsetFromStartMinutes: 360 },
      ],
    };
    expect(computeOffsetFromPrevious(series, 2)).toBe(240);
  });

  it("calculates day delta from two dates", () => {
    const oldDate = new Date("2026-05-01T08:00:00.000Z");
    const newDate = new Date("2026-05-03T20:00:00.000Z");
    expect(dayDeltaFromDates(oldDate, newDate)).toBe(2);
  });

  it("detects weekend timepoints and computes forward shift to weekdays", () => {
    const series: Series = {
      id: "s1",
      name: "Series",
      color: "#000000",
      anchorAt: new Date("2026-05-02T10:00:00").toISOString(),
      timepoints: [
        { id: "t1", name: "Anchor", description: "", offsetFromStartMinutes: 0 },
        { id: "t2", name: "TP2", description: "", offsetFromStartMinutes: MINUTES_IN_DAY },
      ],
    };
    expect(hasWeekendTimepoints(series)).toBe(true);
    expect(computeShiftToAvoidWeekends(series)).toBe(2);
  });

  it("returns zero shift when all timepoints are on weekdays", () => {
    const series: Series = {
      id: "s1",
      name: "Series",
      color: "#000000",
      anchorAt: new Date("2026-05-01T10:00:00").toISOString(),
      timepoints: [{ id: "t1", name: "Anchor", description: "", offsetFromStartMinutes: 0 }],
    };
    expect(hasWeekendTimepoints(series)).toBe(false);
    expect(computeShiftToAvoidWeekends(series)).toBe(0);
  });

  it("does not offer weekend avoidance until a third timepoint exists", () => {
    const anchorOnlyWeekend: Series = {
      id: "s1",
      name: "Series",
      color: "#000000",
      anchorAt: new Date("2026-05-02T10:00:00").toISOString(),
      timepoints: [{ id: "t1", name: "Anchor", description: "", offsetFromStartMinutes: 0 }],
    };
    expect(hasWeekendTimepoints(anchorOnlyWeekend)).toBe(true);
    expect(shouldOfferWeekendAvoidance(anchorOnlyWeekend)).toBe(false);

    const twoTimepointsWeekend: Series = {
      ...anchorOnlyWeekend,
      timepoints: [
        { id: "t1", name: "Anchor", description: "", offsetFromStartMinutes: 0 },
        { id: "t2", name: "TP2", description: "", offsetFromStartMinutes: MINUTES_IN_DAY },
      ],
    };
    expect(shouldOfferWeekendAvoidance(twoTimepointsWeekend)).toBe(false);

    const threeTimepointsWeekend: Series = {
      ...twoTimepointsWeekend,
      timepoints: [
        ...twoTimepointsWeekend.timepoints,
        { id: "t3", name: "TP3", description: "", offsetFromStartMinutes: MINUTES_IN_DAY * 2 },
      ],
    };
    expect(shouldOfferWeekendAvoidance(threeTimepointsWeekend)).toBe(true);
  });

  it("builds a weekend avoidance suggestion with anchor shift details", () => {
    const series: Series = {
      id: "s1",
      name: "Series",
      color: "#000000",
      anchorAt: new Date("2026-05-02T10:00:00").toISOString(),
      timepoints: [
        { id: "t1", name: "Day 0", description: "", offsetFromStartMinutes: 0 },
        { id: "t2", name: "Day 1", description: "", offsetFromStartMinutes: MINUTES_IN_DAY },
      ],
    };
    const suggestion = buildWeekendAvoidanceSuggestion(series);
    expect(suggestion?.deltaDays).toBe(2);
    expect(suggestion?.affectedTimepoints).toHaveLength(2);
    expect(formatWeekendAvoidanceHeadline(suggestion!.suggestedAnchor)).toMatch(
      /^Starting on Monday, May 4 avoids weekends$/,
    );
  });
});
