const PRODUCTION_APP_URL = "https://labmate.app";
export const GOOGLE_EVENT_FOOTER_SEPARATOR = "─────────────────────────";

export function getAppBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  return PRODUCTION_APP_URL;
}

export function buildSeriesEditUrl(seriesId: string, timepointId?: string): string {
  const base = getAppBaseUrl();
  const path = `/series/${encodeURIComponent(seriesId)}`;

  if (timepointId) {
    return `${base}${path}?timepoint=${encodeURIComponent(timepointId)}`;
  }

  return `${base}${path}`;
}

export function buildGoogleEventFooter(seriesId: string, timepointId: string): string {
  const url = buildSeriesEditUrl(seriesId, timepointId);
  return `${GOOGLE_EVENT_FOOTER_SEPARATOR}\nManaged by Labmate · Edit at ${url}`;
}

export function buildGoogleEventDescription(
  description: string,
  seriesId: string,
  timepointId: string,
): string {
  const footer = buildGoogleEventFooter(seriesId, timepointId);

  if (!description.trim()) {
    return footer;
  }

  return `${description.trim()}\n\n${footer}`;
}

/** Allow only same-origin relative paths for post-login redirects. */
export function sanitizeAuthNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}
