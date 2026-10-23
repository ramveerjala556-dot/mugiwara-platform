import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database";

interface CookieToSet {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

/**
 * Server Supabase client bound to the request's cookie jar. Use this in
 * Server Components, Route Handlers and Server Actions to read the signed-in
 * user. The anon key is used; RLS still governs every row.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render — safe to ignore because
            // middleware refreshes the session cookie instead.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. BYPASSES RLS. Server-only. Use sparingly for privileged
 * background work (agent runs, webhooks) and NEVER in a route that echoes user
 * input straight into a query.
 */
export function createAdminClient() {
  const { supabaseServiceRoleKey } = serverEnv();
  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set; admin client unavailable.");
  }
  return createSupabaseClient<Database>(publicEnv.supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
