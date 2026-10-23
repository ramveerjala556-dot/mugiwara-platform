import type { Metadata } from "next";
import Link from "next/link";
import { Target } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listProjects, listTasks } from "@/lib/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Missions" };
export const dynamic = "force-dynamic";

/**
 * A mission is a project's build effort. Progress is computed from the real
 * task states the crew recorded — never from a stored guess.
 */
export default async function MissionsPage() {
  const user = await requireUser();
  const projects = await listProjects(user.id);

  const missions = await Promise.all(
    projects.map(async (project) => {
      const tasks = await listTasks(user.id, project.id);
      const done = tasks.filter((t) => t.status === "done").length;
      const failed = tasks.filter((t) => t.status === "failed").length;
      const progress = tasks.length === 0 ? project.progress : Math.round((done / tasks.length) * 100);
      return { project, tasks, done, failed, progress };
    }),
  );

  return (
    <div>
      <PageHeader
        icon={Target}
        title="Missions"
        description="Each build tracked as a mission, with milestones and progress derived from real task outcomes."
      />

      {missions.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <EmptyState
              icon={Target}
              title="No missions yet"
              description="Start a build in the Workspace and it will be tracked here."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {missions.map(({ project, tasks, done, failed, progress }) => (
            <Card key={project.id}>
              <CardHeader>
                <CardTitle>
                  <Target className="h-4 w-4 text-gold-300" />
                  <Link href={`/projects/${project.id}`} className="hover:text-gold-200">
                    {project.name}
                  </Link>
                </CardTitle>
                <Badge variant={failed > 0 ? "danger" : progress === 100 ? "success" : "warning"}>
                  {failed > 0 ? "blocked" : progress === 100 ? "complete" : "in progress"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex justify-between text-[11px] text-parchment/55">
                  <span>
                    {done}/{tasks.length} milestones
                  </span>
                  <span className="tabular-nums">{progress}%</span>
                </div>
                <Progress value={progress} />

                <ul className="mt-4 space-y-1.5">
                  {tasks.slice(0, 6).map((task) => (
                    <li key={task.id} className="flex items-center gap-2 text-[11px]">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          task.status === "done"
                            ? "bg-emerald-400"
                            : task.status === "failed"
                              ? "bg-rose-400"
                              : "bg-gold-400/60"
                        }`}
                      />
                      <span className="truncate text-parchment/70">{task.title}</span>
                      <span className="ml-auto shrink-0 text-parchment/40">{task.agent ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
