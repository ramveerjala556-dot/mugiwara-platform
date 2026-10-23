import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Weekly run counts. Renders the REAL numbers passed in — when there is no
 * history yet it shows a flat baseline rather than a flattering fake trend.
 */
export function Productivity({ weeklyRuns }: { weeklyRuns: { day: string; value: number }[] }) {
  const max = Math.max(1, ...weeklyRuns.map((d) => d.value));
  const total = weeklyRuns.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <TrendingUp className="h-4 w-4 text-gold-300" /> Productivity
        </CardTitle>
        <span className="text-[11px] text-parchment/50">agent runs this week</span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-parchment">
          {total}
          <span className="ml-2 align-middle text-[11px] font-normal text-parchment/50">
            {total === 0 ? "no runs yet" : "runs"}
          </span>
        </p>
        <div className="mt-4 flex h-24 items-end gap-2">
          {weeklyRuns.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-gold-600/60 to-gold-300/80"
                style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }}
                title={`${d.value} runs on ${d.day}`}
              />
              <span className="text-[10px] text-parchment/45">{d.day}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
