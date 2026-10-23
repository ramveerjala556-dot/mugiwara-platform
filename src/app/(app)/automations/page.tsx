import type { Metadata } from "next";
import { Workflow } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Automations" };
export const dynamic = "force-dynamic";

/**
 * Automations run scheduled or event-driven work. They are deliberately gated:
 * nothing is scheduled without a scheduler configured and the user's explicit
 * authorization, so this page is honest about what is and isn't wired up.
 */
export default async function AutomationsPage() {
  await requireUser();
  const env = serverEnv();
  const schedulerReady = Boolean(process.env.CRON_SECRET);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Workflow}
        title="Automations"
        description="Scheduled or event-driven crew work — nightly builds, dependency checks, documentation refreshes."
      />

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant={schedulerReady ? "success" : "warning"}>
              {schedulerReady ? "scheduler configured" : "scheduler not configured"}
            </Badge>
            <Badge variant={env.deployProvider === "none" ? "default" : "success"}>
              deploy provider: {env.deployProvider}
            </Badge>
          </div>

          <EmptyState
            icon={Workflow}
            title="No automations yet"
            description="Automations are not enabled by default. Wiring one up requires a scheduler secret and your explicit approval for each workflow, because these run unattended and can spend tokens."
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h2 className="text-sm font-semibold text-parchment">What an automation will need</h2>
          <ul className="mt-3 space-y-2 text-xs text-parchment/65">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400/70" />
              A scheduler secret (<code className="rounded bg-black/25 px-1">CRON_SECRET</code>) so only
              your scheduler can trigger runs.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400/70" />
              An explicit approval per automation, stored with the workflow.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400/70" />
              A per-run cost ceiling so unattended work can never run away.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
