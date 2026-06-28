import { createHmac, randomBytes } from "crypto";
import { google } from "googleapis";
import {
  getGoogleCalendarClientId,
  getGoogleCalendarClientSecret,
  getGoogleCalendarRedirectUri,
  GOOGLE_CALENDAR_SCOPE,
} from "@/lib/calendar/env";

const STATE_TTL_MS = 10 * 60 * 1000;

function getStateSecret(): string {
  const secret = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY is not configured.");
  }
  return secret;
}

export function createOAuthState(userId: string, returnTo?: string): string {
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = Date.now().toString();
  const payload = `${userId}.${issuedAt}.${nonce}.${returnTo ?? "/"}`;
  const signature = createHmac("sha256", getStateSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifyOAuthState(state: string): { userId: string; returnTo: string } {
  const decoded = Buffer.from(state, "base64url").toString("utf8");
  const parts = decoded.split(".");
  if (parts.length < 5) {
    throw new Error("Invalid OAuth state.");
  }

  const signature = parts.pop();
  const payload = parts.join(".");
  const expected = createHmac("sha256", getStateSecret()).update(payload).digest("hex");
  if (signature !== expected) {
    throw new Error("Invalid OAuth state signature.");
  }

  const [userId, issuedAt, , returnTo] = payload.split(".");
  if (!userId || !issuedAt) {
    throw new Error("Invalid OAuth state payload.");
  }

  if (Date.now() - Number(issuedAt) > STATE_TTL_MS) {
    throw new Error("OAuth state expired.");
  }

  return { userId, returnTo: returnTo || "/" };
}

export function createOAuthClient(origin?: string) {
  const clientId = getGoogleCalendarClientId();
  const clientSecret = getGoogleCalendarClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar OAuth is not configured.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, getGoogleCalendarRedirectUri(origin));
}

export function getAuthorizationUrl(userId: string, origin?: string, returnTo?: string): string {
  const client = createOAuthClient(origin);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GOOGLE_CALENDAR_SCOPE],
    state: createOAuthState(userId, returnTo),
  });
}

export async function exchangeCodeForTokens(code: string, origin?: string) {
  const client = createOAuthClient(origin);
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token. Try disconnecting and reconnecting.");
  }

  return {
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
  };
}
