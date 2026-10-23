-- ============================================================================
-- MUGIWARA — Row Level Security
-- Migration 0002
--
-- Model: every row belongs to exactly one auth user. Policies grant a user
-- access ONLY to rows they own. There is no cross-user read or write path.
-- `service_role` bypasses RLS by design and is used only for privileged
-- server-side background work.
-- ============================================================================

alter table public.profiles         enable row level security;
alter table public.user_settings    enable row level security;
alter table public.projects         enable row level security;
alter table public.project_versions enable row level security;
alter table public.conversations    enable row level security;
alter table public.messages         enable row level security;
alter table public.tasks            enable row level security;
alter table public.agent_runs       enable row level security;
alter table public.files            enable row level security;
alter table public.memories         enable row level security;
alter table public.missions         enable row level security;
alter table public.milestones       enable row level security;
alter table public.automations      enable row level security;
alter table public.skills           enable row level security;
alter table public.test_results     enable row level security;
alter table public.execution_logs   enable row level security;
alter table public.deployments      enable row level security;
alter table public.usage_events     enable row level security;

-- ---------------------------------------------------------------------------
-- profiles — a user reads/updates only their own profile.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- user_settings
-- ---------------------------------------------------------------------------
drop policy if exists "user_settings_all_own" on public.user_settings;
create policy "user_settings_all_own" on public.user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Directly user-owned tables: one uniform owner policy each.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  owned text[] := array[
    'projects','project_versions','conversations','messages','tasks','agent_runs',
    'files','memories','missions','automations','skills','test_results',
    'execution_logs','deployments','usage_events'
  ];
begin
  foreach t in array owned loop
    execute format('drop policy if exists %I on public.%I;', t || '_owner_all', t);
    execute format(
      'create policy %I on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t || '_owner_all', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- milestones has no user_id of its own — ownership flows through its mission.
-- ---------------------------------------------------------------------------
drop policy if exists "milestones_owner_all" on public.milestones;
create policy "milestones_owner_all" on public.milestones
  for all
  using (
    exists (
      select 1 from public.missions m
      where m.id = milestones.mission_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.missions m
      where m.id = milestones.mission_id and m.user_id = auth.uid()
    )
  );
