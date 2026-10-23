"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, LogOut, Search, Settings, User } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar({
  email,
  fullName,
  avatarUrl,
}: {
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
}) {
  const [query, setQuery] = useState("");
  const displayName = fullName || email?.split("@")[0] || "Captain";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/8 bg-midnight-950/70 px-4 pl-14 backdrop-blur-xl lg:px-6 lg:pl-6">
      <form
        action="/projects"
        className="relative flex-1 max-w-2xl"
        onSubmit={(e) => {
          // Real navigation to the projects search — no fake results.
          if (!query.trim()) e.preventDefault();
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment/40" />
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects, tasks, or ask Mugiwara AI…"
          aria-label="Search"
          className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.05] pl-9 pr-16 text-sm text-parchment placeholder:text-parchment/40 backdrop-blur focus-visible:border-gold-400/50 focus-visible:outline-none"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-parchment/40 sm:block">
          ⌘ K
        </kbd>
      </form>

      <button
        type="button"
        aria-label="Notifications"
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-parchment/70 hover:text-parchment"
      >
        <Bell className="h-[18px] w-[18px]" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.05] px-2 py-1.5 text-left hover:bg-white/8"
          >
            <Avatar src={avatarUrl} fallback={displayName.charAt(0).toUpperCase()} />
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-medium text-parchment">{displayName}</span>
              <span className="block text-[11px] text-parchment/50">Student · Builder · Dreamer</span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{email ?? "Signed in"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <User className="h-4 w-4" /> Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4" /> Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <form action="/auth/signout" method="post" className="w-full">
              <button type="submit" className="flex w-full items-center gap-2 text-left">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
