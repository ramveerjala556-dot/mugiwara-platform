import { NextResponse } from "next/server";
import { badRequest, readJson, requireApiUser, serverError } from "@/lib/api";
import { getStore } from "@/lib/store";
import { projectInputSchema } from "@/lib/security/guards";

export const runtime = "nodejs";

/** GET /api/projects — list the caller's projects. */
export async function GET() {
  const auth = await requireApiUser("projects-list");
  if ("error" in auth) return auth.error;
  try {
    const store = await getStore();
    const projects = await store.listProjects(auth.user.id);
    return NextResponse.json({ projects });
  } catch (error) {
    return serverError(error);
  }
}

/** POST /api/projects — create an empty project. */
export async function POST(request: Request) {
  const auth = await requireApiUser("projects-create");
  if ("error" in auth) return auth.error;

  const body = await readJson<unknown>(request);
  if (!body) return badRequest("Expected a JSON body.");

  const parsed = projectInputSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid project.");

  try {
    const store = await getStore();
    const project = await store.createProject(auth.user.id, parsed.data);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
