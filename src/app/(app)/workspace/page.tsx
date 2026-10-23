import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PIPELINE_STAGES } from "@/lib/engine/pipeline";
import { PageHeader } from "@/components/layout/page-header";
import { PromptComposer } from "@/components/dashboard/prompt-composer";
import { Card, CardContent } from "@/components/ui/card";
import { CrewPanel } from "@/components/dashboard/crew-panel";

export const metadata: Metadata = { title: "Workspace" };

export default async function WorkspacePage() {
  await requireUser();

  return (
    <div>
      <PageHeader
        icon={Sparkles}
        title="AI Workspace"
        description="Describe what you want to build. Your crew plans it, designs it, writes it, tests it and reports every real step."
      />

      <PromptComposer />

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-5">
            <h2 className="mb-4 text-sm font-semibold text-parchment">Prompt-to-Application pipeline</h2>
            <ol className="space-y-3">
              {PIPELINE_STAGES.map((stage, index) => (
                <li key={stage.id} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/12 bg-white/5 text-[11px] text-parchment/60">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-parchment">{stage.label}</p>
                    <p className="text-[11px] text-parchment/50">{stage.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <CrewPanel />
      </div>
    </div>
  );
}
