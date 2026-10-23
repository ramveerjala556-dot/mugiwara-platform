import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo } from "@/lib/utils";
import type { ProjectRow } from "@/types/database";

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  draft: "default",
  planning: "info",
  building: "warning",
  ready: "success",
  failed: "danger",
  archived: "default",
};

/** Real project progress — computed from tasks, never invented. */
export function ProjectsPanel({ projects }: { projects: ProjectRow[] }) {
  const active = projects.filter((p) => p.status !== "archived");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <FolderKanban className="h-4 w-4 text-gold-300" /> Project Progress
        </CardTitle>
        <Link href="/projects" className="text-xs text-parchment/55 hover:text-gold-200">
          View all →
        </Link>
      </CardHeader>
      <CardContent>
        {active.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Your first generated application will appear here with live progress."
          />
        ) : (
          <ul className="space-y-4">
            {active.slice(0, 4).map((project) => (
              <li key={project.id}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <Link href={`/projects/${project.id}`} className="truncate text-xs font-medium text-parchment hover:text-gold-200">
                    {project.name}
                  </Link>
                  <span className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[project.status] ?? "default"}>{project.status}</Badge>
                    <span className="text-[11px] tabular-nums text-parchment/55">{project.progress}%</span>
                  </span>
                </div>
                <Progress value={project.progress} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Compact "recent projects" list used alongside the progress panel. */
export function RecentProjects({ projects }: { projects: ProjectRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <FolderKanban className="h-4 w-4 text-gold-300" /> Recent Projects
        </CardTitle>
        <Link href="/projects" className="text-xs text-parchment/55 hover:text-gold-200">
          View all →
        </Link>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <EmptyState icon={FolderKanban} title="Nothing here yet" description="Recently touched projects will show up here." />
        ) : (
          <ul className="space-y-3">
            {projects.slice(0, 4).map((project) => (
              <li key={project.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/projects/${project.id}`} className="block truncate text-xs font-medium text-parchment hover:text-gold-200">
                    {project.name}
                  </Link>
                  <span className="text-[10px] text-parchment/45">Updated {timeAgo(project.updated_at)}</span>
                </div>
                <span className="text-[11px] tabular-nums text-parchment/60">{project.progress}%</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
