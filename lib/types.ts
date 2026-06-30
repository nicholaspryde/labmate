export type OffsetMode = "from-start" | "from-previous" | "custom";

export type Offset = {
  days: number;
  hours: number;
  minutes: number;
};

export type Timepoint = {
  id: string;
  name: string;
  description: string;
  offsetFromStartMinutes: number;
  relativeToTimepointId?: string;
  hasScheduledTime?: boolean;
  durationMinutes?: number;
};

export type Series = {
  id: string;
  name: string;
  color: string;
  anchorAt: string;
  timepoints: Timepoint[];
  /** When true, the series is forced into History regardless of its event dates. */
  archived?: boolean;
};

export type AppState = {
  series: Series[];
  activeSeriesId: string | null;
  offsetMode: OffsetMode;
};

export const DEFAULT_ANCHOR_NAME = "Anchor";

const EVENT_ORDINALS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
  "thirteenth",
  "fourteenth",
  "fifteenth",
  "sixteenth",
  "seventeenth",
  "eighteenth",
  "nineteenth",
  "twentieth",
] as const;

/** Default label for an unnamed event at `index` (0 = first event). */
export function defaultEventLabel(index: number): string {
  if (index >= 0 && index < EVENT_ORDINALS.length) {
    return `${EVENT_ORDINALS[index]} event`;
  }

  const position = index + 1;
  const suffix =
    position % 10 === 1 && position % 100 !== 11
      ? "st"
      : position % 10 === 2 && position % 100 !== 12
        ? "nd"
        : position % 10 === 3 && position % 100 !== 13
          ? "rd"
          : "th";
  return `${position}${suffix} event`;
}

/** Sentinel stored in `relativeToTimepointId` to mean "always relative to the immediately previous timepoint". */
export const RELATIVE_TO_PREVIOUS = "__previous__";
