import { NextResponse } from "next/server";
import { badRequest, readJson, requireApiUser, serverError } from "@/lib/api";
import { getStore } from "@/lib/store";
import { getExecutionProvider } from "@/lib/execution";
import type { BuildArtifact } from "@/lib/engine/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/execute — build / test / preview a project in the isolated sandbox.
 *
 * Generated code is untrusted and is NEVER executed on this server. If no
 * execution provider is configured the response says so plainly.
 */
export async function POST(request: Request) {
  const auth = await requireApiUser("execute");
  if ("error" in auth) return auth.error;

  const body = await readJson<{ projectId?: string; action?: "build" | "test" | "preview" }>(request);
  if (!body?.projectId) return badRequest("Expected { projectId }.");

  const action = body.action ?? "preview";

  try {
    const store = await getStore();
    const project = await store.getProject(auth.user.id, body.projectId);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    const files = await store.listFiles(auth.user.id, project.id);
    const artifact: BuildArtifact = {
      files: files.map((f) => ({ path: f.path, content: f.content })),
      entrypoint: "index.html",
    };

    const provider = getExecutionProvider();
    if (!provider.isConfigured() || provider.id === "none") {
      await store.addLog(auth.user.id, project.id, {
        level: "warn",
        source: "execution",
        message: "Execution requested but no isolated provider is configured.",
      });
      return NextResponse.json(
        {
          configured: false,
          ok: false,
          logs:
            "No isolated execution provider is configured. Set EXECUTION_PROVIDER and EXECUTION_API_URL " +
            "to run builds and tests in a sandbox. Nothing was executed.",
        },
        { status: 200 },
      );
    }

    const result =
      action === "build"
        ? await provider.build(artifact)
        : action === "test"
          ? await provider.test(artifact)
          : await provider.preview(artifact);

    await store.addLog(auth.user.id, project.id, {
      level: result.ok ? "info" : "error",
      source: "execution",
      message: `${action} finished with exit code ${result.exitCode} in ${result.durationMs}ms.`,
    });

    return NextResponse.json({ configured: true, ...result });
  } catch (error) {
    return serverError(error);
  }
}
