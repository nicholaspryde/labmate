import { strToU8, zipSync } from "fflate";
import { createEvents } from "ics";
import type { Series } from "@/lib/types";
import {
  buildSeriesEvents,
  buildStableIcsUid,
  DEFAULT_EVENT_DURATION_MINUTES,
} from "@/lib/calendarEvents";

export const ICS_EXPORT_ZIP_NAME = "calendar-export.zip";

const BLOB_REVOKE_DELAY_MS = 2_000;
const SAVE_DIALOG_OPEN_WAIT_MS = 300;
const SAVE_DIALOG_FOCUS_WAIT_MS = 100;
const SAVE_DIALOG_DISMISS_TIMEOUT_MS = 120_000;

type IcsExportFile = {
  fileName: string;
  data: Uint8Array;
  contentType: string;
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
    buildSeriesEvents(series, { defaultDurationMinutes: durationMinutes }).map((event) => ({
      uid: buildStableIcsUid(event.seriesId, event.timepointId),
      title: event.title,
      start: toIcsDate(event.start),
      end: toIcsDate(event.end),
      description: event.description,
    })),
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

function buildIcsExportFile(
  seriesList: Series[],
  durationMinutes: number = DEFAULT_EVENT_DURATION_MINUTES,
  fallbackBaseName = "timepoint-series",
): IcsExportFile | null {
  const exports = buildSeriesIcsExports(seriesList, durationMinutes, fallbackBaseName);
  if (exports.length === 0) {
    return null;
  }

  if (exports.length === 1) {
    return {
      fileName: exports[0].fileName,
      data: strToU8(exports[0].content),
      contentType: "text/calendar;charset=utf-8",
    };
  }

  return {
    fileName: ICS_EXPORT_ZIP_NAME,
    data: buildIcsZip(exports),
    contentType: "application/zip",
  };
}

async function waitForDownloadToSettle(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, SAVE_DIALOG_OPEN_WAIT_MS);
  });

  if (document.hasFocus()) {
    return;
  }

  await waitForSaveDialogDismissal();
}

function waitForSaveDialogDismissal(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.setTimeout(resolve, SAVE_DIALOG_FOCUS_WAIT_MS);
    };

    const onFocus = () => {
      if (document.hasFocus()) {
        finish();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && document.hasFocus()) {
        finish();
      }
    };

    const timeoutId = window.setTimeout(finish, SAVE_DIALOG_DISMISS_TIMEOUT_MS);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
  });
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
  durationMinutes: number = DEFAULT_EVENT_DURATION_MINUTES,
  fallbackBaseName = "timepoint-series",
): Promise<boolean> {
  const payload = buildIcsExportFile(seriesList, durationMinutes, fallbackBaseName);
  if (!payload) {
    return false;
  }

  const blob = new Blob([payload.data.slice()], { type: payload.contentType });
  triggerBlobDownload(blob, payload.fileName);
  await waitForDownloadToSettle();

  return true;
}

export { DEFAULT_EVENT_DURATION_MINUTES };
