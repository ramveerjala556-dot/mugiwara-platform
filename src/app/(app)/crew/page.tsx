import type { Metadata } from "next";
import { Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { CREW, CREW_ORDER } from "@/lib/agents/crew";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Crew" };

export default async function CrewPage() {
  await requireUser();

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Your AI Crew"
        description="Seven specialists that share models but carry their own instructions and tool permissions. Each one owns a distinct part of the build."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CREW_ORDER.map((name, index) => {
          const agent = CREW[name];
          return (
            <Card key={name} className="p-5">
              <div className="flex items-start gap-3">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-base font-semibold text-midnight-950"
                  style={{ backgroundColor: agent.accent }}
                  aria-hidden
                >
                  {agent.label.charAt(0)}
                </span>
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-parchment">
                    {agent.label}
                    <span className="text-[10px] font-normal text-parchment/40">#{index + 1}</span>
                  </h2>
                  <p className="text-[11px] text-parchment/50">{agent.tagline}</p>
                </div>
              </div>

              <p className="mt-3 line-clamp-4 text-xs leading-relaxed text-parchment/65">
                {agent.systemPrompt}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {agent.tools.map((tool) => (
                  <Badge key={tool} variant="gold">
                    {tool.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-5">
        <CardContent className="pt-5">
          <h2 className="text-sm font-semibold text-parchment">How they work together</h2>
          <p className="mt-2 text-xs leading-relaxed text-parchment/65">
            The <strong className="text-parchment">Navigator</strong> turns your request into a
            dependency-aware plan. <strong className="text-parchment">Architect</strong> and{" "}
            <strong className="text-parchment">Designer</strong> settle the structure and interface,{" "}
            <strong className="text-parchment">Researcher</strong> pulls in documentation, and{" "}
            <strong className="text-parchment">Coder</strong> writes the files.{" "}
            <strong className="text-parchment">Tester</strong> then runs real verification and{" "}
            <strong className="text-parchment">Guardian</strong> reviews for security. The
            orchestrator enforces concurrency limits, bounded retries, a wall-clock timeout and a
            hard cost ceiling — so a run can never spiral.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
