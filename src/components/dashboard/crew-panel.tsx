import Link from "next/link";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CREW, CREW_ORDER } from "@/lib/agents/crew";

/**
 * The crew roster. Each specialist is shown with its real role; a live status
 * badge appears only when a run is actually in progress (passed in as a prop).
 */
export function CrewPanel({ activeAgents = [] }: { activeAgents?: string[] }) {
  const activeCount = activeAgents.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Users className="h-4 w-4 text-gold-300" /> Your AI Crew
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={activeCount > 0 ? "success" : "default"}>
            <span className={activeCount > 0 ? "animate-pulse-slow" : ""}>●</span>
            {activeCount > 0 ? `${activeCount} active` : "idle"}
          </Badge>
          <Link href="/crew" className="text-xs text-parchment/55 hover:text-gold-200">
            Manage →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CREW_ORDER.map((name) => {
            const agent = CREW[name];
            const active = activeAgents.includes(name);
            return (
              <li key={name} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-center">
                <span
                  className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-white/10 text-sm font-semibold text-midnight-950"
                  style={{ backgroundColor: agent.accent }}
                  aria-hidden
                >
                  {agent.label.charAt(0)}
                </span>
                <p className="mt-2 text-xs font-medium text-parchment">{agent.label}</p>
                <p className="text-[10px] text-parchment/50">{agent.tagline}</p>
                {active && (
                  <span className="mt-1 inline-block text-[10px] text-emerald-300">working…</span>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
