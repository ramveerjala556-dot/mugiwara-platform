import { NextResponse } from "next/server";
import { getOptionalUser, type SessionUser } from "@/lib/auth";
import { rateLimit } from "@/lib/security/guards";

/**
 * Resolve the caller for an API route.
 * Returns either a user or a ready-made error response to return immediately.
 */
export async function requireApiUser(
  scope: string,
): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const user = await getOptionalUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }),
    };
  }

  const limit = rateLimit(`${scope}:${user.id}`, { capacity: 30, refillPerSecond: 0.5 });
  if (!limit.allowed) {
    return {
      error: NextResponse.json(
        { error: "Rate limit reached. Please slow down and try again shortly." },
        { status: 429, headers: { "retry-after": "30" } },
      ),
    };
  }

  return { user };
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
