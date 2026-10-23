-- ============================================================================
-- MUGIWARA — initial schema
-- Migration 0001
--
-- Every table is owned by a user (`user_id` or `id` = auth.users.id) and is
-- protected by Row Level Security in migration 0002. No table is readable
-- across users.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared helper: keep `updated_at` honest on every write.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user, created automatically on signup.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_settings
-- ---------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  default_provider text not null default 'claude',
  theme            text not null default 'midnight',
  memory_enabled   boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  slug        text not null,
  description text,
  framework   text not null default 'static-html',
  status      text not null default 'draft'
                check (status in ('draft','planning','building','ready','failed','archived')),
  progress    integer not null default 0 check (progress between 0 and 100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  unique (user_id, slug)
);

create index if not exists projects_user_updated_idx
  on public.projects (user_id, updated_at desc);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- project_versions — Git-style history for rollback.
-- ---------------------------------------------------------------------------
create table if not exists public.project_versions (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  label      text not null,
  snapshot   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists project_versions_project_idx
  on public.project_versions (project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- conversations & messages
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_idx
  on public.conversations (user_id, updated_at desc);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system')),
  agent           text check (agent in
                    ('navigator','architect','designer','researcher','coder','tester','guardian')),
  content         text not null,
  tokens_in       integer not null default 0,
  tokens_out      integer not null default 0,
  cost_usd        numeric(12,6) not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at asc);

-- ---------------------------------------------------------------------------
-- tasks — the plan produced by the Navigator, executed by the crew.
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'pending'
                check (status in ('pending','blocked','running','done','failed','cancelled')),
  agent       text check (agent in
                ('navigator','architect','designer','researcher','coder','tester','guardian')),
  depends_on  text[] not null default '{}',
  order_index integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists tasks_project_idx
  on public.tasks (project_id, order_index asc);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- agent_runs — one row per agent invocation. The audit trail of the crew.
-- ---------------------------------------------------------------------------
create table if not exists public.agent_runs (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  task_id    uuid references public.tasks(id) on delete set null,
  agent      text not null check (agent in
               ('navigator','architect','designer','researcher','coder','tester','guardian')),
  status     text not null default 'queued'
               check (status in ('queued','running','succeeded','failed','cancelled','timeout')),
  provider   text not null default 'claude',
  model      text not null default '',
  input      jsonb not null default '{}'::jsonb,
  output     jsonb,
  error      text,
  tokens_in  integer not null default 0,
  tokens_out integer not null default 0,
  cost_usd   numeric(12,6) not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists agent_runs_project_idx
  on public.agent_runs (project_id, started_at desc);

-- ---------------------------------------------------------------------------
-- files — the generated application's source tree.
-- ---------------------------------------------------------------------------
create table if not exists public.files (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  path       text not null,
  content    text not null default '',
  language   text not null default 'plaintext',
  size_bytes integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (project_id, path)
);

create index if not exists files_project_idx on public.files (project_id, path);

create trigger files_set_updated_at
  before update on public.files
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- memories — the Memory Vault.
-- ---------------------------------------------------------------------------
create table if not exists public.memories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  kind       text not null check (kind in
               ('preference','decision','architecture','fix','learning','open_task')),
  title      text not null,
  content    text not null,
  verified   boolean not null default false,
  source     text,
  tags       text[] not null default '{}',
  enabled    boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memories_user_idx
  on public.memories (user_id, updated_at desc);

create trigger memories_set_updated_at
  before update on public.memories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- missions & milestones
-- ---------------------------------------------------------------------------
create table if not exists public.missions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'pending'
                check (status in ('pending','blocked','running','done','failed','cancelled')),
  progress    integer not null default 0 check (progress between 0 and 100),
  due_at      timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists missions_project_idx on public.missions (project_id);

create table if not exists public.milestones (
  id          uuid primary key default gen_random_uuid(),
  mission_id  uuid not null references public.missions(id) on delete cascade,
  title       text not null,
  status      text not null default 'pending'
                check (status in ('pending','blocked','running','done','failed','cancelled')),
  order_index integer not null default 0
);

create index if not exists milestones_mission_idx
  on public.milestones (mission_id, order_index);

-- ---------------------------------------------------------------------------
-- automations & skills
-- ---------------------------------------------------------------------------
create table if not exists public.automations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete cascade,
  name        text not null,
  trigger     text not null,
  schedule    text,
  action      text not null,
  enabled     boolean not null default false,
  last_run_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists automations_user_idx on public.automations (user_id);

create table if not exists public.skills (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  description   text not null default '',
  input_schema  jsonb not null default '{}'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  permissions   text[] not null default '{}',
  limits        jsonb not null default '{}'::jsonb,
  enabled       boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists skills_user_idx on public.skills (user_id);

-- ---------------------------------------------------------------------------
-- test_results & execution_logs
-- ---------------------------------------------------------------------------
create table if not exists public.test_results (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  run_id      text not null default '',
  name        text not null,
  status      text not null check (status in ('passed','failed','skipped')),
  duration_ms integer not null default 0,
  message     text,
  created_at  timestamptz not null default now()
);

create index if not exists test_results_project_idx
  on public.test_results (project_id, created_at desc);

create table if not exists public.execution_logs (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  run_id     text,
  level      text not null default 'info' check (level in ('debug','info','warn','error')),
  source     text not null default 'system',
  message    text not null,
  created_at timestamptz not null default now()
);

create index if not exists execution_logs_project_idx
  on public.execution_logs (project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- deployments
-- ---------------------------------------------------------------------------
create table if not exists public.deployments (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  provider   text not null default 'none',
  status     text not null default 'pending'
               check (status in ('pending','building','ready','error')),
  url        text,
  logs       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deployments_project_idx
  on public.deployments (project_id, created_at desc);

create trigger deployments_set_updated_at
  before update on public.deployments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- usage_events — cost & token accounting for Analytics.
-- ---------------------------------------------------------------------------
create table if not exists public.usage_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  kind       text not null default 'agent_run',
  provider   text,
  model      text,
  tokens_in  integer not null default 0,
  tokens_out integer not null default 0,
  cost_usd   numeric(12,6) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_idx
  on public.usage_events (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- New-user bootstrap: create a profile and settings row on signup.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
