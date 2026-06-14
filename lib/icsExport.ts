import { strToU8, zipSync } from "fflate";
import { createEvents } from "ics";
import { v4 as uuid } from "uuid";
import type { Series } from "@/lib/types";
import { computeOffsetFromPrevious, fromTotalMinutes, resolveSeriesDates } from "@/lib/timepointMath";

export const ICS_EXPORT_ZIP_NAME = "calendar-export.zip";

const BLOB_REVOKE_DELAY_MS = 2_000;

type IcsExportPayload = {
  blob: Blob;
  fileName: string;
};

function toIcsDate(date: Date): [number, number, number, number, number] {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()];
}

function slugifyIcsBaseName(name: string, fallback: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function buildIcs(seriesList: Series[], durationMinutes: number): string {
  const events = seriesList.flatMap((series) =>
    resolveSeriesDates(series).map((timepoint, index) => {
      const previousOffset = fromTotalMinutes(computeOffsetFromPrevious(series, index));
      const start = timepoint.resolvedAt;
      const eventDurationMinutes = timepoint.durationMinutes ?? durationMinutes;
      const end = new Date(start.getTime() + eventDurationMinutes * 60 * 1000);

      return {
        uid: uuid(),
        title: `${series.name} - ${timepoint.name}`,
        start: toIcsDate(start),
        end: toIcsDate(end),
        description: [
          index === 0
            ? "Day 0 anchor"
            : `+${previousOffset.days}d ${previousOffset.hours}h ${previousOffset.minutes}m from previous`,
          timepoint.description.trim(),
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }),
  );

  const { error, value } = createEvents(events);
  if (error || !value) {
    throw new Error(error?.message ?? "Failed to generate ICS file");
  }
  return value;
}

function buildSeriesIcsExports(
  seriesList: Series[],
  durationMinutes: number,
  fallbackBaseName = "timepoint-series",
): Array<{ fileName: string; content: string }> {
  const exportableSeries = seriesList.filter((series) => series.timepoints.length > 0);
  const usedBaseNames = new Map<string, number>();

  return exportableSeries.map((series) => {
    const baseName = slugifyIcsBaseName(series.name, fallbackBaseName);
    const seenCount = usedBaseNames.get(baseName) ?? 0;
    usedBaseNames.set(baseName, seenCount + 1);
    const uniqueBaseName = seenCount === 0 ? baseName : `${baseName}-${seenCount + 1}`;

    return {
      fileName: `${uniqueBaseName}.ics`,
      content: buildIcs([series], durationMinutes),
    };
  });
}

function buildIcsZip(exports: Array<{ fileName: string; content: string }>): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const { fileName, content } of exports) {
    entries[fileName] = strToU8(content);
  }
  return zipSync(entries);
}

function buildIcsExportPayload(
  seriesList: Series[],
  durationMinutes: number,
  fallbackBaseName = "timepoint-series",
): IcsExportPayload | null {
  const exports = buildSeriesIcsExports(seriesList, durationMinutes, fallbackBaseName);
  if (exports.length === 0) {
    return null;
  }

  if (exports.length === 1) {
    return {
      fileName: exports[0].fileName,
      blob: new Blob([exports[0].content], { type: "text/calendar;charset=utf-8" }),
    };
  }

  const zip = buildIcsZip(exports);
  return {
    fileName: ICS_EXPORT_ZIP_NAME,
    blob: new Blob([zip.slice()], { type: "application/zip" }),
  };
}

function isSaveCancelled(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

function extensionForFileName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1 ? "" : fileName.slice(dotIndex);
}

async function saveBlobWithSystemDialog(blob: Blob, fileName: string): Promise<boolean> {
  const saveWindow = window as SaveFilePickerWindow;
  if (typeof saveWindow.showSaveFilePicker === "function") {
    try {
      const extension = extensionForFileName(fileName);
      const handle = await saveWindow.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: extension === ".zip" ? "ZIP archive" : "Calendar file",
            accept: {
              [blob.type || "application/octet-stream"]: extension ? [extension] : [],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (error) {
      if (isSaveCancelled(error)) {
        return false;
      }
      throw error;
    }
  }

  triggerBlobDownload(blob, fileName);
  return true;
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, BLOB_REVOKE_DELAY_MS);
}

export async function exportAllSeriesAsIcs(
  seriesList: Series[],
  durationMinutes: number,
  fallbackBaseName = "timepoint-series",
): Promise<boolean> {
  const payload = buildIcsExportPayload(seriesList, durationMinutes, fallbackBaseName);
  if (!payload) {
    return false;
  }

  return saveBlobWithSystemDialog(payload.blob, payload.fileName);
}
