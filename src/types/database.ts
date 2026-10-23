/**
 * Database types for the MUGIWARA Postgres schema.
 *
 * These mirror `supabase/migrations/*.sql`. In a real project you would
 * regenerate this file with `supabase gen types typescript`, but it is checked
 * in so the codebase type-checks without a live database.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type ProjectStatus = "draft" | "planning" | "building" | "ready" | "failed" | "archived";
export type TaskStatus = "pending" | "blocked" | "running" | "done" | "failed" | "cancelled";
export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "timeout";
export type AgentName =
  | "navigator"
  | "architect"
  | "designer"
  | "researcher"
  | "coder"
  | "tester"
  | "guardian";
export type MemoryKind =
  | "preference"
  | "decision"
  | "architecture"
  | "fix"
  | "learning"
  | "open_task";

export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSettingsRow {
  user_id: string;
  default_provider: string;
  theme: string;
  memory_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  framework: string;
  status: ProjectStatus;
  progress: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ProjectVersionRow {
  id: string;
  project_id: string;
  user_id: string;
  label: string;
  snapshot: Json;
  created_at: string;
}

export interface ConversationRow {
  id: string;
  project_id: string | null;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  agent: AgentName | null;
  content: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  created_at: string;
}

export interface TaskRow {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  agent: AgentName | null;
  depends_on: string[];
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface AgentRunRow {
  id: string;
  project_id: string;
  user_id: string;
  task_id: string | null;
  agent: AgentName;
  status: RunStatus;
  provider: string;
  model: string;
  input: Json;
  output: Json | null;
  error: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  started_at: string;
  finished_at: string | null;
}

export interface FileRow {
  id: string;
  project_id: string;
  user_id: string;
  path: string;
  content: string;
  language: string;
  size_bytes: number;
  updated_at: string;
}

export interface MemoryRow {
  id: string;
  user_id: string;
  project_id: string | null;
  kind: MemoryKind;
  title: string;
  content: string;
  verified: boolean;
  source: string | null;
  tags: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface MissionRow {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  progress: number;
  due_at: string | null;
  created_at: string;
}

export interface MilestoneRow {
  id: string;
  mission_id: string;
  title: string;
  status: TaskStatus;
  order_index: number;
}

export interface AutomationRow {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  trigger: string;
  schedule: string | null;
  action: string;
  enabled: boolean;
  last_run_at: string | null;
  created_at: string;
}

export interface SkillRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  input_schema: Json;
  output_schema: Json;
  permissions: string[];
  limits: Json;
  enabled: boolean;
  created_at: string;
}

export interface TestResultRow {
  id: string;
  project_id: string;
  user_id: string;
  run_id: string;
  name: string;
  status: "passed" | "failed" | "skipped";
  duration_ms: number;
  message: string | null;
  created_at: string;
}

export interface ExecutionLogRow {
  id: string;
  project_id: string;
  user_id: string;
  run_id: string | null;
  level: "debug" | "info" | "warn" | "error";
  source: string;
  message: string;
  created_at: string;
}

export interface DeploymentRow {
  id: string;
  project_id: string;
  user_id: string;
  provider: string;
  status: "pending" | "building" | "ready" | "error";
  url: string | null;
  logs: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageEventRow {
  id: string;
  user_id: string;
  project_id: string | null;
  kind: string;
  provider: string | null;
  model: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  created_at: string;
}

type TableShape<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableShape<ProfileRow>;
      user_settings: TableShape<UserSettingsRow>;
      projects: TableShape<ProjectRow>;
      project_versions: TableShape<ProjectVersionRow>;
      conversations: TableShape<ConversationRow>;
      messages: TableShape<MessageRow>;
      tasks: TableShape<TaskRow>;
      agent_runs: TableShape<AgentRunRow>;
      files: TableShape<FileRow>;
      memories: TableShape<MemoryRow>;
      missions: TableShape<MissionRow>;
      milestones: TableShape<MilestoneRow>;
      automations: TableShape<AutomationRow>;
      skills: TableShape<SkillRow>;
      test_results: TableShape<TestResultRow>;
      execution_logs: TableShape<ExecutionLogRow>;
      deployments: TableShape<DeploymentRow>;
      usage_events: TableShape<UsageEventRow>;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
