export type ConnectionPhase = "not_connected" | "oauth_connected" | "calendar_ready";

export type CalendarSyncStatus = "idle" | "syncing" | "error" | "needs_reauth";

export type CalendarConnectionRow = {
  user_id: string;
  provider: string;
  calendar_id: string | null;
  refresh_token_encrypted: string;
  token_expires_at: string | null;
  connected_at: string;
  sync_status: CalendarSyncStatus;
  last_sync_error: string | null;
};

export type CalendarEventMappingRow = {
  id: string;
  user_id: string;
  series_id: string;
  timepoint_id: string;
  external_event_id: string;
  content_hash: string;
  last_synced_at: string;
};

export type CalendarSeriesSyncRow = {
  user_id: string;
  series_id: string;
  last_published_hash: string;
  last_published_at: string;
};

export type CalendarPushQueueRow = {
  id: string;
  user_id: string;
  series_id: string;
  queued_at: string;
  attempts: number;
  last_error: string | null;
};

export function deriveConnectionPhase(connection: CalendarConnectionRow | null): ConnectionPhase {
  if (!connection) {
    return "not_connected";
  }

  if (!connection.calendar_id) {
    return "oauth_connected";
  }

  return "calendar_ready";
}
