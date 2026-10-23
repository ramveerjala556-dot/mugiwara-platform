import type { PlannedTask } from "@/lib/agents/types";

/**
 * The Prompt-to-Application pipeline, expressed as explicit, auditable steps.
 * The route handler drives these stages and persists real state after each one;
 * this module owns the vocabulary and the ordering so UI and server agree.
 */
export const PIPELINE_STAGES = [
  { id: "intake", label: "Receive request", description: "Capture the natural-language prompt." },
  { id: "clarify", label: "Clarify", description: "Extract requirements; ask only essential questions." },
  { id: "plan", label: "Plan", description: "Generate an editable plan and acceptance criteria." },
  { id: "design", label: "Design", description: "Architecture, database, APIs and UI." },
  { id: "generate", label: "Generate", description: "Write frontend and backend files." },
  { id: "migrate", label: "Migrations", description: "Create migrations and env templates." },
  { id: "verify", label: "Verify", description: "Lint, typecheck, build and tests." },
  { id: "repair", label: "Repair", description: "Diagnose failures and attempt bounded fixes." },
  { id: "preview", label: "Preview", description: "Run in an isolated preview environment." },
  { id: "report", label: "Report", description: "Show tasks, files, logs and test results." },
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]["id"];

export interface PipelineState {
  stage: PipelineStageId;
  plan: PlannedTask[];
  acceptanceCriteria: string[];
  questions: string[];
  files: { path: string; language: string; content: string }[];
}

/** Marker types for the isolated execution step (Phase 7). */
export interface BuildArtifact {
  files: { path: string; content: string }[];
  entrypoint: string;
}

export interface ExecutionResult {
  ok: boolean;
  logs: string;
  exitCode: number;
  durationMs: number;
  url?: string;
}

/**
 * Interface implemented by an isolated execution backend. The main app server
 * must NEVER run generated code in-process; it delegates to this provider,
 * which runs untrusted code in a throwaway sandbox with no network egress.
 */
export interface ExecutionProvider {
  readonly id: string;
  isConfigured(): boolean;
  build(artifact: BuildArtifact): Promise<ExecutionResult>;
  test(artifact: BuildArtifact): Promise<ExecutionResult>;
  preview(artifact: BuildArtifact): Promise<ExecutionResult>;
  stop(runId: string): Promise<void>;
}
