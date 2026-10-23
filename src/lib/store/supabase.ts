/* eslint-disable @typescript-eslint/no-explicit-any */
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
 * Postgres + RLS backed store — the production path.
 *
 * The client is accepted loosely at the boundary because `@supabase/ssr` and
 * `@supabase/supabase-js` ship structurally different generic orderings for
 * their client types. Our own row types are enforced on every public method;
 * the driver calls below are thin pass-throughs.
 */
export class SupabaseStore implements DataStore {
  readonly mode = "supabase" as const;

  constructor(private readonly supabase: any) {}

  private fail(context: string, error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[SupabaseStore] ${context}: ${message}`);
  }

  async listProjects(userId: string, limit?: number): Promise<ProjectRow[]> {
    let query = this.supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false });
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) this.fail("listProjects", error);
    return data ?? [];
  }

  async getProject(userId: string, id: string): Promise<ProjectRow | null> {
    const { data, error } = await this.supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) this.fail("getProject", error);
    return data;
  }

  async createProject(userId: string, input: NewProject): Promise<ProjectRow> {
    const base = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "project";
    const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;

    const { data, error } = await this.supabase
      .from("projects")
      .insert({
        user_id: userId,
        name: input.name,
        slug,
        description: input.description ?? null,
        framework: input.framework ?? "static-html",
      })
      .select("*")
      .single();
    if (error) this.fail("createProject", error);
    return data;
  }

  async updateProject(userId: string, id: string, patch: Partial<ProjectRow>): Promise<ProjectRow | null> {
    const { data, error } = await this.supabase
      .from("projects")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();
    if (error) this.fail("updateProject", error);
    return data;
  }

  async deleteProject(userId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from("projects")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) this.fail("deleteProject", error);
  }

  async listFiles(userId: string, projectId: string): Promise<FileRow[]> {
    const { data, error } = await this.supabase
      .from("files")
      .select("*")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .order("path", { ascending: true });
    if (error) this.fail("listFiles", error);
    return data ?? [];
  }

  async getFile(userId: string, projectId: string, path: string): Promise<FileRow | null> {
    const { data, error } = await this.supabase
      .from("files")
      .select("*")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .eq("path", path)
      .maybeSingle();
    if (error) this.fail("getFile", error);
    return data;
  }

  async upsertFile(
    userId: string,
    projectId: string,
    file: { path: string; content: string; language: string },
  ): Promise<FileRow> {
    const { data, error } = await this.supabase
      .from("files")
      .upsert(
        {
          user_id: userId,
          project_id: projectId,
          path: file.path,
          content: file.content,
          language: file.language,
          size_bytes: file.content.length,
        },
        { onConflict: "project_id,path" },
      )
      .select("*")
      .single();
    if (error) this.fail("upsertFile", error);
    return data;
  }

  async listTasks(userId: string, projectId: string): Promise<TaskRow[]> {
    const { data, error } = await this.supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .order("order_index", { ascending: true });
    if (error) this.fail("listTasks", error);
    return data ?? [];
  }

  async replaceTasks(userId: string, projectId: string, tasks: NewTask[]): Promise<TaskRow[]> {
    await this.supabase.from("tasks").delete().eq("project_id", projectId).eq("user_id", userId);
    if (tasks.length === 0) return [];
    const { data, error } = await this.supabase
      .from("tasks")
      .insert(
        tasks.map((task, index) => ({
          user_id: userId,
          project_id: projectId,
          title: task.title,
          description: task.description ?? null,
          status: task.status ?? "pending",
          agent: task.agent ?? null,
          depends_on: task.dependsOn ?? [],
          order_index: task.orderIndex ?? index,
        })),
      )
      .select("*");
    if (error) this.fail("replaceTasks", error);
    return data ?? [];
  }

  async updateTask(userId: string, id: string, patch: Partial<TaskRow>): Promise<TaskRow | null> {
    const { data, error } = await this.supabase
      .from("tasks")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();
    if (error) this.fail("updateTask", error);
    return data;
  }

  /** One implicit conversation per project keeps the schema simple. */
  private async ensureConversation(userId: string, projectId: string): Promise<string> {
    const { data: existing } = await this.supabase
      .from("conversations")
      .select("id")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .limit(1)
      .maybeSingle();
    if (existing?.id) return existing.id;

    const { data, error } = await this.supabase
      .from("conversations")
      .insert({ user_id: userId, project_id: projectId, title: "Project chat" })
      .select("id")
      .single();
    if (error) this.fail("ensureConversation", error);
    return data.id;
  }

  async listMessages(userId: string, projectId: string): Promise<MessageRow[]> {
    const conversationId = await this.ensureConversation(userId, projectId);
    const { data, error } = await this.supabase
      .from("messages")
      .select("*")
      .eq("user_id", userId)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) this.fail("listMessages", error);
    return data ?? [];
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
    const conversationId = await this.ensureConversation(userId, projectId);
    const { data, error } = await this.supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role: message.role,
        agent: message.agent ?? null,
        content: message.content,
        tokens_in: message.tokensIn ?? 0,
        tokens_out: message.tokensOut ?? 0,
        cost_usd: message.costUsd ?? 0,
      })
      .select("*")
      .single();
    if (error) this.fail("addMessage", error);
    return data;
  }

  async listLogs(userId: string, projectId?: string, limit = 100): Promise<ExecutionLogRow[]> {
    let query = this.supabase
      .from("execution_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (projectId) query = query.eq("project_id", projectId);
    const { data, error } = await query;
    if (error) this.fail("listLogs", error);
    return data ?? [];
  }

  async addLog(userId: string, projectId: string, log: NewLog): Promise<ExecutionLogRow> {
    const { data, error } = await this.supabase
      .from("execution_logs")
      .insert({
        user_id: userId,
        project_id: projectId,
        run_id: log.runId ?? null,
        level: log.level ?? "info",
        source: log.source ?? "system",
        message: log.message,
      })
      .select("*")
      .single();
    if (error) this.fail("addLog", error);
    return data;
  }

  async listTests(userId: string, projectId: string): Promise<TestResultRow[]> {
    const { data, error } = await this.supabase
      .from("test_results")
      .select("*")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) this.fail("listTests", error);
    return data ?? [];
  }

  async addTest(userId: string, projectId: string, test: NewTest): Promise<TestResultRow> {
    const { data, error } = await this.supabase
      .from("test_results")
      .insert({
        user_id: userId,
        project_id: projectId,
        run_id: test.runId ?? "",
        name: test.name,
        status: test.status,
        duration_ms: test.durationMs ?? 0,
        message: test.message ?? null,
      })
      .select("*")
      .single();
    if (error) this.fail("addTest", error);
    return data;
  }

  async listMemories(userId: string, limit?: number): Promise<MemoryRow[]> {
    let query = this.supabase
      .from("memories")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) this.fail("listMemories", error);
    return data ?? [];
  }

  async createMemory(userId: string, memory: NewMemory): Promise<MemoryRow> {
    const { data, error } = await this.supabase
      .from("memories")
      .insert({
        user_id: userId,
        project_id: memory.projectId ?? null,
        kind: memory.kind,
        title: memory.title,
        content: memory.content,
        verified: memory.verified ?? false,
        tags: memory.tags ?? [],
        source: memory.source ?? null,
      })
      .select("*")
      .single();
    if (error) this.fail("createMemory", error);
    return data;
  }

  async updateMemory(
    userId: string,
    id: string,
    patch: Partial<NewMemory> & { enabled?: boolean },
  ): Promise<MemoryRow | null> {
    const { data, error } = await this.supabase
      .from("memories")
      .update({
        ...(patch.kind ? { kind: patch.kind } : {}),
        ...(patch.title ? { title: patch.title } : {}),
        ...(patch.content ? { content: patch.content } : {}),
        ...(patch.verified !== undefined ? { verified: patch.verified } : {}),
        ...(patch.tags ? { tags: patch.tags } : {}),
        ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();
    if (error) this.fail("updateMemory", error);
    return data;
  }

  async deleteMemory(userId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from("memories")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) this.fail("deleteMemory", error);
  }

  async listUsage(userId: string, limit = 500): Promise<UsageEventRow[]> {
    const { data, error } = await this.supabase
      .from("usage_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) this.fail("listUsage", error);
    return data ?? [];
  }

  async recordUsage(userId: string, usage: NewUsage): Promise<void> {
    const { error } = await this.supabase.from("usage_events").insert({
      user_id: userId,
      project_id: usage.projectId ?? null,
      kind: usage.kind ?? "agent_run",
      provider: usage.provider ?? null,
      model: usage.model ?? null,
      tokens_in: usage.tokensIn ?? 0,
      tokens_out: usage.tokensOut ?? 0,
      cost_usd: usage.costUsd ?? 0,
    });
    if (error) this.fail("recordUsage", error);
  }

  async listAgentRuns(userId: string, projectId: string): Promise<AgentRunRow[]> {
    const { data, error } = await this.supabase
      .from("agent_runs")
      .select("*")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .order("started_at", { ascending: false });
    if (error) this.fail("listAgentRuns", error);
    return data ?? [];
  }

  async addAgentRun(userId: string, run: NewAgentRun): Promise<AgentRunRow> {
    const { data, error } = await this.supabase
      .from("agent_runs")
      .insert({
        user_id: userId,
        project_id: run.projectId,
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
        started_at: run.startedAt ?? new Date().toISOString(),
        finished_at: run.finishedAt ?? null,
      })
      .select("*")
      .single();
    if (error) this.fail("addAgentRun", error);
    return data;
  }

  async listDeployments(userId: string, projectId: string): Promise<DeploymentRow[]> {
    const { data, error } = await this.supabase
      .from("deployments")
      .select("*")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) this.fail("listDeployments", error);
    return data ?? [];
  }

  async createDeployment(
    userId: string,
    projectId: string,
    deployment: { provider: string; status: DeploymentRow["status"]; url?: string | null; logs?: string | null },
  ): Promise<DeploymentRow> {
    const { data, error } = await this.supabase
      .from("deployments")
      .insert({
        user_id: userId,
        project_id: projectId,
        provider: deployment.provider,
        status: deployment.status,
        url: deployment.url ?? null,
        logs: deployment.logs ?? null,
      })
      .select("*")
      .single();
    if (error) this.fail("createDeployment", error);
    return data;
  }
}
