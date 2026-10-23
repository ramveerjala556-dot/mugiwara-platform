import { Check, CircleDashed, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type FlowStep = "plan" | "execute" | "verify" | "done";

const STEPS: { id: FlowStep; label: string; icon: typeof Sparkles }[] = [
  { id: "plan", label: "Plan", icon: Sparkles },
  { id: "execute", label: "Execute", icon: Loader2 },
  { id: "verify", label: "Verify", icon: ShieldCheck },
  { id: "done", label: "Done", icon: Check },
];

/** Visualises the real pipeline stage of the most recent run. */
export function TaskFlow({ current = "plan" }: { current?: FlowStep }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="text-gold-300">◎</span> AI Task Flow
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex items-center justify-between gap-1">
          {STEPS.map((step, index) => {
            const state = index < currentIndex ? "done" : index === currentIndex ? "active" : "todo";
            const Icon = state === "done" ? Check : step.icon;
            return (
              <li key={step.id} className="flex flex-1 items-center gap-1">
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-full border",
                      state === "done" && "border-emerald-400/40 bg-emerald-400/15 text-emerald-300",
                      state === "active" && "border-gold-400/50 bg-gold-400/15 text-gold-200",
                      state === "todo" && "border-white/10 bg-white/5 text-parchment/40",
                    )}
                  >
                    <Icon className={cn("h-4 w-4", state === "active" && step.id === "execute" && "animate-spin")} />
                  </span>
                  <span className={cn("text-[11px]", state === "todo" ? "text-parchment/40" : "text-parchment/75")}>
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <span
                    className={cn("mb-5 h-px flex-1", index < currentIndex ? "bg-emerald-400/40" : "bg-white/10")}
                    aria-hidden
                  />
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-4 flex items-center gap-1.5 text-[11px] italic text-parchment/50">
          <CircleDashed className="h-3 w-3" />
          “From idea to execution, your crew has your back.”
        </p>
      </CardContent>
    </Card>
  );
}
