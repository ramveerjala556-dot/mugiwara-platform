import type { Metadata } from "next";
import { Puzzle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { configuredProviders } from "@/lib/ai";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Skills" };

/**
 * The platform's built-in capabilities. Each entry describes what it does, the
 * inputs it expects, the permissions it needs and its limits — the same
 * contract a user-defined skill would have.
 */
const SKILLS = [
  {
    name: "Generate static site",
    description: "Turn a prompt into a dependency-free, responsive website (HTML, CSS, JS).",
    inputs: ["prompt"],
    outputs: ["index.html", "styles.css", "app.js", "README.md"],
    permissions: ["write:files"],
    limits: "8k output tokens per run",
    requires: "always available",
  },
  {
    name: "AI-assisted generation",
    description: "Use a configured model to produce richer, prompt-specific code.",
    inputs: ["prompt", "existing files"],
    outputs: ["files"],
    permissions: ["provider:call"],
    limits: "bounded by AI_MAX_RUN_COST_USD",
    requires: "an AI provider key",
  },
  {
    name: "Verify output",
    description: "Parse the generated HTML/CSS/JS and report real pass/fail results.",
    inputs: ["files"],
    outputs: ["test results"],
    permissions: ["read:files"],
    limits: "in-process, no execution",
    requires: "always available",
  },
  {
    name: "Security review",
    description: "Scan generated files for secrets, external script loads and eval().",
    inputs: ["files"],
    outputs: ["guardian findings"],
    permissions: ["read:files"],
    limits: "pattern-based",
    requires: "always available",
  },
  {
    name: "Memory retrieval",
    description: "Surface relevant vault entries as untrusted context for a prompt.",
    inputs: ["prompt"],
    outputs: ["memory block"],
    permissions: ["read:memories"],
    limits: "keyword ranking, top 6",
    requires: "always available",
  },
  {
    name: "Isolated execution",
    description: "Build, test and preview generated code in a throwaway sandbox.",
    inputs: ["files"],
    outputs: ["logs", "preview url"],
    permissions: ["execute:untrusted"],
    limits: "wall-clock and memory capped",
    requires: "EXECUTION_PROVIDER configured",
  },
  {
    name: "Deploy",
    description: "Publish a project to a hosting provider after explicit approval.",
    inputs: ["projectId"],
    outputs: ["deployment url"],
    permissions: ["deploy:external"],
    limits: "approval required every time",
    requires: "DEPLOY_PROVIDER configured",
  },
];

export default async function SkillsPage() {
  await requireUser();
  const providers = configuredProviders();

  return (
    <div>
      <PageHeader
        icon={Puzzle}
        title="Skills"
        description="Reusable capabilities with defined inputs, outputs, permissions and limits. Availability reflects your current configuration."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SKILLS.map((skill) => {
          const available =
            skill.requires === "always available"
              ? true
              : skill.requires.includes("AI provider")
                ? providers.length > 0
                : false;

          return (
            <Card key={skill.name} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-parchment">{skill.name}</h2>
                <Badge variant={available ? "success" : "default"}>
                  {available ? "available" : "needs setup"}
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-parchment/65">{skill.description}</p>

              <dl className="mt-3 space-y-1.5 text-[11px]">
                <Row label="Inputs" value={skill.inputs.join(", ")} />
                <Row label="Outputs" value={skill.outputs.join(", ")} />
                <Row label="Permissions" value={skill.permissions.join(", ")} />
                <Row label="Limits" value={skill.limits} />
              </dl>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-parchment/40">{label}</dt>
      <dd className="min-w-0 flex-1 font-mono text-parchment/70">{value}</dd>
    </div>
  );
}
