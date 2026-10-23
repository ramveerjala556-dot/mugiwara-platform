import type { AgentName, Json } from "@/types/database";
import type { ProviderId } from "@/lib/ai/types";

export interface AgentDefinition {
  name: AgentName;
  label: string;
  tagline: string;
  /** The agent's role/instructions. Agents share models but differ in instructions. */
  systemPrompt: string;
  /** Logical tools this agent may request. Enforced server-side. */
  tools: AgentTool[];
  /** Tailwind colour token used by the UI crew panel. */
  accent: string;
}

export type AgentTool =
  | "search_web"
  | "read_docs"
  | "read_file"
  | "write_file"
  | "run_tests"
  | "run_lint"
  | "run_typecheck"
  | "query_db"
  | "review_security";

export interface PlannedTask {
  /** Client-side id, unique within a plan. */
  id: string;
  agent: AgentName;
  title: string;
  description: string;
  /** Ids of tasks that must succeed before this one may start. */
  dependsOn: string[];
  /** Optional explicit order hint. */
  order?: number;
}

export interface AgentRunContext {
  userId: string;
  projectId: string;
  providerId: ProviderId;
  signal: AbortSignal;
  budget: CostBudget;
  /** Free-form context shared between agents (plan, architecture, files…). */
  scratch: Record<string, Json>;
}

export interface AgentTaskResult {
  taskId: string;
  agent: AgentName;
  status: "done" | "failed" | "cancelled";
  output: string;
  data?: Json;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  error?: string;
  attempts: number;
}

/** Tracks cumulative spend for a run so the orchestrator can stop early. */
export class CostBudget {
  private spent = 0;
  constructor(readonly limitUsd: number) {}
  get spentUsd(): number {
    return this.spent;
  }
  get remainingUsd(): number {
    return Math.max(0, this.limitUsd - this.spent);
  }
  exceeded(): boolean {
    return this.spent >= this.limitUsd;
  }
  add(cost: number): void {
    this.spent += cost;
  }
}
