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
};

export type AppState = {
  series: Series[];
  activeSeriesId: string | null;
  offsetMode: OffsetMode;
};

export const DEFAULT_ANCHOR_NAME = "Anchor";

/** Sentinel stored in `relativeToTimepointId` to mean "always relative to the immediately previous timepoint". */
export const RELATIVE_TO_PREVIOUS = "__previous__";
