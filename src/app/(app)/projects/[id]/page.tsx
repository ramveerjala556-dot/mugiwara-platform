import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getProject,
  listAgentRuns,
  listDeployments,
  listFiles,
  listMessages,
  listProjectLogs,
  listTasks,
  listTests,
} from "@/lib/queries";
import { ProjectWorkspace } from "@/components/workspace/project-workspace";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const user = await requireUser();
  const { id } = await params;
  const project = await getProject(user.id, id);
  return { title: project?.name ?? "Project" };
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const project = await getProject(user.id, id);
  if (!project) notFound();

  const [files, tasks, logs, tests, deployments, messages] = await Promise.all([
    listFiles(user.id, project.id),
    listTasks(user.id, project.id),
    listProjectLogs(user.id, project.id, 120),
    listTests(user.id, project.id),
    listDeployments(user.id, project.id),
    listMessages(user.id, project.id),
  ]);

  // Agent runs are recorded for analytics; the workspace shows them via logs.
  await listAgentRuns(user.id, project.id);

  return (
    <ProjectWorkspace
      project={project}
      files={files}
      tasks={tasks}
      logs={logs}
      tests={tests}
      deployments={deployments}
      messages={messages}
    />
  );
}
