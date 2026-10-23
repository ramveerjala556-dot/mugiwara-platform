import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo } from "@/lib/utils";
import type { ExecutionLogRow } from "@/types/database";

const LEVEL_DOT: Record<string, string> = {
  info: "bg-sky-400",
  debug: "bg-white/40",
  warn: "bg-amber-400",
  error: "bg-rose-400",
};

/** Live activity feed built from real execution logs. */
export function ActivityPanel({ logs }: { logs: ExecutionLogRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Activity className="h-4 w-4 text-gold-300" /> Live Activity
        </CardTitle>
        <Badge variant={logs.length > 0 ? "success" : "default"}>
          {logs.length > 0 ? "recent" : "idle"}
        </Badge>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Run a prompt and the crew's real steps will stream here."
          />
        ) : (
          <ol className="relative space-y-3 pl-4">
            <span className="absolute left-[3px] top-1.5 bottom-1.5 w-px bg-white/10" aria-hidden />
            {logs.slice(0, 6).map((log) => (
              <li key={log.id} className="relative flex items-start justify-between gap-3">
                <span className={`absolute -left-4 top-1.5 h-1.5 w-1.5 rounded-full ${LEVEL_DOT[log.level] ?? "bg-white/40"}`} aria-hidden />
                <span className="text-xs text-parchment/80">{log.message}</span>
                <span className="shrink-0 text-[10px] text-parchment/40">{timeAgo(log.created_at)}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
