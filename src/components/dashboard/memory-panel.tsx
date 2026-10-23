import Link from "next/link";
import { Brain, CircleCheck, CircleDashed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { MemoryRow } from "@/types/database";

const KIND_DOT: Record<string, string> = {
  preference: "bg-sky-400",
  decision: "bg-amber-400",
  architecture: "bg-violet-400",
  fix: "bg-emerald-400",
  learning: "bg-cyan-400",
  open_task: "bg-rose-400",
};

/** Recent entries from the user's Memory Vault. */
export function MemoryPanel({ memories }: { memories: MemoryRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Brain className="h-4 w-4 text-gold-300" /> Memory Vault
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-parchment/50">{memories.length} item{memories.length === 1 ? "" : "s"}</span>
          <Link href="/memory" className="text-xs text-parchment/55 hover:text-gold-200">
            View all →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {memories.length === 0 ? (
          <EmptyState
            icon={Brain}
            title="Your vault is empty"
            description="As you build, MUGIWARA remembers preferences, decisions and verified fixes here."
          />
        ) : (
          <ul className="space-y-2.5">
            {memories.slice(0, 5).map((memory) => (
              <li key={memory.id} className="flex items-start gap-2.5">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${KIND_DOT[memory.kind] ?? "bg-white/40"}`} aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-parchment">{memory.title}</p>
                  <p className="truncate text-[11px] text-parchment/50">{memory.content}</p>
                </div>
                <span className="ml-auto shrink-0" title={memory.verified ? "Verified" : "Unverified"}>
                  {memory.verified ? (
                    <CircleCheck className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <CircleDashed className="h-3.5 w-3.5 text-parchment/35" />
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
