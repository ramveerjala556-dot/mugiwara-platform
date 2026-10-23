import type {
  AgentRunRow,
  DeploymentRow,
  ExecutionLogRow,
  FileRow,
  MemoryRow,
  MessageRow,
  ProjectRow,
  TaskRow,
  TestResultRow,
  UsageEventRow,
} from "@/types/database";
import type {
  DataStore,
  NewAgentRun,
  NewLog,
  NewMemory,
  NewProject,
  NewTask,
  NewTest,
  NewUsage,
} from "./types";

/**
 * LocalStore — an in-process fallback used when Supabase is not configured.
 *
 * It exists so MUGIWARA is fully usable (prompt → generated app → preview →
 * iterate) the moment you clone it, without any external services. Data lives
 * in memory for the life of the server process and is NOT durable — the UI
 * labels this clearly as Demo Mode. Swap in Supabase for real persistence.
 */

interface Tables {
  projects: ProjectRow[];
  files: FileRow[];
  tasks: TaskRow[];
  messages: MessageRow[];
  logs: ExecutionLogRow[];
  tests: TestResultRow[];
  memories: MemoryRow[];
  usage: UsageEventRow[];
  agentRuns: AgentRunRow[];
  deployments: DeploymentRow[];
}

const globalForStore = globalThis as unknown as { __mugiwaraLocalStore?: Tables };

function tables(): Tables {
  if (!globalForStore.__mugiwaraLocalStore) {
    globalForStore.__mugiwaraLocalStore = {
      projects: [],
      files: [],
      tasks: [],
      messages: [],
      logs: [],
      tests: [],
      memories: [],
      usage: [],
      agentRuns: [],
      deployments: [],
    };
  }
  return globalForStore.__mugiwaraLocalStore;
}

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "project"
  );
}

export class LocalStore implements DataStore {
  readonly mode = "local" as const;

  async listProjects(userId: string, limit?: number): Promise<ProjectRow[]> {
    const rows = tables()
      .projects.filter((p) => p.user_id === userId && !p.archived_at)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return limit ? rows.slice(0, limit) : rows;
  }

  async getProject(userId: string, id: string): Promise<ProjectRow | null> {
    return tables().projects.find((p) => p.id === id && p.user_id === userId) ?? null;
  }

  async createProject(userId: string, input: NewProject): Promise<ProjectRow> {
    const t = tables();
    const base = slugify(input.name);
    let slug = base;
    let n = 2;
    while (t.projects.some((p) => p.user_id === userId && p.slug === slug)) {
      slug = `${base}-${n++}`;
    }
    const row: ProjectRow = {
      id: uid(),
      user_id: userId,
      name: input.name,
      slug,
      description: input.description ?? null,
      framework: input.framework ?? "static-html",
      status: "draft",
      progress: 0,
      created_at: now(),
      updated_at: now(),
      archived_at: null,
    };
    t.projects.unshift(row);
    return row;
  }

  async updateProject(userId: string, id: string, patch: Partial<ProjectRow>): Promise<ProjectRow | null> {
    const t = tables();
    const index = t.projects.findIndex((p) => p.id === id && p.user_id === userId);
    if (index === -1) return null;
    t.projects[index] = { ...t.projects[index], ...patch, updated_at: now() };
    return t.projects[index];
  }

  async deleteProject(userId: string, id: string): Promise<void> {
    const t = tables();
    t.projects = t.projects.filter((p) => !(p.id === id && p.user_id === userId));
    t.files = t.files.filter((f) => f.project_id !== id);
    t.tasks = t.tasks.filter((x) => x.project_id !== id);
    t.messages = t.messages.filter((m) => m.conversation_id !== id);
    t.logs = t.logs.filter((l) => l.project_id !== id);
    t.tests = t.tests.filter((x) => x.project_id !== id);
  }

