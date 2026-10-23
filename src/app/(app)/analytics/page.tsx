import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listProjects, listUsage, weeklyRunCounts } from "@/lib/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCards } from "@/components/dashboard/stat-cards";
import { Productivity } from "@/components/dashboard/productivity";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatUSD } from "@/lib/utils";
import { Activity, Coins, Cpu, FolderKanban } from "lucide-react";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await requireUser();
  const [usage, projects] = await Promise.all([listUsage(user.id), listProjects(user.id)]);

  const runs = usage.filter((u) => u.kind === "agent_run");
  const tokensIn = usage.reduce((sum, u) => sum + Number(u.tokens_in ?? 0), 0);
  const tokensOut = usage.reduce((sum, u) => sum + Number(u.tokens_out ?? 0), 0);
  const cost = usage.reduce((sum, u) => sum + Number(u.cost_usd ?? 0), 0);

  const byModel = new Map<string, { runs: number; cost: number }>();
  for (const event of runs) {
    const key = `${event.provider ?? "unknown"} · ${event.model ?? "n/a"}`;
    const entry = byModel.get(key) ?? { runs: 0, cost: 0 };
    entry.runs += 1;
    entry.cost += Number(event.cost_usd ?? 0);
    byModel.set(key, entry);
  }

  const byStatus = projects.reduce<Record<string, number>>((accumulator, project) => {
    accumulator[project.status] = (accumulator[project.status] ?? 0) + 1;
    return accumulator;
  }, {});

  return (
    <div className="space-y-5">
      <PageHeader
        icon={BarChart3}
        title="Analytics"
        description="Real usage, outcomes and estimated spend. Every number here comes from recorded events — nothing is estimated for display."
      />

      <StatCards
        stats={[
          { label: "Agent runs", value: String(runs.length), hint: "all time", icon: Activity },
          { label: "Projects", value: String(projects.length), hint: "active", icon: FolderKanban },
          { label: "Tokens", value: `${(tokensIn + tokensOut).toLocaleString()}`, hint: `${tokensIn.toLocaleString()} in / ${tokensOut.toLocaleString()} out`, icon: Cpu },
          { label: "Est. spend", value: formatUSD(cost), hint: "list-price estimate", icon: Coins },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Productivity weeklyRuns={weeklyRunCounts(usage)} />

        <Card>
          <CardHeader>
            <CardTitle>Outcomes by status</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <EmptyState icon={FolderKanban} title="No projects yet" description="Build something and its outcome will be tracked here." />
            ) : (
              <ul className="space-y-2.5">
                {Object.entries(byStatus).map(([status, count]) => (
                  <li key={status} className="flex items-center justify-between gap-3">
                    <Badge
                      variant={
                        status === "ready" ? "success" : status === "failed" ? "danger" : status === "building" ? "warning" : "default"
                      }
                    >
                      {status}
                    </Badge>
                    <span className="text-xs tabular-nums text-parchment/70">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage by model</CardTitle>
        </CardHeader>
        <CardContent>
          {byModel.size === 0 ? (
            <EmptyState
              icon={Cpu}
              title="No model usage recorded"
              description="With no AI provider configured, generation uses the built-in generator at zero cost."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-parchment/45">
                    <th className="pb-2 pr-4 font-medium">Provider · model</th>
                    <th className="pb-2 pr-4 font-medium">Runs</th>
                    <th className="pb-2 font-medium">Est. cost</th>
                  </tr>
                </thead>
                <tbody className="text-parchment/75">
                  {[...byModel.entries()].map(([model, data]) => (
                    <tr key={model} className="border-t border-white/8">
                      <td className="py-2.5 pr-4">{model}</td>
                      <td className="py-2.5 pr-4 tabular-nums">{data.runs}</td>
                      <td className="py-2.5 tabular-nums">{formatUSD(data.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
