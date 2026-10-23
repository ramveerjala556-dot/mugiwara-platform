"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg border border-white/10 bg-midnight-900/80 p-2 text-parchment backdrop-blur lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-midnight-950/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/8 bg-midnight-950/95 px-3 py-5 backdrop-blur-xl transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-2">
          <Logo />
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-parchment/60 hover:bg-white/10 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-gold-400/15 text-gold-100 shadow-[inset_0_0_0_1px_rgba(242,189,46,0.2)]"
                    : "text-parchment/65 hover:bg-white/6 hover:text-parchment",
                )}
              >
                <Icon className={cn("h-[18px] w-[18px]", active && "text-gold-300")} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="text-[11px] uppercase tracking-wider text-parchment/40">Crew motto</p>
          <p className="mt-1 font-display text-sm text-gold-200">One Crew. One Goal.</p>
        </div>
      </aside>
    </>
  );
}
