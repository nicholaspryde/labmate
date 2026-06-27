-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Creates tables for per-user workspace state and saved presets, with Row Level Security.

-- Workspace: one row per user, stores the full editor AppState as JSON.
create table if not exists public.user_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  app_state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_workspaces enable row level security;

create policy "Users read own workspace"
  on public.user_workspaces for select
  using (auth.uid() = user_id);

create policy "Users insert own workspace"
  on public.user_workspaces for insert
  with check (auth.uid() = user_id);

create policy "Users update own workspace"
  on public.user_workspaces for update
  using (auth.uid() = user_id);

-- Presets: saved protocol templates per user.
create table if not exists public.user_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  preset jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists user_presets_user_id_idx on public.user_presets (user_id, created_at desc);

alter table public.user_presets enable row level security;

create policy "Users read own presets"
  on public.user_presets for select
  using (auth.uid() = user_id);

create policy "Users insert own presets"
  on public.user_presets for insert
  with check (auth.uid() = user_id);

create policy "Users update own presets"
  on public.user_presets for update
  using (auth.uid() = user_id);

create policy "Users delete own presets"
  on public.user_presets for delete
  using (auth.uid() = user_id);
