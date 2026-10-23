import { NextResponse } from "next/server";
import { badRequest, readJson, requireApiUser, serverError } from "@/lib/api";
import { getStore } from "@/lib/store";
import { getDeployProvider } from "@/lib/deploy";

export const runtime = "nodejs";

/**
 * POST /api/deploy — deploy a project.
 *
 * Requires an explicit `approve: true` flag: deployment is an irreversible
 * outward-facing action, so it is never triggered as a side effect. Nothing is
 * reported as successful unless the provider confirms it.
 */
export async function POST(request: Request) {
  const auth = await requireApiUser("deploy");
  if ("error" in auth) return auth.error;

  const body = await readJson<{ projectId?: string; approve?: boolean }>(request);
  if (!body?.projectId) return badRequest("Expected { projectId }.");

  try {
    const store = await getStore();
    const project = await store.getProject(auth.user.id, body.projectId);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    if (body.approve !== true) {
      return NextResponse.json(
        {
          approved: false,
          logs:
            "Deployment requires explicit approval. Re-send with { approve: true } once you've reviewed the build.",
        },
        { status: 200 },
      );
    }

    const provider = getDeployProvider();
    const result = await provider.deploy({
      projectId: project.id,
      sourceUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/projects/${project.id}`,
      envVars: {},
    });

    const deployment = await store.createDeployment(auth.user.id, project.id, {
      provider: provider.id,
      status: result.status === "unconfigured" ? "error" : (result.status as "pending" | "building" | "ready" | "error"),
      url: result.url ?? null,
      logs: result.logs,
    });

    await store.addLog(auth.user.id, project.id, {
      level: result.status === "ready" ? "info" : "warn",
      source: "deploy",
      message: result.logs,
    });

    return NextResponse.json({ approved: true, deployment });
  } catch (error) {
    return serverError(error);
  }
}
