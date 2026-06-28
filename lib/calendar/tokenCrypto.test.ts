import { afterEach, describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "@/lib/calendar/tokenCrypto";

const ORIGINAL_KEY = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;

describe("tokenCrypto", () => {
  afterEach(() => {
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = ORIGINAL_KEY;
  });

  it("round-trips refresh tokens", () => {
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    const encrypted = encryptToken("refresh-token-value");
    expect(decryptToken(encrypted)).toBe("refresh-token-value");
  });
});
