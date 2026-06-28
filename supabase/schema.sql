-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Creates tables for per-user workspace state and saved presets, with Row Level Security.

-- Workspace: one row per user, stores the full editor AppState as JSON.
create table if not exists public.user_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  app_state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_workspaces enable row level security;

drop policy if exists "Users read own workspace" on public.user_workspaces;
drop policy if exists "Users insert own workspace" on public.user_workspaces;
drop policy if exists "Users update own workspace" on public.user_workspaces;

create policy "Users read own workspace"
  on public.user_workspaces for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own workspace"
  on public.user_workspaces for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own workspace"
  on public.user_workspaces for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on table public.user_workspaces to authenticated;
grant all on table public.user_workspaces to service_role;

-- Presets: saved protocol templates per user.
create table if not exists public.user_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  preset jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists user_presets_user_id_idx on public.user_presets (user_id, created_at desc);

alter table public.user_presets enable row level security;

drop policy if exists "Users read own presets" on public.user_presets;
drop policy if exists "Users insert own presets" on public.user_presets;
drop policy if exists "Users update own presets" on public.user_presets;
drop policy if exists "Users delete own presets" on public.user_presets;

create policy "Users read own presets"
  on public.user_presets for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own presets"
  on public.user_presets for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own presets"
  on public.user_presets for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own presets"
  on public.user_presets for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on table public.user_presets to authenticated;
grant all on table public.user_presets to service_role;

-- Calendar sync: Google Calendar one-way push
create table if not exists public.calendar_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null default 'google',
  calendar_id text,
  refresh_token_encrypted text not null,
  token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  sync_status text not null default 'idle',
  last_sync_error text
);

alter table public.calendar_connections enable row level security;

drop policy if exists "Users read own calendar connection status" on public.calendar_connections;
drop policy if exists "Users delete own calendar connection" on public.calendar_connections;

create policy "Users read own calendar connection status"
  on public.calendar_connections for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users delete own calendar connection"
  on public.calendar_connections for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, delete on table public.calendar_connections to authenticated;
grant all on table public.calendar_connections to service_role;

create table if not exists public.calendar_event_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  series_id text not null,
  timepoint_id text not null,
  external_event_id text not null,
  content_hash text not null,
  last_synced_at timestamptz not null default now(),
  unique (user_id, series_id, timepoint_id)
);

create index if not exists calendar_event_mappings_user_series_idx
  on public.calendar_event_mappings (user_id, series_id);

alter table public.calendar_event_mappings enable row level security;

drop policy if exists "Users read own calendar event mappings" on public.calendar_event_mappings;

create policy "Users read own calendar event mappings"
  on public.calendar_event_mappings for select
  to authenticated
  using (auth.uid() = user_id);

grant select on table public.calendar_event_mappings to authenticated;
grant all on table public.calendar_event_mappings to service_role;

create table if not exists public.calendar_series_sync (
  user_id uuid not null references auth.users (id) on delete cascade,
  series_id text not null,
  last_published_hash text not null,
  last_published_at timestamptz not null default now(),
  primary key (user_id, series_id)
);

alter table public.calendar_series_sync enable row level security;

drop policy if exists "Users read own calendar series sync" on public.calendar_series_sync;

create policy "Users read own calendar series sync"
  on public.calendar_series_sync for select
  to authenticated
  using (auth.uid() = user_id);

grant select on table public.calendar_series_sync to authenticated;
grant all on table public.calendar_series_sync to service_role;

create table if not exists public.calendar_push_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  series_id text not null,
  queued_at timestamptz not null default now(),
  attempts integer not null default 0,
  last_error text,
  unique (user_id, series_id)
);

alter table public.calendar_push_queue enable row level security;

drop policy if exists "Users read own calendar push queue" on public.calendar_push_queue;
drop policy if exists "Users insert own calendar push queue" on public.calendar_push_queue;
drop policy if exists "Users delete own calendar push queue" on public.calendar_push_queue;

create policy "Users read own calendar push queue"
  on public.calendar_push_queue for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own calendar push queue"
  on public.calendar_push_queue for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users delete own calendar push queue"
  on public.calendar_push_queue for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on table public.calendar_push_queue to authenticated;
grant all on table public.calendar_push_queue to service_role;
