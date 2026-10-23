import { serverEnv } from "@/lib/env";
import { resolveProvider } from "@/lib/ai";
import type { ProviderId } from "@/lib/ai/types";
import type { Json } from "@/types/database";
import { CREW } from "./crew";
import {
  CostBudget,
  type AgentRunContext,
  type AgentTaskResult,
  type PlannedTask,
} from "./types";

export interface OrchestratorOptions {
  userId: string;
  projectId: string;
  prompt: string;
  providerId?: ProviderId;
  maxConcurrency?: number;
  maxRetries?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onEvent?: (event: OrchestratorEvent) => void;
}

export type OrchestratorEvent =
  | { type: "plan"; tasks: PlannedTask[] }
  | { type: "task_start"; task: PlannedTask }
  | { type: "task_done"; result: AgentTaskResult }
  | { type: "task_failed"; result: AgentTaskResult }
  | { type: "budget_exceeded"; spentUsd: number }
  | { type: "cancelled" }
  | { type: "done"; results: AgentTaskResult[] };

/**
 * Runs a dependency-aware plan across the crew with real concurrency limits,
 * bounded retries, a wall-clock timeout and a hard cost ceiling. Every step
 * reports genuine progress through `onEvent` — nothing here fakes success.
 */
export class AgentOrchestrator {
  private readonly maxConcurrency: number;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;

  constructor(private readonly options: OrchestratorOptions) {
    const env = serverEnv();
    this.maxConcurrency = options.maxConcurrency ?? env.maxConcurrency;
    this.maxRetries = options.maxRetries ?? 2;
    this.timeoutMs = options.timeoutMs ?? env.runTimeoutSeconds * 1000;
  }

  /** Ask the Navigator to decompose the request into a task plan. */
  async plan(prompt: string): Promise<PlannedTask[]> {
    const provider = resolveProvider(this.options.providerId);
    const navigator = CREW.navigator;
    const result = await provider.generate({
      system: navigator.systemPrompt,
      messages: [{ role: "user", content: prompt }],
      json: true,
      temperature: 0.1,
      maxTokens: 2048,
    });

    const parsed = result.json as
      | { tasks?: Array<Partial<PlannedTask>> }
      | undefined;
    const tasks = (parsed?.tasks ?? [])
      .filter((t) => Boolean(t.title))
      .map((t, index) => ({
        id: t.id ?? `task-${index + 1}`,
        agent: (t.agent && t.agent in CREW ? t.agent : "coder") as PlannedTask["agent"],
        title: String(t.title),
        description: String(t.description ?? ""),
        dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn.map(String) : [],
        order: index,
      }));

    // Fall back to a minimal, honest plan if the model returned nothing usable.
    if (tasks.length === 0) {
      return [
        { id: "architect", agent: "architect", title: "Design architecture", description: prompt, dependsOn: [], order: 0 },
        { id: "coder", agent: "coder", title: "Generate application", description: prompt, dependsOn: ["architect"], order: 1 },
        { id: "tester", agent: "tester", title: "Verify application", description: prompt, dependsOn: ["coder"], order: 2 },
        { id: "guardian", agent: "guardian", title: "Security review", description: prompt, dependsOn: ["coder"], order: 3 },
      ];
    }
    return tasks;
  }

