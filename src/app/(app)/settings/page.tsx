import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured, serverEnv } from "@/lib/env";
import { configuredProviders } from "@/lib/ai";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const env = serverEnv();
  const providers = configuredProviders();

  const rows: { label: string; ok: boolean; detail: string }[] = [
    { label: "Supabase database", ok: isSupabaseConfigured, detail: isSupabaseConfigured ? "configured" : "demo mode (in-memory)" },
    { label: "AI providers", ok: providers.length > 0, detail: providers.length > 0 ? providers.join(", ") : "none — using built-in generator" },
    { label: "Isolated execution", ok: env.executionProvider !== "none", detail: env.executionProvider },
    { label: "Deployment provider", ok: env.deployProvider !== "none", detail: env.deployProvider },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Settings}
        title="Settings"
        description="Your account and the platform's current configuration. Secrets are never displayed — only whether each integration is wired up."
      />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" value={user.fullName ?? "—"} />
            <Field label="Email" value={user.email ?? "—"} />
            <Field label="User id" value={user.id} mono />
            <Field label="Mode" value={user.isDemo ? "Demo Mode" : "Authenticated"} />
          </dl>
          {user.isDemo && (
            <p className="mt-4 rounded-xl border border-sky-400/25 bg-sky-400/10 px-3.5 py-2.5 text-xs text-sky-100">
              You are in Demo Mode because Supabase is not configured. Add{" "}
              <code className="rounded bg-black/25 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="rounded bg-black/25 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
              <code className="rounded bg-black/25 px-1">.env.local</code>, then run the migrations in{" "}
              <code className="rounded bg-black/25 px-1">supabase/migrations</code>.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            {rows.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 text-parchment/75">
                  <span className={`h-1.5 w-1.5 rounded-full ${row.ok ? "bg-emerald-400" : "bg-amber-400"}`} />
                  {row.label}
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant={row.ok ? "success" : "warning"}>{row.ok ? "ready" : "not configured"}</Badge>
                  <span className="text-parchment/45">{row.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Safety limits</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Max run cost" value={`$${env.maxRunCostUsd.toFixed(2)}`} />
            <Field label="Max agent steps" value={String(env.maxAgentSteps)} />
            <Field label="Run timeout" value={`${env.runTimeoutSeconds}s`} />
            <Field label="Max concurrency" value={String(env.maxConcurrency)} />
          </dl>
          <p className="mt-4 text-[11px] text-parchment/50">
            These are enforced by the orchestrator on every run. Change them in{" "}
            <code className="rounded bg-black/25 px-1">.env.local</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <dt className="text-[10px] uppercase tracking-wide text-parchment/45">{label}</dt>
      <dd className={`mt-1 text-xs text-parchment ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
