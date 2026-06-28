import { google } from "googleapis";
import { decryptToken } from "@/lib/calendar/tokenCrypto";
import { createOAuthClient } from "@/lib/calendar/google/oauth";

export async function createGoogleCalendarClient(refreshTokenEncrypted: string) {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: decryptToken(refreshTokenEncrypted) });
  return google.calendar({ version: "v3", auth: client });
}
