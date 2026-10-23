import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { LocalStore } from "./local";
import { SupabaseStore } from "./supabase";
import type { DataStore } from "./types";

export * from "./types";
export { LocalStore } from "./local";
export { SupabaseStore } from "./supabase";

/**
 * Return the active data store for this request.
 *
 * Supabase when configured; otherwise an in-process local store so the app is
 * usable out of the box. The UI reads `store.mode` to label Demo Mode honestly.
 */
export async function getStore(): Promise<DataStore> {
  if (isSupabaseConfigured) {
    return new SupabaseStore(await createClient());
  }
  return new LocalStore();
}

export function isDemoMode(): boolean {
  return !isSupabaseConfigured;
}
