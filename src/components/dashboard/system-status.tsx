import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface SystemCheck {
  label: string;
  ok: boolean;
  detail: string;
}

/**
 * Honest system status. Each row reflects a real configuration check performed
 * server-side — nothing is reported "Healthy" unless it genuinely is.
 */
export function SystemStatus({ checks }: { checks: SystemCheck[] }) {
  const allOk = checks.every((c) => c.ok);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <ShieldCheck className="h-4 w-4 text-gold-300" /> System Status
        </CardTitle>
        <Badge variant={allOk ? "success" : "warning"}>{allOk ? "Healthy" : "Attention"}</Badge>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {checks.map((check) => (
            <li key={check.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 text-parchment/75">
                <span className={`h-1.5 w-1.5 rounded-full ${check.ok ? "bg-emerald-400" : "bg-amber-400"}`} aria-hidden />
                {check.label}
              </span>
              <span className="text-parchment/45">{check.detail}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
