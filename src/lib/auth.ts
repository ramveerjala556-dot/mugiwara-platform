import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { ProfileRow } from "@/types/database";

export interface SessionUser {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  /** True when running without Supabase — data is local and non-durable. */
  isDemo: boolean;
}

/** The identity used in Demo Mode (no Supabase configured). */
export const DEMO_USER_ID = "demo-captain";
export const DEMO_USER: SessionUser = {
  id: DEMO_USER_ID,
  email: "captain@mugiwara.local",
  fullName: "Captain",
  avatarUrl: null,
  isDemo: true,
};

/**
 * Read the signed-in user (and their profile) on the server.
 *
 * - Supabase configured → real session; redirects to /login when signed out.
 * - Supabase missing    → Demo Mode identity, so the app is fully explorable.
 */
export async function requireUser(): Promise<SessionUser> {
  if (!isSupabaseConfigured) return DEMO_USER;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: (profile as ProfileRow | null)?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? null,
    avatarUrl: (profile as ProfileRow | null)?.avatar_url ?? (user.user_metadata?.avatar_url as string | undefined) ?? null,
    isDemo: false,
  };
}

/** Non-redirecting variant for optional UI (e.g. the top bar). */
export async function getOptionalUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured) return DEMO_USER;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    isDemo: false,
  };
}
