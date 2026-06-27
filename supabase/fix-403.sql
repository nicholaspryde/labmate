-- Run this in Supabase Dashboard → SQL → New query if signed-in users get 403 on user_workspaces.
-- Safe to re-run: recreates RLS policies and table grants without deleting data.

alter table public.user_workspaces enable row level security;
alter table public.user_presets enable row level security;

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

grant select, insert, update on table public.user_workspaces to authenticated;
grant select, insert, update, delete on table public.user_presets to authenticated;
grant all on table public.user_workspaces to service_role;
grant all on table public.user_presets to service_role;
