import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { getSupabaseServiceRoleKey } from "@/lib/calendar/env";
import type {
  CalendarConnectionRow,
  CalendarEventMappingRow,
  CalendarPushQueueRow,
  CalendarSeriesSyncRow,
} from "@/lib/calendar/types";

export function createServiceSupabaseClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();

  if (!url || !key) {
    throw new Error("Supabase service role is not configured.");
  }

  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function getCalendarConnection(userId: string): Promise<CalendarConnectionRow | null> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as CalendarConnectionRow | null) ?? null;
}

export async function upsertCalendarConnection(
  userId: string,
  values: {
    refresh_token_encrypted: string;
    token_expires_at?: string | null;
    sync_status?: string;
    last_sync_error?: string | null;
  },
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("calendar_connections").upsert(
    {
      user_id: userId,
      provider: "google",
      refresh_token_encrypted: values.refresh_token_encrypted,
      token_expires_at: values.token_expires_at ?? null,
      connected_at: new Date().toISOString(),
      sync_status: values.sync_status ?? "idle",
      last_sync_error: values.last_sync_error ?? null,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }
}

export async function setCalendarId(userId: string, calendarId: string): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase
    .from("calendar_connections")
    .update({ calendar_id: calendarId, sync_status: "idle", last_sync_error: null })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function updateConnectionSyncStatus(
  userId: string,
  syncStatus: string,
  lastSyncError: string | null = null,
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase
    .from("calendar_connections")
    .update({ sync_status: syncStatus, last_sync_error: lastSyncError })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function deleteCalendarConnection(userId: string): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { error: mappingError } = await supabase
    .from("calendar_event_mappings")
    .delete()
    .eq("user_id", userId);
  if (mappingError) {
    throw mappingError;
  }

  const { error: seriesError } = await supabase.from("calendar_series_sync").delete().eq("user_id", userId);
  if (seriesError) {
    throw seriesError;
  }

  const { error: queueError } = await supabase.from("calendar_push_queue").delete().eq("user_id", userId);
  if (queueError) {
    throw queueError;
  }

  const { error } = await supabase.from("calendar_connections").delete().eq("user_id", userId);
  if (error) {
    throw error;
  }
}

export async function getEventMappings(userId: string): Promise<CalendarEventMappingRow[]> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("calendar_event_mappings")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return (data as CalendarEventMappingRow[]) ?? [];
}

export async function getSeriesSyncRows(userId: string): Promise<CalendarSeriesSyncRow[]> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("calendar_series_sync").select("*").eq("user_id", userId);

  if (error) {
    throw error;
  }

  return (data as CalendarSeriesSyncRow[]) ?? [];
}

export async function upsertEventMapping(
  userId: string,
  mapping: {
    series_id: string;
    timepoint_id: string;
    external_event_id: string;
    content_hash: string;
  },
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("calendar_event_mappings").upsert(
    {
      user_id: userId,
      ...mapping,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "user_id,series_id,timepoint_id" },
  );

  if (error) {
    throw error;
  }
}

export async function deleteEventMapping(
  userId: string,
  seriesId: string,
  timepointId: string,
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase
    .from("calendar_event_mappings")
    .delete()
    .eq("user_id", userId)
    .eq("series_id", seriesId)
    .eq("timepoint_id", timepointId);

  if (error) {
    throw error;
  }
}

export async function upsertSeriesSync(
  userId: string,
  seriesId: string,
  lastPublishedHash: string,
): Promise<string> {
  const now = new Date().toISOString();
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("calendar_series_sync").upsert(
    {
      user_id: userId,
      series_id: seriesId,
      last_published_hash: lastPublishedHash,
      last_published_at: now,
    },
    { onConflict: "user_id,series_id" },
  );

  if (error) {
    throw error;
  }

  return now;
}

export async function getPushQueue(userId: string): Promise<CalendarPushQueueRow[]> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("calendar_push_queue")
    .select("*")
    .eq("user_id", userId)
    .order("queued_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as CalendarPushQueueRow[]) ?? [];
}

export async function enqueuePush(userId: string, seriesId: string, lastError?: string | null): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("calendar_push_queue").upsert(
    {
      user_id: userId,
      series_id: seriesId,
      queued_at: new Date().toISOString(),
      attempts: 0,
      last_error: lastError ?? null,
    },
    { onConflict: "user_id,series_id" },
  );

  if (error) {
    throw error;
  }
}

export async function dequeuePush(userId: string, seriesId: string): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase
    .from("calendar_push_queue")
    .delete()
    .eq("user_id", userId)
    .eq("series_id", seriesId);

  if (error) {
    throw error;
  }
}

export async function incrementQueueAttempt(
  userId: string,
  seriesId: string,
  lastError: string,
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("calendar_push_queue")
    .select("attempts")
    .eq("user_id", userId)
    .eq("series_id", seriesId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const attempts = ((data as { attempts: number } | null)?.attempts ?? 0) + 1;
  const { error: updateError } = await supabase
    .from("calendar_push_queue")
    .update({ attempts, last_error: lastError })
    .eq("user_id", userId)
    .eq("series_id", seriesId);

  if (updateError) {
    throw updateError;
  }
}

export async function loadUserWorkspace(userId: string) {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("user_workspaces")
    .select("app_state")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.app_state ?? null;
}

export async function getAuthenticatedUserIdFromRequest(): Promise<string | null> {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    return null;
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}
