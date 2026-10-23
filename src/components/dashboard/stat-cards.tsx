import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface Stat {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}

/** Compact KPI row. Values come from real queries only. */
export function StatCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map(({ label, value, hint, icon: Icon }) => (
        <Card key={label} className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wide text-parchment/50">{label}</span>
            <Icon className="h-4 w-4 text-gold-300" />
          </div>
          <p className="mt-2 text-xl font-semibold text-parchment">{value}</p>
          {hint && <p className="text-[11px] text-parchment/45">{hint}</p>}
        </Card>
      ))}
    </div>
  );
}
