import { parsePresetJson } from "@/lib/presets/serialize";
import type { ProtocolPreset } from "@/lib/presets/types";

export function presetToJson(preset: ProtocolPreset): string {
  return JSON.stringify(preset, null, 2);
}

export function triggerPresetDownload(preset: ProtocolPreset, fileName?: string) {
  const slug = (fileName ?? preset.name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const safeName = slug || "protocol-preset";
  const content = presetToJson(preset);
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeName}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function readPresetFromFile(file: File): Promise<ProtocolPreset> {
  const raw = await file.text();
  return parsePresetJson(raw);
}
