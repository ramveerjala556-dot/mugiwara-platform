import { NextResponse } from "next/server";
import { badRequest, readJson, requireApiUser, serverError } from "@/lib/api";
import { getStore } from "@/lib/store";
import { memoryInputSchema } from "@/lib/security/guards";

export const runtime = "nodejs";

/** GET /api/memory — the caller's Memory Vault. */
export async function GET() {
  const auth = await requireApiUser("memory-list");
  if ("error" in auth) return auth.error;
  try {
    const store = await getStore();
    const memories = await store.listMemories(auth.user.id);
    return NextResponse.json({ memories });
  } catch (error) {
    return serverError(error);
  }
}

/** POST /api/memory — add an entry. Secrets are rejected before storage. */
export async function POST(request: Request) {
  const auth = await requireApiUser("memory-create");
  if ("error" in auth) return auth.error;

  const body = await readJson<unknown>(request);
  if (!body) return badRequest("Expected a JSON body.");

  const parsed = memoryInputSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid memory.");

  const { content, title } = parsed.data;
  if (/sk-[a-zA-Z0-9]{16,}|api[_-]?key\s*[:=]/i.test(`${title} ${content}`)) {
    return badRequest("That looks like it contains a secret. Memory never stores credentials.");
  }

  try {
    const store = await getStore();
    const memory = await store.createMemory(auth.user.id, {
      kind: parsed.data.kind,
      title,
      content,
      projectId: parsed.data.projectId ?? null,
      verified: parsed.data.verified,
      tags: parsed.data.tags,
      source: "user",
    });
    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}

/** PATCH /api/memory — edit or enable/disable an entry. */
export async function PATCH(request: Request) {
  const auth = await requireApiUser("memory-update");
  if ("error" in auth) return auth.error;

  const body = await readJson<{ id?: string; enabled?: boolean; title?: string; content?: string; verified?: boolean }>(request);
  if (!body?.id) return badRequest("Expected { id }.");

  try {
    const store = await getStore();
    const memory = await store.updateMemory(auth.user.id, body.id, {
      ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
      ...(body.title ? { title: body.title } : {}),
      ...(body.content ? { content: body.content } : {}),
      ...(body.verified !== undefined ? { verified: body.verified } : {}),
    });
    if (!memory) return NextResponse.json({ error: "Memory not found." }, { status: 404 });
    return NextResponse.json({ memory });
  } catch (error) {
    return serverError(error);
  }
}

/** DELETE /api/memory?id=... */
export async function DELETE(request: Request) {
  const auth = await requireApiUser("memory-delete");
  if ("error" in auth) return auth.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return badRequest("Expected ?id=…");

  try {
    const store = await getStore();
    await store.deleteMemory(auth.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
