import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGoogleEventDescription,
  buildGoogleEventFooter,
  buildSeriesEditUrl,
  GOOGLE_EVENT_FOOTER_SEPARATOR,
  sanitizeAuthNextPath,
} from "@/lib/seriesLinks";

describe("seriesLinks", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://labmate.app");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds series edit URLs with optional timepoint", () => {
    expect(buildSeriesEditUrl("series-abc")).toBe("https://labmate.app/series/series-abc");
    expect(buildSeriesEditUrl("series-abc", "tp-1")).toBe(
      "https://labmate.app/series/series-abc?timepoint=tp-1",
    );
  });

  it("builds Google event footer with separator and deep link", () => {
    const footer = buildGoogleEventFooter("series-abc", "tp-1");
    expect(footer).toContain(GOOGLE_EVENT_FOOTER_SEPARATOR);
    expect(footer).toContain("Managed by Labmate · Edit at");
    expect(footer).toContain("https://labmate.app/series/series-abc?timepoint=tp-1");
  });

  it("appends footer to event descriptions", () => {
    const description = buildGoogleEventDescription("Day 0 anchor\nStart cells", "series-abc", "tp-1");
    expect(description).toContain("Day 0 anchor");
    expect(description).toContain(GOOGLE_EVENT_FOOTER_SEPARATOR);
    expect(description).toContain("https://labmate.app/series/series-abc?timepoint=tp-1");
  });

  it("uses footer alone when description is empty", () => {
    const description = buildGoogleEventDescription("  ", "series-abc", "tp-1");
    expect(description).toBe(buildGoogleEventFooter("series-abc", "tp-1"));
  });

  it("sanitizes auth next paths", () => {
    expect(sanitizeAuthNextPath("/series/abc?timepoint=tp-1")).toBe("/series/abc?timepoint=tp-1");
    expect(sanitizeAuthNextPath("//evil.com")).toBe("/");
    expect(sanitizeAuthNextPath(null)).toBe("/");
  });
});
