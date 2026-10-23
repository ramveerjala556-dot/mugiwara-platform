/**
 * Central, typed access to environment variables.
 *
 * Two accessors:
 *  - `publicEnv`  — values safe to ship to the browser (NEXT_PUBLIC_*).
 *  - `serverEnv()` — server-only secrets. Throws if read on the client, so a
 *    secret can never leak into a bundle by accident.
 *
 * We read lazily (functions, not top-level constants) so that `next build`
 * succeeds even when secrets are absent — e.g. in CI or a fresh clone.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example and README.`,
    );
  }
  return value;
}

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "MUGIWARA",
};

/** True when the Supabase public config is present, so the UI can degrade gracefully. */
export const isSupabaseConfigured =
  Boolean(publicEnv.supabaseUrl) && Boolean(publicEnv.supabaseAnonKey);

export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must never be called from client code.");
  }
  return {
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
    defaultProvider: (process.env.AI_DEFAULT_PROVIDER ?? "claude") as
      | "claude"
      | "openai"
      | "gemini",
    maxRunCostUsd: Number(process.env.AI_MAX_RUN_COST_USD ?? "2.00"),
    maxAgentSteps: Number(process.env.AI_MAX_AGENT_STEPS ?? "40"),
    runTimeoutSeconds: Number(process.env.AI_RUN_TIMEOUT_SECONDS ?? "600"),
    maxConcurrency: Number(process.env.AI_MAX_CONCURRENCY ?? "3"),
    executionProvider: process.env.EXECUTION_PROVIDER ?? "none",
    executionApiUrl: process.env.EXECUTION_API_URL ?? "",
    executionApiKey: process.env.EXECUTION_API_KEY ?? "",
    deployProvider: process.env.DEPLOY_PROVIDER ?? "none",
    deployApiToken: process.env.DEPLOY_API_TOKEN ?? "",
  };
}

export { required };
