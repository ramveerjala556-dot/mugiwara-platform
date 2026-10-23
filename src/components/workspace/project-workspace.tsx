"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Eye,
  FileCode2,
  ListChecks,
  Play,
  Rocket,
  Save,
  ScrollText,
  Trash2,
  XCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CodeEditor } from "@/components/workspace/code-editor";
import { ChatPanel, type ChatMessageView } from "@/components/assistant/chat-panel";
import { useToast } from "@/components/ui/toast";
import { composePreview, sortFiles } from "@/lib/engine/preview";
import { cn, timeAgo } from "@/lib/utils";
import type {
  DeploymentRow,
  ExecutionLogRow,
  FileRow,
  MessageRow,
  ProjectRow,
  TaskRow,
  TestResultRow,
} from "@/types/database";

const AGENT_LABEL: Record<string, string> = {
  navigator: "Navigator",
  architect: "Architect",
  designer: "Designer",
  researcher: "Researcher",
  coder: "Coder",
  tester: "Tester",
  guardian: "Guardian",
};

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  draft: "default",
  planning: "info",
  building: "warning",
  ready: "success",
  failed: "danger",
  archived: "default",
};

export function ProjectWorkspace({
  project,
  files: initialFiles,
  tasks,
  logs,
  tests,
  deployments: initialDeployments,
  messages,
}: {
  project: ProjectRow;
  files: FileRow[];
  tasks: TaskRow[];
  logs: ExecutionLogRow[];
  tests: TestResultRow[];
  deployments: DeploymentRow[];
  messages: MessageRow[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const ordered = useMemo(() => sortFiles(initialFiles), [initialFiles]);
  const [activeFile, setActiveFile] = useState<string>(ordered[0]?.path ?? "");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [approved, setApproved] = useState(false);

  const current = ordered.find((f) => f.path === activeFile) ?? ordered[0];
  const currentValue = current ? (drafts[current.path] ?? current.content) : "";
  const dirty = current ? drafts[current.path] !== undefined && drafts[current.path] !== current.content : false;

  // Preview uses saved content plus any unsaved drafts, so you see your edits.
  const previewFiles = ordered.map((file) => ({
    path: file.path,
    content: drafts[file.path] ?? file.content,
  }));
  const previewDoc = useMemo(() => composePreview(previewFiles), [previewFiles]);

  const chatMessages: ChatMessageView[] = messages.map((message) => ({
    id: message.id,
    role: message.role === "user" ? "user" : "assistant",
    content: message.content,
    agent: message.agent,
  }));

  async function save() {
    if (!current || !dirty) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/files`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: current.path, content: currentValue }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Save failed.");
      setDrafts((current) => {
        const next = { ...current };
        delete next[activeFile];
        return next;
      });
      toast({ title: "Saved", description: `${activeFile} updated.`, variant: "success" });
      router.refresh();
    } catch (error) {
      toast({
        title: "Could not save",
        description: error instanceof Error ? error.message : "Unknown error.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function deploy() {
    setDeploying(true);
    try {
      const response = await fetch("/api/deploy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: project.id, approve: approved }),
      });
      const payload = await response.json();
      const status = payload.deployment?.status;
      toast({
        title: status === "ready" ? "Deployed" : "Deployment not completed",
        description: payload.deployment?.logs ?? "See the Deploy tab for details.",
        variant: status === "ready" ? "success" : "warning",
      });
      setDeployOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        title: "Deployment failed",
        description: error instanceof Error ? error.message : "Unknown error.",
        variant: "error",
      });
    } finally {
      setDeploying(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete “${project.name}” and all its files? This cannot be undone.`)) return;
    const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (response.ok) {
      toast({ title: "Project deleted", variant: "info" });
      router.push("/projects");
    } else {
      toast({ title: "Delete failed", variant: "error" });
    }
  }

  const passed = tests.filter((t) => t.status === "passed").length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-5">
      {/* Header ------------------------------------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-parchment/45">
            <Link href="/projects" className="hover:text-gold-200">
              Projects
            </Link>
            <span>/</span>
            <span className="truncate">{project.slug}</span>
          </div>
          <h1 className="mt-1 flex flex-wrap items-center gap-2.5 font-display text-2xl font-semibold text-parchment">
            {project.name}
            <Badge variant={STATUS_VARIANT[project.status] ?? "default"}>{project.status}</Badge>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-parchment/60">
            {project.description || "No description."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => router.refresh()}>
            <Play className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setDeployOpen(true)}>
            <Rocket className="h-3.5 w-3.5" /> Deploy
          </Button>
          <Button variant="ghost" size="icon" aria-label="Delete project" onClick={remove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        {/* Main ------------------------------------------------------------ */}
        <Tabs defaultValue="overview" className="min-w-0">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview">
              <ListChecks className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="plan">
              <ListChecks className="h-3.5 w-3.5" /> Plan
            </TabsTrigger>
            <TabsTrigger value="code">
              <Code2 className="h-3.5 w-3.5" /> Code
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-3.5 w-3.5" /> Preview
            </TabsTrigger>
            <TabsTrigger value="logs">
              <ScrollText className="h-3.5 w-3.5" /> Logs
            </TabsTrigger>
            <TabsTrigger value="tests">
              <CheckCircle2 className="h-3.5 w-3.5" /> Tests
            </TabsTrigger>
            <TabsTrigger value="deploy">
              <Rocket className="h-3.5 w-3.5" /> Deploy
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Build status</CardTitle>
                  <span className="text-xs tabular-nums text-parchment/55">{project.progress}%</span>
                </CardHeader>
                <CardContent>
                  <Progress value={project.progress} />
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat label="Files" value={String(ordered.length)} />
                    <Stat label="Tasks done" value={`${doneTasks}/${tasks.length}`} />
                    <Stat label="Checks passed" value={`${passed}/${tests.length}`} />
                    <Stat label="Updated" value={timeAgo(project.updated_at)} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Acceptance criteria</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {acceptanceFor(project).map((line) => (
                      <li key={line} className="flex items-start gap-2 text-xs text-parchment/75">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400/70" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Plan */}
          <TabsContent value="plan">
            <Card>
              <CardHeader>
                <CardTitle>Crew plan</CardTitle>
                <span className="text-xs text-parchment/50">{tasks.length} tasks</span>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <EmptyState icon={ListChecks} title="No plan yet" description="Ask the crew to build something and the plan will appear here." />
                ) : (
                  <ol className="space-y-2.5">
                    {tasks.map((task) => (
                      <li key={task.id} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                        <TaskIcon status={task.status} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-parchment">{task.title}</p>
                          {task.description && (
                            <p className="mt-0.5 text-[11px] text-parchment/50">{task.description}</p>
                          )}
                        </div>
                        <span className="flex shrink-0 items-center gap-2">
                          {task.agent && <Badge>{AGENT_LABEL[task.agent] ?? task.agent}</Badge>}
                          <Badge variant={task.status === "done" ? "success" : task.status === "failed" ? "danger" : "default"}>
                            {task.status}
                          </Badge>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Code */}
          <TabsContent value="code">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-2.5">
                <span className="flex items-center gap-2 text-xs text-parchment/70">
                  <FileCode2 className="h-3.5 w-3.5 text-gold-300" />
                  {activeFile || "No files"}
                  {dirty && <span className="text-gold-300">• unsaved</span>}
                </span>
                <Button size="sm" onClick={save} disabled={!dirty || saving}>
                  <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[190px_1fr]">
                <ul className="max-h-[420px] overflow-y-auto border-b border-white/8 p-2 md:border-b-0 md:border-r">
                  {ordered.map((file) => (
                    <li key={file.id}>
                      <button
                        type="button"
                        onClick={() => setActiveFile(file.path)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                          file.path === activeFile
                            ? "bg-gold-400/12 text-gold-100"
                            : "text-parchment/65 hover:bg-white/6",
                        )}
                      >
                        <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{file.path}</span>
                        {drafts[file.path] !== undefined && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold-400" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="h-[420px]">
                  {current ? (
                    <CodeEditor
                      path={current.path}
                      language={current.language}
                      value={currentValue}
                      onChange={(next) => setDrafts((drafts) => ({ ...drafts, [current.path]: next }))}
                    />
                  ) : (
                    <EmptyState icon={FileCode2} title="No files" description="Generate an application first." />
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Preview */}
          <TabsContent value="preview">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-2.5">
                <span className="flex items-center gap-2 text-xs text-parchment/70">
                  <Eye className="h-3.5 w-3.5 text-gold-300" /> Live preview
                </span>
                <span className="text-[11px] text-parchment/45">
                  Sandboxed — scripts cannot reach this app
                </span>
              </div>
              <iframe
                title="Project preview"
                srcDoc={previewDoc}
                sandbox="allow-scripts allow-forms allow-modals"
                className="h-[560px] w-full bg-white"
              />
            </Card>
          </TabsContent>

          {/* Logs */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>
                  <ScrollText className="h-4 w-4 text-gold-300" /> Execution logs
                </CardTitle>
                <span className="text-xs text-parchment/50">{logs.length} entries</span>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <EmptyState icon={ScrollText} title="No logs yet" description="Logs appear as the crew works." />
                ) : (
                  <ul className="space-y-1.5 font-mono text-[11px]">
                    {logs.map((log) => (
                      <li key={log.id} className="flex items-start gap-2">
                        <span className="w-16 shrink-0 text-parchment/35">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                        <span
                          className={cn(
                            "w-16 shrink-0 uppercase",
                            log.level === "error"
                              ? "text-rose-300"
                              : log.level === "warn"
                                ? "text-amber-300"
                                : "text-sky-300",
                          )}
                        >
                          {log.source}
                        </span>
                        <span className="text-parchment/75">{log.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tests */}
          <TabsContent value="tests">
            <Card>
              <CardHeader>
                <CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-gold-300" /> Verification
                </CardTitle>
                <span className="text-xs text-parchment/50">
                  {passed}/{tests.length} passed
                </span>
              </CardHeader>
              <CardContent>
                {tests.length === 0 ? (
                  <EmptyState icon={CheckCircle2} title="No checks run yet" description="Build or modify the project to run verification." />
                ) : (
                  <ul className="space-y-2">
                    {tests.map((test) => (
                      <li key={test.id} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                        {test.status === "passed" ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-parchment">{test.name}</p>
                          {test.message && (
                            <p className="mt-0.5 text-[11px] text-parchment/50">{test.message}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-[10px] text-parchment/35">{test.duration_ms}ms</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deploy */}
          <TabsContent value="deploy">
            <Card>
              <CardHeader>
                <CardTitle>
                  <Rocket className="h-4 w-4 text-gold-300" /> Deployments
                </CardTitle>
                <Button size="sm" variant="secondary" onClick={() => setDeployOpen(true)}>
                  New deployment
                </Button>
              </CardHeader>
              <CardContent>
                {initialDeployments.length === 0 ? (
                  <EmptyState
                    icon={Rocket}
                    title="Never deployed"
                    description="Deployment requires explicit approval and a configured provider. Nothing is ever published silently."
                  />
                ) : (
                  <ul className="space-y-2">
                    {initialDeployments.map((deployment) => (
                      <li key={deployment.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-medium text-parchment">{deployment.provider}</span>
                          <Badge variant={deployment.status === "ready" ? "success" : deployment.status === "error" ? "danger" : "warning"}>
                            {deployment.status}
                          </Badge>
                        </div>
                        {deployment.logs && (
                          <p className="mt-2 whitespace-pre-wrap text-[11px] text-parchment/55">{deployment.logs}</p>
                        )}
                        {deployment.url && (
                          <a href={deployment.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] text-gold-200 hover:underline">
                            {deployment.url}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Assistant -------------------------------------------------------- */}
        <Card className="flex min-h-[520px] flex-col">
          <CardHeader>
            <CardTitle>Crew chat</CardTitle>
            <span className="text-[11px] text-parchment/45">Ask, or request a change</span>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <ChatPanel
              projectId={project.id}
              initialMessages={chatMessages}
              className="flex-1"
              compact
              emptyHint="Ask about this project, or request a change — “make the theme blue”, “add a contact form”."
            />
          </CardContent>
        </Card>
      </div>

      {/* Deploy dialog ----------------------------------------------------- */}
      <Dialog open={deployOpen} onOpenChange={setDeployOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy “{project.name}”?</DialogTitle>
            <DialogDescription>
              Deployment publishes your project to the outside world. It is an irreversible
              outward-facing action, so it needs your explicit approval.
            </DialogDescription>
          </DialogHeader>

          <label className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-parchment/75">
            <input
              type="checkbox"
              checked={approved}
              onChange={(event) => setApproved(event.target.checked)}
              className="mt-0.5"
            />
            I have reviewed the build and want to deploy it.
          </label>

          <p className="mt-3 flex items-start gap-2 text-[11px] text-amber-200/80">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            If no deployment provider is configured, nothing will be published and you will be told so.
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeployOpen(false)}>
              Cancel
            </Button>
            <Button onClick={deploy} disabled={!approved || deploying}>
              {deploying ? "Deploying…" : "Deploy"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-wide text-parchment/45">{label}</p>
      <p className="mt-1 text-sm font-semibold text-parchment">{value}</p>
    </div>
  );
}

function TaskIcon({ status }: { status: TaskRow["status"] }) {
  if (status === "done") return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />;
  if (status === "failed") return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />;
  return <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold-400/60" />;
}

/** Acceptance criteria derived from the project's own description. */
function acceptanceFor(project: ProjectRow): string[] {
  const base = [
    "Opening index.html renders the page with no console errors.",
    "The layout is responsive down to a 360px-wide phone.",
    "Keyboard focus is visible on every control and a skip link is present.",
  ];
  const description = (project.description ?? "").toLowerCase();
  const extra: string[] = [];
  if (description.includes("cart") || description.includes("shop")) extra.push("Adding items updates the cart and the total correctly.");
  if (description.includes("task") || description.includes("todo")) extra.push("A task can be added, completed and removed, and survives a reload.");
  if (description.includes("login") || description.includes("auth")) extra.push("Only signed-in users reach protected areas.");
  if (description.includes("chart") || description.includes("dashboard")) extra.push("Changing the data changes both the metrics and the bars.");
  return [...base, ...extra];
}
