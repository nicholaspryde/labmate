import { afterEach, describe, expect, it } from "vitest";
import { createOAuthState, verifyOAuthState } from "@/lib/calendar/google/oauth";
import { sanitizeReturnTo } from "@/lib/calendar/returnTo";

const ORIGINAL_KEY = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
const TEST_USER_ID = "11111111-1111-1111-1111-111111111111";

describe("sanitizeReturnTo", () => {
  it("accepts same-origin paths", () => {
    expect(sanitizeReturnTo("/series/abc")).toBe("/series/abc");
    expect(sanitizeReturnTo("/series/abc?timepoint=tp-1")).toBe("/series/abc?timepoint=tp-1");
    expect(sanitizeReturnTo("/series/foo.bar")).toBe("/series/foo.bar");
  });

  it("rejects external and protocol-relative targets", () => {
    expect(sanitizeReturnTo("//evil.com")).toBe("/");
    expect(sanitizeReturnTo("https://evil.com")).toBe("/");
    expect(sanitizeReturnTo("javascript:alert(1)")).toBe("/");
    expect(sanitizeReturnTo(null)).toBe("/");
  });
});

describe("OAuth state", () => {
  afterEach(() => {
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = ORIGINAL_KEY;
  });

  it("round-trips returnTo paths with dots and query strings", () => {
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
    const returnTo = "/series/abc.def?timepoint=tp-1";
    const state = createOAuthState(TEST_USER_ID, returnTo);
    expect(verifyOAuthState(state)).toEqual({ userId: TEST_USER_ID, returnTo });
  });
});
