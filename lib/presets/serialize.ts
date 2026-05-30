import { v4 as uuid } from "uuid";
import { RELATIVE_TO_PREVIOUS, type OffsetMode, type Series, type Timepoint } from "@/lib/types";
import {
  PRESET_SCHEMA_VERSION,
  type PresetRelativeRef,
  type PresetTimepoint,
  type ProtocolPreset,
} from "@/lib/presets/types";

export class PresetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PresetValidationError";
  }
}

function timepointToRelativeRef(
  series: Series,
  timepoint: Timepoint,
  index: number,
  offsetMode: OffsetMode,
): PresetRelativeRef | undefined {
  if (offsetMode !== "custom" || index === 0) {
    return undefined;
  }

  const refId = timepoint.relativeToTimepointId;
  if (!refId) {
    return "first";
  }
  if (refId === RELATIVE_TO_PREVIOUS) {
    return "previous";
  }

  const refIndex = series.timepoints.findIndex((candidate) => candidate.id === refId);
  if (refIndex < 0) {
    return "first";
  }
  return `index:${refIndex}`;
}

function relativeRefToTimepointId(
  relativeRef: PresetRelativeRef | undefined,
  timepointIds: string[],
  index: number,
): string | undefined {
  if (index === 0 || !relativeRef || relativeRef === "first") {
    return undefined;
  }
  if (relativeRef === "previous") {
    return RELATIVE_TO_PREVIOUS;
  }
  if (relativeRef.startsWith("index:")) {
    const refIndex = Number.parseInt(relativeRef.slice("index:".length), 10);
    if (Number.isNaN(refIndex) || refIndex < 0 || refIndex >= index) {
      return undefined;
    }
    return timepointIds[refIndex];
  }
  return undefined;
}

export function seriesToPreset(
  series: Series,
  offsetMode: OffsetMode,
  presetName: string,
): ProtocolPreset {
  return {
    version: PRESET_SCHEMA_VERSION,
    name: presetName.trim() || series.name.trim() || "Untitled preset",
    offsetMode,
    timepoints: series.timepoints.map((timepoint, index) => {
      const entry: PresetTimepoint = {
        name: timepoint.name,
        description: timepoint.description,
        offsetFromStartMinutes: timepoint.offsetFromStartMinutes,
      };

      if (timepoint.hasScheduledTime === true) {
        entry.hasScheduledTime = true;
      }
      if (timepoint.durationMinutes !== undefined) {
        entry.durationMinutes = timepoint.durationMinutes;
      }

      const relativeRef = timepointToRelativeRef(series, timepoint, index, offsetMode);
      if (relativeRef !== undefined && relativeRef !== "first") {
        entry.relativeRef = relativeRef;
      } else if (offsetMode === "custom" && index > 0 && relativeRef === "first") {
        entry.relativeRef = "first";
      }

      return entry;
    }),
    createdAt: new Date().toISOString(),
  };
}

export function presetToTimepoints(preset: ProtocolPreset): Timepoint[] {
  const timepointIds = preset.timepoints.map(() => uuid());

  return preset.timepoints.map((entry, index) => {
    const timepoint: Timepoint = {
      id: timepointIds[index],
      name: entry.name,
      description: entry.description,
      offsetFromStartMinutes: Math.max(0, Math.floor(entry.offsetFromStartMinutes)),
      hasScheduledTime: entry.hasScheduledTime ?? false,
      durationMinutes: entry.durationMinutes ?? 60,
    };

    if (preset.offsetMode === "custom" && index > 0) {
      const relativeToTimepointId = relativeRefToTimepointId(entry.relativeRef, timepointIds, index);
      if (relativeToTimepointId) {
        timepoint.relativeToTimepointId = relativeToTimepointId;
      }
    }

    return timepoint;
  });
}

export function validatePreset(value: unknown): ProtocolPreset {
  if (!value || typeof value !== "object") {
    throw new PresetValidationError("Preset must be a JSON object.");
  }

  const record = value as Record<string, unknown>;

  if (record.version !== PRESET_SCHEMA_VERSION) {
    throw new PresetValidationError(`Unsupported preset version: ${String(record.version)}`);
  }

  if (typeof record.name !== "string" || !record.name.trim()) {
    throw new PresetValidationError("Preset name is required.");
  }

  const offsetMode = record.offsetMode;
  if (offsetMode !== "from-start" && offsetMode !== "from-previous" && offsetMode !== "custom") {
    throw new PresetValidationError("Preset offsetMode is invalid.");
  }

  if (!Array.isArray(record.timepoints) || record.timepoints.length === 0) {
    throw new PresetValidationError("Preset must include at least one timepoint.");
  }

  const timepoints: PresetTimepoint[] = record.timepoints.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new PresetValidationError(`Timepoint ${index + 1} is invalid.`);
    }

    const tp = item as Record<string, unknown>;

    if (typeof tp.name !== "string") {
      throw new PresetValidationError(`Timepoint ${index + 1} name must be a string.`);
    }
    if (typeof tp.description !== "string") {
      throw new PresetValidationError(`Timepoint ${index + 1} description must be a string.`);
    }
    if (typeof tp.offsetFromStartMinutes !== "number" || tp.offsetFromStartMinutes < 0) {
      throw new PresetValidationError(`Timepoint ${index + 1} offset must be a non-negative number.`);
    }

    const entry: PresetTimepoint = {
      name: tp.name,
      description: tp.description,
      offsetFromStartMinutes: Math.floor(tp.offsetFromStartMinutes),
    };

    if (tp.hasScheduledTime === true) {
      entry.hasScheduledTime = true;
    }
    if (typeof tp.durationMinutes === "number" && tp.durationMinutes >= 1) {
      entry.durationMinutes = Math.floor(tp.durationMinutes);
    }
    if (tp.relativeRef !== undefined) {
      if (
        tp.relativeRef !== "first" &&
        tp.relativeRef !== "previous" &&
        !(typeof tp.relativeRef === "string" && tp.relativeRef.startsWith("index:"))
      ) {
        throw new PresetValidationError(`Timepoint ${index + 1} relativeRef is invalid.`);
      }
      entry.relativeRef = tp.relativeRef as PresetRelativeRef;
    }

    return entry;
  });

  if (timepoints[0].offsetFromStartMinutes !== 0) {
    throw new PresetValidationError("First timepoint must start at offset 0.");
  }

  return {
    version: PRESET_SCHEMA_VERSION,
    name: record.name.trim(),
    offsetMode,
    timepoints,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
  };
}

export function parsePresetJson(raw: string): ProtocolPreset {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new PresetValidationError("Invalid JSON file.");
  }
  return validatePreset(parsed);
}
