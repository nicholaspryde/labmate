import { describe, expect, it } from "vitest";
import {
  fromTotalMinutes,
  toTotalMinutes,
  computeOffsetFromPrevious,
  dayDeltaFromDates,
} from "@/lib/timepointMath";
import type { Series } from "@/lib/types";

describe("timepoint math", () => {
  it("converts offsets to/from total minutes", () => {
    const total = toTotalMinutes({ days: 2, hours: 3, minutes: 15 });
    expect(total).toBe(3075);
    expect(fromTotalMinutes(total)).toEqual({ days: 2, hours: 3, minutes: 15 });
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
});
