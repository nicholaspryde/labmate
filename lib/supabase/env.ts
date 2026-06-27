/** Supabase project URL from env (no path suffix — not /rest/v1). */
export function getSupabaseUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) {
    return undefined;
  }

  // Common misconfiguration: pasting the REST API URL instead of the project URL.
  return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

/**
 * Publishable (sb_publishable_…) or legacy anon key.
 * Supabase dashboard may label this as either name.
 */
export function getSupabaseAnonKey(): string | undefined {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return key || undefined;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
