import type { Series } from "@/lib/types";
import { validateSeries } from "@/lib/workspace/validate";

export function parsePushRequestBody(
  body: unknown,
): { seriesId: string; series: Series } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Invalid request body." };
  }

  const seriesId =
    "seriesId" in body && typeof body.seriesId === "string" ? body.seriesId.trim() : "";
  if (!seriesId) {
    return { error: "seriesId is required." };
  }

  if (!("series" in body)) {
    return { error: "series is required." };
  }

  const series = validateSeries(body.series);
  if (!series) {
    return { error: "Invalid series payload." };
  }

  if (series.id !== seriesId) {
    return { error: "series.id must match seriesId." };
  }

  return { seriesId, series };
}
