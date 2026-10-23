import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Honest empty state. MUGIWARA never shows fake data, so when there is nothing
 * real to display we say so and point at the next action.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-10 text-center", className)}>
      <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-gold-300">
        <Icon className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-parchment">{title}</p>
        <p className="mx-auto max-w-sm text-xs text-parchment/55">{description}</p>
      </div>
      {action}
    </div>
  );
}
