import { NextResponse } from "next/server";
import { badRequest, readJson, requireApiUser, serverError } from "@/lib/api";
import { getStore } from "@/lib/store";
import { assertSafeRelativePath } from "@/lib/security/guards";
import { languageForPath } from "@/lib/engine/templates";

export const runtime = "nodejs";

/**
 * POST /api/projects/:id/files
 * Save an edited file from the workspace editor. Paths are validated so an
 * edit can never escape the project.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("files-save");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await readJson<{ path?: string; content?: string }>(request);
  if (!body?.path || typeof body.content !== "string") {
    return badRequest("Expected { path, content }.");
  }

  try {
    assertSafeRelativePath(body.path);
  } catch {
    return badRequest("That file path is not allowed.");
  }

  try {
    const store = await getStore();
    const project = await store.getProject(auth.user.id, id);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    const file = await store.upsertFile(auth.user.id, id, {
      path: body.path,
      content: body.content,
      language: languageForPath(body.path),
    });

    await store.addLog(auth.user.id, id, {
      level: "info",
      source: "editor",
      message: `Saved ${body.path} (${body.content.length} bytes).`,
    });

    return NextResponse.json({ file });
  } catch (error) {
    return serverError(error);
  }
}

/** GET /api/projects/:id/files — list files for a project. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("files-list");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  try {
    const store = await getStore();
    const project = await store.getProject(auth.user.id, id);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const files = await store.listFiles(auth.user.id, id);
    return NextResponse.json({ files });
  } catch (error) {
    return serverError(error);
  }
}
