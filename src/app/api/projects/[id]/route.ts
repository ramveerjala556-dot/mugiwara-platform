import { NextResponse } from "next/server";
import { badRequest, readJson, requireApiUser, serverError } from "@/lib/api";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

/** GET /api/projects/:id — a project plus its files, tasks, logs and tests. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("project-get");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  try {
    const store = await getStore();
    const project = await store.getProject(auth.user.id, id);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    const [files, tasks, logs, tests, deployments, runs] = await Promise.all([
      store.listFiles(auth.user.id, id),
      store.listTasks(auth.user.id, id),
      store.listLogs(auth.user.id, id, 200),
      store.listTests(auth.user.id, id),
      store.listDeployments(auth.user.id, id),
      store.listAgentRuns(auth.user.id, id),
    ]);

    return NextResponse.json({ project, files, tasks, logs, tests, deployments, runs });
  } catch (error) {
    return serverError(error);
  }
}

/** PATCH /api/projects/:id — rename, re-describe or archive. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("project-update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await readJson<{ name?: string; description?: string; archived?: boolean }>(request);
  if (!body) return badRequest("Expected a JSON body.");

  try {
    const store = await getStore();
    const project = await store.updateProject(auth.user.id, id, {
      ...(body.name ? { name: body.name.slice(0, 120) } : {}),
      ...(body.description !== undefined ? { description: body.description.slice(0, 2000) } : {}),
      ...(body.archived ? { archived_at: new Date().toISOString() } : {}),
    });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    return NextResponse.json({ project });
  } catch (error) {
    return serverError(error);
  }
}

/** DELETE /api/projects/:id — permanently remove a project. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("project-delete");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  try {
    const store = await getStore();
    const project = await store.getProject(auth.user.id, id);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    await store.deleteProject(auth.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
