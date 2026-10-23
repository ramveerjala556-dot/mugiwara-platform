import type { Metadata } from "next";
import { Activity, Brain, FolderKanban, MessagesSquare, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured, serverEnv } from "@/lib/env";
import {
  listMemories,
  listProjects,
  listRecentLogs,
  listUsage,
  weeklyRunCounts,
} from "@/lib/queries";
import { configuredProviders } from "@/lib/ai";
import { getExecutionProvider } from "@/lib/execution";
import { Hero } from "@/components/dashboard/hero";
import { PromptComposer } from "@/components/dashboard/prompt-composer";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TaskFlow } from "@/components/dashboard/task-flow";
import { CrewPanel } from "@/components/dashboard/crew-panel";
import { MemoryPanel } from "@/components/dashboard/memory-panel";
import { ActivityPanel } from "@/components/dashboard/activity-panel";
import { ProjectsPanel, RecentProjects } from "@/components/dashboard/projects-panel";
import { Productivity } from "@/components/dashboard/productivity";
import { SystemStatus, type SystemCheck } from "@/components/dashboard/system-status";
import { StatCards } from "@/components/dashboard/stat-cards";
import { ChatPanel } from "@/components/assistant/chat-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stagger, StaggerItem } from "@/components/motion";
import { greeting } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const name = user.fullName?.split(" ")[0] ?? "Captain";

  const [projects, memories, logs, usage] = await Promise.all([
    listProjects(user.id),
    listMemories(user.id, 6),
    listRecentLogs(user.id, 8),
    listUsage(user.id),
  ]);

  const env = serverEnv();
  const providers = configuredProviders();
  const checks: SystemCheck[] = [
    {
      label: "Database (Supabase)",
      ok: isSupabaseConfigured,
      detail: isSupabaseConfigured ? "connected" : "demo mode",
    },
    {
      label: "AI providers",
      ok: providers.length > 0,
      detail: providers.length > 0 ? providers.join(", ") : "built-in generator",
    },
    {
      label: "Isolated execution",
      ok: getExecutionProvider().isConfigured() && env.executionProvider !== "none",
      detail: env.executionProvider === "none" ? "disabled" : env.executionProvider,
    },
    {
      label: "Deployment",
      ok: env.deployProvider !== "none",
      detail: env.deployProvider === "none" ? "disabled" : env.deployProvider,
    },
  ];

  const totalCost = usage.reduce((sum, event) => sum + Number(event.cost_usd ?? 0), 0);
  const runCount = usage.filter((u) => u.kind === "agent_run").length;

  return (
    <Stagger className="space-y-5">
      <StaggerItem>
        <Hero name={name} initialGreeting={greeting()} />
      </StaggerItem>

      <StaggerItem>
        <PromptComposer />
      </StaggerItem>

      <StaggerItem>
        <StatCards
          stats={[
            { label: "Projects", value: String(projects.length), hint: "active", icon: FolderKanban },
            { label: "Memories", value: String(memories.length), hint: "in vault", icon: Brain },
            { label: "Agent runs", value: String(runCount), hint: "all time", icon: Activity },
            { label: "Est. spend", value: `$${totalCost.toFixed(2)}`, hint: "across providers", icon: Sparkles },
          ]}
        />
      </StaggerItem>

      <StaggerItem>
        <QuickActions />
      </StaggerItem>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <StaggerItem>
            <Card>
              <CardHeader>
                <CardTitle>
                  <MessagesSquare className="h-4 w-4 text-gold-300" /> Ask your crew
                </CardTitle>
                <span className="text-[11px] text-parchment/45">
                  Describe anything — it will be planned and built
                </span>
              </CardHeader>
              <CardContent>
                <ChatPanel compact />
              </CardContent>
            </Card>
          </StaggerItem>

          <div className="grid gap-5 md:grid-cols-2">
            <StaggerItem>
              <TaskFlow current={logs.length > 0 ? "execute" : "plan"} />
            </StaggerItem>
            <StaggerItem>
              <CrewPanel />
            </StaggerItem>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <StaggerItem>
              <ProjectsPanel projects={projects} />
            </StaggerItem>
            <StaggerItem>
              <RecentProjects projects={projects.slice(0, 4)} />
            </StaggerItem>
          </div>
        </div>

        <div className="space-y-5">
          <StaggerItem>
            <ActivityPanel logs={logs} />
          </StaggerItem>
          <StaggerItem>
            <MemoryPanel memories={memories} />
          </StaggerItem>
          <StaggerItem>
            <Productivity weeklyRuns={weeklyRunCounts(usage)} />
          </StaggerItem>
          <StaggerItem>
            <SystemStatus checks={checks} />
          </StaggerItem>
        </div>
      </div>
    </Stagger>
  );
}
