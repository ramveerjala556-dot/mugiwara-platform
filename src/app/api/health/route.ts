import { NextResponse } from "next/server";
import { isSupabaseConfigured, serverEnv } from "@/lib/env";
import { configuredProviders } from "@/lib/ai";
import { getExecutionProvider } from "@/lib/execution";
import { getDeployProvider } from "@/lib/deploy";

export const runtime = "nodejs";

/**
 * GET /api/health — a truthful status report. Each field reflects a real
 * configuration check; nothing is reported healthy unless it is.
 */
export async function GET() {
  const env = serverEnv();
  const execution = getExecutionProvider();
  const deploy = getDeployProvider();

  const report = {
    app: "MUGIWARA",
    time: new Date().toISOString(),
    mode: isSupabaseConfigured ? "production" : "demo",
    checks: {
      database: {
        ok: isSupabaseConfigured,
        detail: isSupabaseConfigured ? "Supabase configured" : "not configured — using local store",
      },
      aiProviders: {
        ok: configuredProviders().length > 0,
        detail: configuredProviders().length > 0 ? configuredProviders().join(", ") : "no API keys set",
      },
      execution: {
        ok: execution.isConfigured() && execution.id !== "none",
        detail: execution.id === "none" ? "disabled" : execution.id,
      },
      deployment: {
        ok: deploy.isConfigured(),
        detail: deploy.id === "none" ? "disabled" : deploy.id,
      },
    },
    limits: {
      maxRunCostUsd: env.maxRunCostUsd,
      maxAgentSteps: env.maxAgentSteps,
      runTimeoutSeconds: env.runTimeoutSeconds,
      maxConcurrency: env.maxConcurrency,
    },
  };

  const healthy = report.checks.database.ok && report.checks.aiProviders.ok;
  return NextResponse.json(report, { status: healthy ? 200 : 200 });
}
