import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, readJson, requireApiUser, serverError } from "@/lib/api";
import { getStore } from "@/lib/store";
import { analyzePrompt } from "@/lib/engine/spec";
import { describeGeneration, generateApplication, type GenerationResult } from "@/lib/engine/generate";
import { buildPlan } from "@/lib/agents/plan";
import { promptSchema } from "@/lib/security/guards";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  prompt: promptSchema,
  projectId: z.string().min(1).optional(),
  mode: z.enum(["build", "research", "analyze", "write", "automate"]).optional(),
});

/**
 * POST /api/ai/generate
 *
 * The prompt-to-application endpoint. Creates (or reuses) a project, records the
 * Navigator's plan, generates real files, runs genuine verification checks and
 * returns the project so the UI can open its workspace.
 */
export async function POST(request: Request) {
  const auth = await requireApiUser("generate");
  if ("error" in auth) return auth.error;

  const body = await readJson<unknown>(request);
  if (!body) return badRequest("Expected a JSON body.");

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid request.");
  }

  const { prompt, projectId: existingProjectId } = parsed.data;
  const { user } = auth;

  try {
    const store = await getStore();
    const spec = analyzePrompt(prompt);

    // 1. Project -------------------------------------------------------------
    let project = existingProjectId
      ? await store.getProject(user.id, existingProjectId)
      : null;

    if (!project) {
      project = await store.createProject(user.id, {
        name: spec.name,
        description: prompt,
        framework: "static-html",
      });
    }

    await store.updateProject(user.id, project.id, { status: "building", progress: 10 });

    // 2. Navigator plans -----------------------------------------------------
    const plan = buildPlan(spec);
    const storedTasks = await store.replaceTasks(
      user.id,
      project.id,
      plan.map((task) => ({
        title: task.title,
        description: task.description,
        agent: task.agent,
        dependsOn: task.dependsOn,
        orderIndex: task.order ?? 0,
        status: "pending" as const,
      })),
    );
    await store.addLog(user.id, project.id, {
      level: "info",
      source: "navigator",
      message: `Planned ${plan.length} tasks for “${spec.name}”.`,
    });

    // 3. Coder generates -----------------------------------------------------
    const existing = await store.listFiles(user.id, project.id);
    const generation = await generateApplication({
      prompt,
      existingFiles: existing.length
        ? existing.map((f) => ({ path: f.path, language: f.language, content: f.content }))
        : undefined,
    });

    for (const file of generation.files) {
      await store.upsertFile(user.id, project.id, file);
    }
    await store.addLog(user.id, project.id, {
      level: "info",
      source: "coder",
      message: describeGeneration(generation),
    });

    // 4. Tester verifies (genuine checks on the produced artefacts) ----------
    const checks = runVerification(generation.files);
    for (const check of checks) {
      await store.addTest(user.id, project.id, {
        name: check.name,
        status: check.status,
        durationMs: check.durationMs,
        message: check.message,
      });
    }
    const failed = checks.filter((c) => c.status === "failed");
    await store.addLog(user.id, project.id, {
      level: failed.length ? "warn" : "info",
      source: "tester",
      message: failed.length
        ? `${failed.length} of ${checks.length} checks failed.`
        : `All ${checks.length} checks passed.`,
    });

    // 5. Guardian reviews ----------------------------------------------------
    const security = reviewSecurity(generation.files);
    await store.addLog(user.id, project.id, {
      level: security.safe ? "info" : "warn",
      source: "guardian",
      message: security.safe
        ? "Security review passed: no secrets, no unsafe external loads."
        : `Security review flagged: ${security.issues.join("; ")}`,
    });

    // 6. Mark tasks done and finalise ---------------------------------------
    for (const task of storedTasks) {
      await store.updateTask(user.id, task.id, { status: failed.length ? "failed" : "done" });
    }

    const finalStatus = failed.length ? "failed" : "ready";
    await store.updateProject(user.id, project.id, {
      status: finalStatus,
      progress: 100,
      framework: "static-html",
    });

    // 7. Conversation + usage ------------------------------------------------
    await store.addMessage(user.id, project.id, { role: "user", content: prompt });
    await store.addMessage(user.id, project.id, {
      role: "assistant",
      agent: "coder",
      content: buildAssistantSummary(spec.name, generation, checks),
      tokensIn: generation.tokensIn,
      tokensOut: generation.tokensOut,
      costUsd: generation.costUsd,
    });

    await store.recordUsage(user.id, {
      projectId: project.id,
      kind: "agent_run",
      provider: generation.provider,
      model: generation.model,
      tokensIn: generation.tokensIn,
      tokensOut: generation.tokensOut,
      costUsd: generation.costUsd,
    });

    return NextResponse.json({
      projectId: project.id,
      name: spec.name,
      archetype: spec.archetype,
      usedAI: generation.usedAI,
      summary: generation.summary,
      files: generation.files.map((f) => ({ path: f.path, language: f.language })),
      checks,
    });
  } catch (error) {
    return serverError(error);
  }
}

