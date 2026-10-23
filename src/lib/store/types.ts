import type {
  AgentName,
  AgentRunRow,
  DeploymentRow,
  ExecutionLogRow,
  FileRow,
  Json,
  MemoryRow,
  MessageRow,
  ProjectRow,
  TaskRow,
  TestResultRow,
  UsageEventRow,
} from "@/types/database";

export interface NewProject {
  name: string;
  description?: string | null;
  framework?: string;
}

export interface NewTask {
  title: string;
  description?: string | null;
  agent?: AgentName | null;
  dependsOn?: string[];
  orderIndex?: number;
  status?: TaskRow["status"];
}

export interface NewMemory {
  kind: MemoryRow["kind"];
  title: string;
  content: string;
  projectId?: string | null;
  verified?: boolean;
  tags?: string[];
  source?: string | null;
}

export interface NewLog {
  level?: ExecutionLogRow["level"];
  source?: string;
  message: string;
  runId?: string | null;
}

export interface NewTest {
  name: string;
  status: TestResultRow["status"];
  durationMs?: number;
  message?: string | null;
  runId?: string;
}

export interface NewUsage {
  projectId?: string | null;
  kind?: string;
  provider?: string | null;
  model?: string | null;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
}

export interface NewAgentRun {
  projectId: string;
  taskId?: string | null;
  agent: AgentName;
  status: AgentRunRow["status"];
  provider: string;
  model: string;
  input?: Json;
  output?: Json | null;
  error?: string | null;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  startedAt?: string;
  finishedAt?: string | null;
}

/**
 * One interface, two implementations:
 *  - `SupabaseStore`  — the production path (Postgres + RLS).
 *  - `LocalStore`     — an in-process fallback so the app is fully usable
 *                       before Supabase is configured (demo mode).
 *
 * Everything in the app talks to this interface, never to a driver directly.
 */
export interface DataStore {
  readonly mode: "supabase" | "local";

  listProjects(userId: string, limit?: number): Promise<ProjectRow[]>;
  getProject(userId: string, id: string): Promise<ProjectRow | null>;
  createProject(userId: string, input: NewProject): Promise<ProjectRow>;
  updateProject(userId: string, id: string, patch: Partial<ProjectRow>): Promise<ProjectRow | null>;
  deleteProject(userId: string, id: string): Promise<void>;

  listFiles(userId: string, projectId: string): Promise<FileRow[]>;
  upsertFile(
    userId: string,
    projectId: string,
    file: { path: string; content: string; language: string },
  ): Promise<FileRow>;
  getFile(userId: string, projectId: string, path: string): Promise<FileRow | null>;

  listTasks(userId: string, projectId: string): Promise<TaskRow[]>;
  replaceTasks(userId: string, projectId: string, tasks: NewTask[]): Promise<TaskRow[]>;
  updateTask(userId: string, id: string, patch: Partial<TaskRow>): Promise<TaskRow | null>;

  listMessages(userId: string, projectId: string): Promise<MessageRow[]>;
  addMessage(
    userId: string,
    projectId: string,
    message: {
      role: MessageRow["role"];
      content: string;
      agent?: AgentName | null;
      tokensIn?: number;
      tokensOut?: number;
      costUsd?: number;
    },
  ): Promise<MessageRow>;

  listLogs(userId: string, projectId?: string, limit?: number): Promise<ExecutionLogRow[]>;
  addLog(userId: string, projectId: string, log: NewLog): Promise<ExecutionLogRow>;

  listTests(userId: string, projectId: string): Promise<TestResultRow[]>;
  addTest(userId: string, projectId: string, test: NewTest): Promise<TestResultRow>;

  listMemories(userId: string, limit?: number): Promise<MemoryRow[]>;
  createMemory(userId: string, memory: NewMemory): Promise<MemoryRow>;
  updateMemory(userId: string, id: string, patch: Partial<NewMemory> & { enabled?: boolean }): Promise<MemoryRow | null>;
  deleteMemory(userId: string, id: string): Promise<void>;

  listUsage(userId: string, limit?: number): Promise<UsageEventRow[]>;
  recordUsage(userId: string, usage: NewUsage): Promise<void>;

  listAgentRuns(userId: string, projectId: string): Promise<AgentRunRow[]>;
  addAgentRun(userId: string, run: NewAgentRun): Promise<AgentRunRow>;

  listDeployments(userId: string, projectId: string): Promise<DeploymentRow[]>;
  createDeployment(
    userId: string,
    projectId: string,
    deployment: { provider: string; status: DeploymentRow["status"]; url?: string | null; logs?: string | null },
  ): Promise<DeploymentRow>;
}
