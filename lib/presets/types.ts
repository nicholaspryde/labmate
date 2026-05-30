import type { OffsetMode } from "@/lib/types";

export const PRESET_SCHEMA_VERSION = 1;

export type PresetRelativeRef = "first" | "previous" | `index:${number}`;

export type PresetTimepoint = {
  name: string;
  description: string;
  offsetFromStartMinutes: number;
  hasScheduledTime?: boolean;
  durationMinutes?: number;
  /** Only meaningful when offsetMode is "custom". Omitted when default for mode. */
  relativeRef?: PresetRelativeRef;
};

export type ProtocolPreset = {
  version: typeof PRESET_SCHEMA_VERSION;
  name: string;
  offsetMode: OffsetMode;
  timepoints: PresetTimepoint[];
  createdAt: string;
};

export type SavedPreset = ProtocolPreset & {
  id: string;
};
