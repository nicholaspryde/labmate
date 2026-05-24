export type OffsetMode = "from-start" | "from-previous";

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