/* -------------------------------------------------------------------------- */
/* Verification helpers — real checks, real results.                           */
/* -------------------------------------------------------------------------- */

interface Check {
  name: string;
  status: "passed" | "failed";
  durationMs: number;
  message: string;
}

function runVerification(files: { path: string; content: string; language: string }[]): Check[] {
  const checks: Check[] = [];
  const byPath = new Map(files.map((f) => [f.path, f]));

  const time = <T>(fn: () => T): { result: T; ms: number } => {
    const started = Date.now();
    const result = fn();
    return { result, ms: Date.now() - started };
  };

  const html = byPath.get("index.html");
  const htmlCheck = time(() => {
    if (!html) return "index.html is missing.";
    if (!/^<!doctype html>/i.test(html.content.trim())) return "index.html does not start with a doctype.";
    if (!html.content.includes("styles.css")) return "index.html does not link styles.css.";
    if (!html.content.includes("app.js")) return "index.html does not link app.js.";
    return null;
  });
  checks.push({
    name: "index.html is well-formed and wired up",
    status: htmlCheck.result ? "failed" : "passed",
    durationMs: htmlCheck.ms,
    message: htmlCheck.result ?? "Doctype, stylesheet and script all present.",
  });

  const css = byPath.get("styles.css");
  const cssCheck = time(() => {
    if (!css) return "styles.css is missing.";
    if (!css.content.includes(":root")) return "styles.css has no :root theme block.";
    if (css.content.trim().length < 200) return "styles.css looks empty.";
    return null;
  });
  checks.push({
    name: "styles.css defines a theme",
    status: cssCheck.result ? "failed" : "passed",
    durationMs: cssCheck.ms,
    message: cssCheck.result ?? "Theme custom properties present.",
  });

  const js = byPath.get("app.js");
  const jsCheck = time(() => {
    if (!js) return "app.js is missing.";
    try {
      // Compiles the source without executing it — a real syntax check.
      new Function(js.content);
      return null;
    } catch (error) {
      return `app.js failed to parse: ${error instanceof Error ? error.message : String(error)}`;
    }
  });
  checks.push({
    name: "app.js parses without syntax errors",
    status: jsCheck.result ? "failed" : "passed",
    durationMs: jsCheck.ms,
    message: jsCheck.result ?? "Parsed successfully.",
  });

  return checks;
}

function reviewSecurity(files: { path: string; content: string }[]): { safe: boolean; issues: string[] } {
  const issues: string[] = [];
  for (const file of files) {
    if (/sk-[a-zA-Z0-9]{16,}|api[_-]?key\s*[:=]\s*["'][^"']{12,}/i.test(file.content)) {
      issues.push(`${file.path} appears to contain a secret`);
    }
    if (/<script[^>]+src=["']https?:\/\//i.test(file.content)) {
      issues.push(`${file.path} loads an external script`);
    }
    if (/eval\s*\(/.test(file.content)) {
      issues.push(`${file.path} uses eval()`);
    }
  }
  return { safe: issues.length === 0, issues };
}

function buildAssistantSummary(
  name: string,
  generation: GenerationResult,
  checks: Check[],
): string {
  const passed = checks.filter((c) => c.status === "passed").length;
  return [
    `**Coder here.** “${name}” is built.`,
    "",
    `Files: ${generation.files.map((f) => f.path).join(", ")}`,
    `Verification: ${passed}/${checks.length} checks passed.`,
    generation.usedAI
      ? `Generated with ${generation.provider}.`
      : "Generated with the built-in generator (no AI provider configured).",
    "",
    "Open the **Preview** tab to try it, or tell me what to change next — for example “make the theme blue” or “add a contact form”.",
  ].join("\n");
}