  async listFiles(userId: string, projectId: string): Promise<FileRow[]> {
    return tables()
      .files.filter((f) => f.project_id === projectId && f.user_id === userId)
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  async getFile(userId: string, projectId: string, path: string): Promise<FileRow | null> {
    return (
      tables().files.find(
        (f) => f.project_id === projectId && f.user_id === userId && f.path === path,
      ) ?? null
    );
  }

  async upsertFile(
    userId: string,
    projectId: string,
    file: { path: string; content: string; language: string },
  ): Promise<FileRow> {
    const t = tables();
    const existing = t.files.find((f) => f.project_id === projectId && f.path === file.path);
    if (existing) {
      existing.content = file.content;
      existing.language = file.language;
      existing.size_bytes = file.content.length;
      existing.updated_at = now();
      return existing;
    }
    const row: FileRow = {
      id: uid(),
      project_id: projectId,
      user_id: userId,
      path: file.path,
      content: file.content,
      language: file.language,
      size_bytes: file.content.length,
      updated_at: now(),
    };
    t.files.push(row);
    return row;
  }

  async listTasks(userId: string, projectId: string): Promise<TaskRow[]> {
    return tables()
      .tasks.filter((x) => x.project_id === projectId && x.user_id === userId)
      .sort((a, b) => a.order_index - b.order_index);
  }

  async replaceTasks(userId: string, projectId: string, tasks: NewTask[]): Promise<TaskRow[]> {
    const t = tables();
    t.tasks = t.tasks.filter((x) => x.project_id !== projectId);
    const created = tasks.map((task, index) => {
      const row: TaskRow = {
        id: uid(),
        project_id: projectId,
        user_id: userId,
        title: task.title,
        description: task.description ?? null,
        status: task.status ?? "pending",
        agent: task.agent ?? null,
        depends_on: task.dependsOn ?? [],
        order_index: task.orderIndex ?? index,
        created_at: now(),
        updated_at: now(),
      };
      t.tasks.push(row);
      return row;
    });
    return created;
  }

  async updateTask(userId: string, id: string, patch: Partial<TaskRow>): Promise<TaskRow | null> {
    const t = tables();
    const index = t.tasks.findIndex((x) => x.id === id && x.user_id === userId);
    if (index === -1) return null;
    t.tasks[index] = { ...t.tasks[index], ...patch, updated_at: now() };
    return t.tasks[index];
  }

  async listMessages(userId: string, projectId: string): Promise<MessageRow[]> {
    return tables()
      .messages.filter((m) => m.conversation_id === projectId && m.user_id === userId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async addMessage(
    userId: string,
    projectId: string,
    message: {
      role: MessageRow["role"];
      content: string;
      agent?: MessageRow["agent"];
      tokensIn?: number;
      tokensOut?: number;
      costUsd?: number;
    },
  ): Promise<MessageRow> {
    const row: MessageRow = {
      id: uid(),
      conversation_id: projectId, // one implicit conversation per project in local mode
      user_id: userId,
      role: message.role,
      agent: message.agent ?? null,
      content: message.content,
      tokens_in: message.tokensIn ?? 0,
      tokens_out: message.tokensOut ?? 0,
      cost_usd: message.costUsd ?? 0,
      created_at: now(),
    };
    tables().messages.push(row);
    return row;
  }

  async listLogs(userId: string, projectId?: string, limit = 100): Promise<ExecutionLogRow[]> {
    return tables()
      .logs.filter((l) => l.user_id === userId && (!projectId || l.project_id === projectId))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  async addLog(userId: string, projectId: string, log: NewLog): Promise<ExecutionLogRow> {
    const row: ExecutionLogRow = {
      id: uid(),
      project_id: projectId,
      user_id: userId,
      run_id: log.runId ?? null,
      level: log.level ?? "info",
      source: log.source ?? "system",
      message: log.message,
      created_at: now(),
    };
    tables().logs.push(row);
    return row;
  }

  async listTests(userId: string, projectId: string): Promise<TestResultRow[]> {
    return tables()
      .tests.filter((x) => x.project_id === projectId && x.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async addTest(userId: string, projectId: string, test: NewTest): Promise<TestResultRow> {
    const row: TestResultRow = {
      id: uid(),
      project_id: projectId,
      user_id: userId,
      run_id: test.runId ?? "",
      name: test.name,
      status: test.status,
      duration_ms: test.durationMs ?? 0,
      message: test.message ?? null,
      created_at: now(),
    };
    tables().tests.push(row);
    return row;
  }

  async listMemories(userId: string, limit?: number): Promise<MemoryRow[]> {
    const rows = tables()
      .memories.filter((m) => m.user_id === userId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return limit ? rows.slice(0, limit) : rows;
  }

  async createMemory(userId: string, memory: NewMemory): Promise<MemoryRow> {
    const row: MemoryRow = {
      id: uid(),
      user_id: userId,
      project_id: memory.projectId ?? null,
      kind: memory.kind,
      title: memory.title,
      content: memory.content,
      verified: memory.verified ?? false,
      source: memory.source ?? null,
      tags: memory.tags ?? [],
      enabled: true,
      created_at: now(),
      updated_at: now(),
    };
    tables().memories.unshift(row);
    return row;
  }

  async updateMemory(
    userId: string,
    id: string,
    patch: Partial<NewMemory> & { enabled?: boolean },
  ): Promise<MemoryRow | null> {
    const t = tables();
    const index = t.memories.findIndex((m) => m.id === id && m.user_id === userId);
    if (index === -1) return null;
    const current = t.memories[index];
    t.memories[index] = {
      ...current,
      ...(patch.kind ? { kind: patch.kind } : {}),
      ...(patch.title ? { title: patch.title } : {}),
      ...(patch.content ? { content: patch.content } : {}),
      ...(patch.verified !== undefined ? { verified: patch.verified } : {}),
      ...(patch.tags ? { tags: patch.tags } : {}),
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      updated_at: now(),
    };
    return t.memories[index];
  }

  async deleteMemory(userId: string, id: string): Promise<void> {
    const t = tables();
    t.memories = t.memories.filter((m) => !(m.id === id && m.user_id === userId));
  }

  async listUsage(userId: string, limit = 500): Promise<UsageEventRow[]> {
    return tables()
      .usage.filter((u) => u.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  async recordUsage(userId: string, usage: NewUsage): Promise<void> {
    tables().usage.push({
      id: uid(),
      user_id: userId,
      project_id: usage.projectId ?? null,
      kind: usage.kind ?? "agent_run",
      provider: usage.provider ?? null,
      model: usage.model ?? null,
      tokens_in: usage.tokensIn ?? 0,
      tokens_out: usage.tokensOut ?? 0,
      cost_usd: usage.costUsd ?? 0,
      created_at: now(),
    });
  }

  async listAgentRuns(userId: string, projectId: string): Promise<AgentRunRow[]> {
    return tables()
      .agentRuns.filter((r) => r.project_id === projectId && r.user_id === userId)
      .sort((a, b) => b.started_at.localeCompare(a.started_at));
  }

  async addAgentRun(userId: string, run: NewAgentRun): Promise<AgentRunRow> {
    const row: AgentRunRow = {
      id: uid(),
      project_id: run.projectId,
      user_id: userId,
      task_id: run.taskId ?? null,
      agent: run.agent,
      status: run.status,
      provider: run.provider,
      model: run.model,
      input: run.input ?? {},
      output: run.output ?? null,
      error: run.error ?? null,
      tokens_in: run.tokensIn ?? 0,
      tokens_out: run.tokensOut ?? 0,
      cost_usd: run.costUsd ?? 0,
      started_at: run.startedAt ?? now(),
      finished_at: run.finishedAt ?? null,
    };
    tables().agentRuns.unshift(row);
    return row;
  }

  async listDeployments(userId: string, projectId: string): Promise<DeploymentRow[]> {
    return tables()
      .deployments.filter((d) => d.project_id === projectId && d.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async createDeployment(
    userId: string,
    projectId: string,
    deployment: { provider: string; status: DeploymentRow["status"]; url?: string | null; logs?: string | null },
  ): Promise<DeploymentRow> {
    const row: DeploymentRow = {
      id: uid(),
      project_id: projectId,
      user_id: userId,
      provider: deployment.provider,
      status: deployment.status,
      url: deployment.url ?? null,
      logs: deployment.logs ?? null,
      created_at: now(),
      updated_at: now(),
    };
    tables().deployments.unshift(row);
    return row;
  }
}