  /** Execute a plan to completion (or failure / cancellation / budget stop). */
  async run(tasks: PlannedTask[]): Promise<AgentTaskResult[]> {
    const env = serverEnv();
    const budget = new CostBudget(env.maxRunCostUsd);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const externalAbort = () => controller.abort();
    this.options.signal?.addEventListener("abort", externalAbort);

    const context: AgentRunContext = {
      userId: this.options.userId,
      projectId: this.options.projectId,
      providerId: this.options.providerId ?? env.defaultProvider,
      signal: controller.signal,
      budget,
      scratch: {},
    };

    const results = new Map<string, AgentTaskResult>();
    const remaining = new Map(tasks.map((t) => [t.id, t]));
    this.options.onEvent?.({ type: "plan", tasks });

    try {
      while (remaining.size > 0) {
        if (controller.signal.aborted) {
          this.options.onEvent?.({ type: "cancelled" });
          break;
        }
        if (budget.exceeded()) {
          this.options.onEvent?.({ type: "budget_exceeded", spentUsd: budget.spentUsd });
          break;
        }

        // Tasks whose dependencies are all satisfied and are ready to run.
        const ready = [...remaining.values()].filter((task) =>
          task.dependsOn.every((dep) => results.get(dep)?.status === "done"),
        );
        // Tasks permanently blocked because a dependency failed.
        const blocked = [...remaining.values()].filter((task) =>
          task.dependsOn.some((dep) => {
            const r = results.get(dep);
            return r && r.status !== "done";
          }),
        );

        if (ready.length === 0) {
          for (const task of blocked) {
            remaining.delete(task.id);
            const result: AgentTaskResult = {
              taskId: task.id,
              agent: task.agent,
              status: "cancelled",
              output: "Skipped: an upstream task did not succeed.",
              tokensIn: 0,
              tokensOut: 0,
              costUsd: 0,
              attempts: 0,
            };
            results.set(task.id, result);
            this.options.onEvent?.({ type: "task_failed", result });
          }
          if (blocked.length === 0) break; // nothing runnable and nothing blocked
          continue;
        }

        const batch = ready.slice(0, this.maxConcurrency);
        batch.forEach((task) => this.options.onEvent?.({ type: "task_start", task }));

        const settled = await Promise.all(
          batch.map((task) => this.executeWithRetries(task, context)),
        );

        for (const result of settled) {
          results.set(result.taskId, result);
          remaining.delete(result.taskId);
          this.options.onEvent?.({
            type: result.status === "done" ? "task_done" : "task_failed",
            result,
          });
        }
      }
    } finally {
      clearTimeout(timeout);
      this.options.signal?.removeEventListener("abort", externalAbort);
    }

    const all = [...results.values()];
    this.options.onEvent?.({ type: "done", results: all });
    return all;
  }

  private async executeWithRetries(
    task: PlannedTask,
    context: AgentRunContext,
  ): Promise<AgentTaskResult> {
    let attempts = 0;
    let lastError: string | undefined;

    while (attempts <= this.maxRetries) {
      attempts += 1;
      try {
        return await this.executeTask(task, context, attempts);
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        if (context.signal.aborted) break;
        // Exponential backoff between retries, capped.
        await sleep(Math.min(2 ** attempts * 250, 4000), context.signal);
      }
    }

    return {
      taskId: task.id,
      agent: task.agent,
      status: context.signal.aborted ? "cancelled" : "failed",
      output: "",
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      error: lastError ?? "Unknown error",
      attempts,
    };
  }

  private async executeTask(
    task: PlannedTask,
    context: AgentRunContext,
    attempts: number,
  ): Promise<AgentTaskResult> {
    const provider = resolveProvider(context.providerId);
    const definition = CREW[task.agent];

    const priorContext = Object.entries(context.scratch)
      .map(([key, value]) => `${key}: ${JSON.stringify(value).slice(0, 4000)}`)
      .join("\n");

    const result = await provider.generate({
      system: definition.systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            `Task: ${task.title}`,
            task.description && `Details: ${task.description}`,
            priorContext && `Shared context so far:\n${priorContext}`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
      json: true,
      temperature: 0.2,
      maxTokens: 4096,
      signal: context.signal,
    });

    context.budget.add(result.costUsd);
    // Publish this agent's output for downstream agents to consume.
    context.scratch[task.agent] = (result.json ?? result.text) as Json;

    return {
      taskId: task.id,
      agent: task.agent,
      status: "done",
      output: result.text,
      data: (result.json ?? undefined) as Json | undefined,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costUsd: result.costUsd,
      attempts,
    };
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}
