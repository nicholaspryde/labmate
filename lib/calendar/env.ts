export function getGoogleCalendarClientId(): string | null {
  return process.env.GOOGLE_CALENDAR_CLIENT_ID ?? null;
}

export function getGoogleCalendarClientSecret(): string | null {
  return process.env.GOOGLE_CALENDAR_CLIENT_SECRET ?? null;
}

export function getGoogleCalendarRedirectUri(origin?: string): string {
  if (process.env.GOOGLE_CALENDAR_REDIRECT_URI) {
    return process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  }

  if (origin) {
    return `${origin}/api/calendar/callback`;
  }

  return "http://localhost:3000/api/calendar/callback";
}

export function getCalendarTokenEncryptionKey(): string | null {
  return process.env.CALENDAR_TOKEN_ENCRYPTION_KEY ?? null;
}

export function getSupabaseServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

export function isCalendarSyncConfigured(): boolean {
  return Boolean(
    getGoogleCalendarClientId() &&
      getGoogleCalendarClientSecret() &&
      getCalendarTokenEncryptionKey() &&
      getSupabaseServiceRoleKey(),
  );
}

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
