import { v4 as uuid } from "uuid";
import { validatePreset } from "@/lib/presets/serialize";
import type { ProtocolPreset, SavedPreset } from "@/lib/presets/types";

const STORAGE_KEY = "labmate:protocol-presets";
const MAX_SAVED_PRESETS = 20;

function readRaw(): SavedPreset[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        try {
          const preset = validatePreset(item);
          return {
            ...preset,
            id: typeof (item as SavedPreset).id === "string" ? (item as SavedPreset).id : uuid(),
          };
        } catch {
          return null;
        }
      })
      .filter((item): item is SavedPreset => item !== null);
  } catch {
    return [];
  }
}

function writeRaw(presets: SavedPreset[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function listSavedPresets(): SavedPreset[] {
  return readRaw();
}

export function savePreset(preset: ProtocolPreset): SavedPreset {
  const saved: SavedPreset = {
    ...preset,
    id: uuid(),
    createdAt: preset.createdAt || new Date().toISOString(),
  };

  const existing = readRaw();
  const next = [saved, ...existing].slice(0, MAX_SAVED_PRESETS);
  writeRaw(next);
  return saved;
}

export function deleteSavedPreset(presetId: string): void {
  writeRaw(readRaw().filter((preset) => preset.id !== presetId));
}

export function renameSavedPreset(presetId: string, name: string): SavedPreset | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return null;
  }

  let updated: SavedPreset | null = null;
  const next = readRaw().map((preset) => {
    if (preset.id !== presetId) {
      return preset;
    }
    updated = { ...preset, name: trimmed };
    return updated;
  });

  if (!updated) {
    return null;
  }

  writeRaw(next);
  return updated;
}

export function upsertImportedPreset(preset: ProtocolPreset): SavedPreset {
  const saved: SavedPreset = {
    ...preset,
    id: uuid(),
    createdAt: preset.createdAt || new Date().toISOString(),
  };

  const existing = readRaw();
  const next = [saved, ...existing].slice(0, MAX_SAVED_PRESETS);
  writeRaw(next);
  return saved;
}
