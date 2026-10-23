import type { LucideIcon } from "lucide-react";

export function PageHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-2.5 font-display text-2xl font-semibold text-parchment">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-gold-300">
            <Icon className="h-4.5 w-4.5" />
          </span>
          {title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-parchment/60">{description}</p>
      </div>
      {action}
    </div>
  );
}
