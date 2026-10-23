import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listProjects } from "@/lib/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button-variants";
import { timeAgo, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const all = user ? await listProjects(user.id) : [];
  const projects = q
    ? all.filter((p) => `${p.name} ${p.description ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    : all;

  return (
    <div>
      <PageHeader
        icon={FolderKanban}
        title="Projects"
        description="Everything your crew is building. Progress reflects real task completion."
        action={
          <Link href="/workspace" className={cn(buttonVariants(), "gap-2")}>
            <Plus className="h-4 w-4" /> New project
          </Link>
        }
      />

      {q && (
        <p className="mb-4 text-xs text-parchment/55">
          {projects.length} result{projects.length === 1 ? "" : "s"} for “{q}”
        </p>
      )}

      {projects.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <EmptyState
              icon={FolderKanban}
              title={q ? "No matching projects" : "No projects yet"}
              description={
                q
                  ? "Try a different search term."
                  : "Head to the Workspace and describe what you want to build."
              }
              action={
                <Link href="/workspace" className={cn(buttonVariants({ size: "sm" }))}>
                  Open Workspace
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full p-5 transition-colors hover:border-gold-400/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-parchment">{project.name}</h2>
                    <p className="mt-1 line-clamp-2 text-xs text-parchment/55">
                      {project.description || "No description yet."}
                    </p>
                  </div>
                  <Badge variant="gold">{project.framework}</Badge>
                </div>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-[11px] text-parchment/55">
                    <span className="capitalize">{project.status}</span>
                    <span className="tabular-nums">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} />
                </div>
                <p className="mt-3 text-[10px] text-parchment/40">
                  Updated {timeAgo(project.updated_at)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
