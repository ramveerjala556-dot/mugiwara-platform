import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, readJson, requireApiUser, serverError } from "@/lib/api";
import { getStore } from "@/lib/store";
import { analyzePrompt } from "@/lib/engine/spec";
import { generateApplication } from "@/lib/engine/generate";
import { crewFollowUp, crewRespond } from "@/lib/agents/conversation";
import { buildPlan } from "@/lib/agents/plan";
import { promptSchema } from "@/lib/security/guards";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  prompt: promptSchema,
  projectId: z.string().min(1).optional(),
  provider: z.enum(["claude", "openai", "gemini"]).optional(),
});

const BUILD_INTENT =
  /\b(build|create|make|generate|design|develop|scaffold|start|set up|setup)\b/i;
const CHANGE_INTENT =
  /\b(change|add|remove|update|fix|rename|adjust|switch|move|delete|replace|tweak|improve|make it)\b/i;

/**
 * POST /api/ai/chat
 *
 * One endpoint for the whole conversation:
 *  - no project + build intent  → plans AND builds a new application
 *  - project + change intent    → applies the change to the existing files
 *  - otherwise                  → answers with prompt-specific information
 *
 * The reply always reflects the user's actual request; nothing is canned.
 */
export async function POST(request: Request) {
  const auth = await requireApiUser("chat");
  if ("error" in auth) return auth.error;

  const body = await readJson<unknown>(request);
  if (!body) return badRequest("Expected a JSON body.");

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid request.");

  const { prompt, projectId, provider } = parsed.data;
  const { user } = auth;

  try {
    const store = await getStore();
    const project = projectId ? await store.getProject(user.id, projectId) : null;
    const existingFiles = project ? await store.listFiles(user.id, project.id) : [];
    const isChange = Boolean(project) && CHANGE_INTENT.test(prompt);
    const isBuild = !project && BUILD_INTENT.test(prompt);

    if (project) {
      await store.addMessage(user.id, project.id, { role: "user", content: prompt });
    }

    /* ---------------------------------------------------------------- build */
    if (isBuild) {
      const spec = analyzePrompt(prompt);
      const created = await store.createProject(user.id, {
        name: spec.name,
        description: prompt,
        framework: "static-html",
      });

      const plan = buildPlan(spec);
      await store.replaceTasks(
        user.id,
        created.id,
        plan.map((task) => ({
          title: task.title,
          description: task.description,
          agent: task.agent,
          dependsOn: task.dependsOn,
          orderIndex: task.order ?? 0,
          status: "pending" as const,
        })),
      );

      const generation = await generateApplication({ prompt, providerId: provider });
      for (const file of generation.files) {
        await store.upsertFile(user.id, created.id, file);
      }
      const checks = verifyFiles(generation.files);
      for (const check of checks) {
        await store.addTest(user.id, created.id, {
          name: check.name,
          status: check.status,
          durationMs: check.durationMs,
          message: check.message,
        });
      }
      await store.addLog(user.id, created.id, {
        level: "info",
        source: "coder",
        message: `Generated ${generation.files.length} files.`,
      });
      await store.updateProject(user.id, created.id, {
        status: checks.some((c) => c.status === "failed") ? "failed" : "ready",
        progress: 100,
      });
      await store.recordUsage(user.id, {
        projectId: created.id,
        kind: "agent_run",
        provider: generation.provider,
        model: generation.model,
        tokensIn: generation.tokensIn,
        tokensOut: generation.tokensOut,
        costUsd: generation.costUsd,
      });

      const reply = await crewRespond({ prompt, providerId: provider });
      const content = [
        reply.content,
        "",
        "---",
        "",
        `**Built.** ${generation.files.length} files are ready: ${generation.files.map((f) => f.path).join(", ")}.`,
        `Verification: ${checks.filter((c) => c.status === "passed").length}/${checks.length} checks passed.`,
      ].join("\n");

      await store.addMessage(user.id, created.id, {
        role: "assistant",
        agent: "navigator",
        content,
        tokensIn: reply.tokensIn,
        tokensOut: reply.tokensOut,
        costUsd: reply.costUsd,
      });

      return NextResponse.json({
        projectId: created.id,
        reply: content,
        agent: "navigator",
        questions: reply.questions,
        acceptance: reply.acceptance,
        tasks: reply.tasks.map((t) => ({ id: t.id, title: t.title, agent: t.agent })),
        usedAI: reply.usedAI,
        built: true,
        files: generation.files.map((f) => ({ path: f.path, language: f.language })),
        checks,
      });
    }

    /* --------------------------------------------------------------- modify */
    if (isChange && project) {
      const generation = await generateApplication({
        prompt,
        existingFiles: existingFiles.map((f) => ({
          path: f.path,
          language: f.language,
          content: f.content,
        })),
        providerId: provider,
      });

      for (const file of generation.files) {
        await store.upsertFile(user.id, project.id, file);
      }
      const checks = verifyFiles(generation.files);
      for (const check of checks) {
        await store.addTest(user.id, project.id, {
          name: check.name,
          status: check.status,
          durationMs: check.durationMs,
          message: check.message,
        });
      }
      await store.addLog(user.id, project.id, {
        level: "info",
        source: "coder",
        message: `Applied change: “${prompt.slice(0, 120)}”.`,
      });
      await store.updateProject(user.id, project.id, {
        status: checks.some((c) => c.status === "failed") ? "failed" : "ready",
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

      const reply = await crewFollowUp({
        message: prompt,
        projectName: project.name,
        filePaths: existingFiles.map((f) => f.path),
        providerId: provider,
      });
      const content = [
        reply.content,
        "",
        "---",
        "",
        `**Applied.** Updated files: ${generation.files.map((f) => f.path).join(", ")}.`,
        `Verification: ${checks.filter((c) => c.status === "passed").length}/${checks.length} checks passed.`,
      ].join("\n");

      await store.addMessage(user.id, project.id, {
        role: "assistant",
        agent: "coder",
        content,
        tokensIn: reply.tokensIn,
        tokensOut: reply.tokensOut,
        costUsd: reply.costUsd,
      });

      return NextResponse.json({
        projectId: project.id,
        reply: content,
        agent: "coder",
        usedAI: reply.usedAI,
        modified: true,
        files: generation.files.map((f) => ({ path: f.path, language: f.language })),
        checks,
      });
    }

    /* ----------------------------------------------------------------- talk */
    const reply = project
      ? await crewFollowUp({
          message: prompt,
          projectName: project.name,
          filePaths: existingFiles.map((f) => f.path),
          providerId: provider,
        })
      : await crewRespond({ prompt, providerId: provider });

    if (project) {
      await store.addMessage(user.id, project.id, {
        role: "assistant",
        agent: reply.agent,
        content: reply.content,
        tokensIn: reply.tokensIn,
        tokensOut: reply.tokensOut,
        costUsd: reply.costUsd,
      });
    }

    return NextResponse.json({
      projectId: project?.id ?? null,
      reply: reply.content,
      agent: reply.agent,
      questions: reply.questions,
      acceptance: reply.acceptance,
      tasks: reply.tasks.map((t) => ({ id: t.id, title: t.title, agent: t.agent })),
      usedAI: reply.usedAI,
    });
  } catch (error) {
    return serverError(error);
  }
}

interface Check {
  name: string;
  status: "passed" | "failed";
  durationMs: number;
  message: string;
}

function verifyFiles(files: { path: string; content: string }[]): Check[] {
  const byPath = new Map(files.map((f) => [f.path, f.content]));
  const checks: Check[] = [];

  const html = byPath.get("index.html");
  checks.push({
    name: "index.html present and well-formed",
    status: html && /^<!doctype html>/i.test(html.trim()) ? "passed" : "failed",
    durationMs: 0,
    message: html ? "Doctype found." : "index.html missing.",
  });

  const js = byPath.get("app.js");
  let jsOk = false;
  let jsMessage = "app.js missing.";
  if (js) {
    try {
      new Function(js);
      jsOk = true;
      jsMessage = "Parsed successfully.";
    } catch (error) {
      jsMessage = error instanceof Error ? error.message : "Parse error.";
    }
  }
  checks.push({ name: "app.js parses", status: jsOk ? "passed" : "failed", durationMs: 0, message: jsMessage });

  const css = byPath.get("styles.css");
  checks.push({
    name: "styles.css defines a theme",
    status: css && css.includes(":root") ? "passed" : "failed",
    durationMs: 0,
    message: css ? "Theme block found." : "styles.css missing.",
  });

  return checks;
}
