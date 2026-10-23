import type { Metadata } from "next";
import Link from "next/link";
import { FileCode2, FolderOpen } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { listProjects } from "@/lib/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Files" };
export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const user = await requireUser();
  const projects = await listProjects(user.id);
  const store = await getStore();

  const groups = await Promise.all(
    projects.map(async (project) => ({
      project,
      files: await store.listFiles(user.id, project.id),
    })),
  );

  const total = groups.reduce((sum, group) => sum + group.files.length, 0);

  return (
    <div>
      <PageHeader
        icon={FolderOpen}
        title="Files"
        description={`Every generated file, grouped by project. ${total} file${total === 1 ? "" : "s"} across ${projects.length} project${projects.length === 1 ? "" : "s"}.`}
      />

      {groups.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <EmptyState
              icon={FolderOpen}
              title="No files yet"
              description="Generate an application and its source files will be listed here."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map(({ project, files }) => (
            <Card key={project.id}>
              <CardHeader>
                <CardTitle>
                  <FolderOpen className="h-4 w-4 text-gold-300" />
                  <Link href={`/projects/${project.id}`} className="hover:text-gold-200">
                    {project.name}
                  </Link>
                </CardTitle>
                <span className="text-[11px] text-parchment/50">{files.length} files</span>
              </CardHeader>
              <CardContent>
                {files.length === 0 ? (
                  <p className="text-xs text-parchment/50">No files in this project yet.</p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {files.map((file) => (
                      <li key={file.id}>
                        <Link
                          href={`/projects/${project.id}`}
                          className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-parchment/75 transition-colors hover:border-gold-400/30 hover:text-parchment"
                        >
                          <FileCode2 className="h-3.5 w-3.5 shrink-0 text-gold-300/80" />
                          <span className="truncate">{file.path}</span>
                          <Badge className="ml-auto shrink-0">{file.language}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
