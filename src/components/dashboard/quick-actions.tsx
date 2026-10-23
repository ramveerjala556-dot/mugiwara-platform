import Link from "next/link";
import { ArrowUpRight, BarChart3, Code2, FileText, Search, Settings2 } from "lucide-react";
import { Card } from "@/components/ui/card";

const ACTIONS = [
  { label: "Build", hint: "Website / App", href: "/workspace?mode=build", icon: Code2, tint: "from-sky-500/30" },
  { label: "Research", hint: "Find & Summarize", href: "/workspace?mode=research", icon: Search, tint: "from-violet-500/30" },
  { label: "Create", hint: "Docs / Slides", href: "/workspace?mode=write", icon: FileText, tint: "from-amber-500/30" },
  { label: "Analyze", hint: "Data / Insights", href: "/workspace?mode=analyze", icon: BarChart3, tint: "from-emerald-500/30" },
  { label: "Automate", hint: "Tasks / Workflows", href: "/automations", icon: Settings2, tint: "from-rose-500/30" },
] as const;

export function QuickActions() {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-parchment">
          <span className="text-gold-300">⚡</span> Quick Actions
        </h2>
        <Link href="/workspace" className="flex items-center gap-1 text-xs text-parchment/55 hover:text-gold-200">
          See all <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ACTIONS.map(({ label, hint, href, icon: Icon, tint }) => (
          <Link
            key={label}
            href={href}
            className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-3 transition-colors hover:border-gold-400/30"
          >
            <span className={`pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-gradient-to-br ${tint} to-transparent blur-xl`} aria-hidden />
            <span className="relative grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/6 text-gold-200">
              <Icon className="h-4 w-4" />
            </span>
            <span className="relative mt-2.5 block text-sm font-medium text-parchment">{label}</span>
            <span className="relative block text-[11px] text-parchment/50">{hint}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
