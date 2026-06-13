import { describe, expect, it } from "vitest";
import {
  fromTotalMinutes,
  toTotalMinutes,
  computeAuthorOffsetMinutes,
  computeDisplayOffsetMinutes,
  computeOffsetFromPrevious,
  buildWeekendAvoidanceSuggestion,
  computeShiftToAvoidWeekends,
  computeWeekendOptimization,
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
    expect(suggestion?.isFullyClear).toBe(true);
    expect(suggestion?.affectedTimepoints).toHaveLength(0);
    expect(formatWeekendAvoidanceHeadline(suggestion!.suggestedAnchor)).toMatch(
      /^Starting on Monday, May 4 avoids weekends$/,
    );
  });

  it("minimizes weekend days when full avoidance is impossible", () => {
    const series: Series = {
      id: "s1",
      name: "Series",
      color: "#000000",
      anchorAt: new Date("2026-05-06T10:00:00").toISOString(),
      timepoints: Array.from({ length: 6 }, (_, index) => ({
        id: `t${index + 1}`,
        name: `Day ${index}`,
        description: "",
        offsetFromStartMinutes: index * MINUTES_IN_DAY,
      })),
    };

    const optimization = computeWeekendOptimization(series);
    expect(optimization.isFullyClear).toBe(false);
    expect(optimization.deltaDays).toBe(-2);
    expect(optimization.weekendCount).toBe(1);

    const suggestion = buildWeekendAvoidanceSuggestion(series);
    expect(suggestion?.deltaDays).toBe(-2);
    expect(suggestion?.isFullyClear).toBe(false);
    expect(suggestion?.remainingWeekendCount).toBe(1);
    expect(suggestion?.affectedTimepoints).toHaveLength(1);
    expect(formatWeekendAvoidanceHeadline(suggestion!.suggestedAnchor, 1)).toMatch(
      /^Starting on Monday, May 4 minimizes weekends \(1 day remains\)$/,
    );
  });

  it("returns null when the schedule already uses the fewest weekend days", () => {
    const series: Series = {
      id: "s1",
      name: "Series",
      color: "#000000",
      anchorAt: new Date("2026-05-04T10:00:00").toISOString(),
      timepoints: Array.from({ length: 6 }, (_, index) => ({
        id: `t${index + 1}`,
        name: `Day ${index}`,
        description: "",
        offsetFromStartMinutes: index * MINUTES_IN_DAY,
      })),
    };

    const optimization = computeWeekendOptimization(series);
    expect(optimization.isFullyClear).toBe(false);
    expect(optimization.deltaDays).toBe(0);
    expect(optimization.weekendCount).toBe(1);

    expect(buildWeekendAvoidanceSuggestion(series)).toBeNull();
  });

  it("prefers the current position when multiple shifts tie on weekend count", () => {
    const series: Series = {
      id: "s1",
      name: "Series",
      color: "#000000",
      anchorAt: new Date("2026-05-04T10:00:00").toISOString(),
      timepoints: Array.from({ length: 6 }, (_, index) => ({
        id: `t${index + 1}`,
        name: `Day ${index}`,
        description: "",
        offsetFromStartMinutes: index * MINUTES_IN_DAY,
      })),
    };

    expect(computeWeekendOptimization(series).deltaDays).toBe(0);
  });
});
