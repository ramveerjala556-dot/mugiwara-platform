"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, FolderKanban, Search, Sparkles } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { ProjectRow } from "@/types/database";

interface PaletteItem {
  id: string;
  label: string;
  hint: string;
  href: string;
  group: "Navigate" | "Projects" | "Actions";
  icon: typeof Search;
}

/**
 * ⌘K command palette. Searches navigation, the user's real projects (fetched
 * on open) and a few actions. Fully keyboard driven: ↑↓ to move, ⏎ to run, Esc
 * to close.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
      return;
    }
    inputRef.current?.focus();
    setLoading(true);
    fetch("/api/projects")
      .then((response) => (response.ok ? response.json() : { projects: [] }))
      .then((payload) => setProjects(payload.projects ?? []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const nav: PaletteItem[] = NAV_ITEMS.map((item) => ({
      id: `nav-${item.href}`,
      label: item.label,
      hint: item.description,
      href: item.href,
      group: "Navigate",
      icon: item.icon,
    }));

    const projectItems: PaletteItem[] = projects.map((project) => ({
      id: `project-${project.id}`,
      label: project.name,
      hint: `${project.status} · ${project.progress}%`,
      href: `/projects/${project.id}`,
      group: "Projects",
      icon: FolderKanban,
    }));

    const actions: PaletteItem[] = [
      {
        id: "action-new",
        label: "New build",
        hint: "Describe something to build",
        href: "/workspace",
        group: "Actions",
        icon: Sparkles,
      },
    ];

    const all = [...actions, ...projectItems, ...nav];
    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 12);
    return all
      .filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(q))
      .slice(0, 12);
  }, [projects, query]);

  const run = useCallback(
    (item: PaletteItem | undefined) => {
      if (!item) return;
      setOpen(false);
      router.push(item.href);
    },
    [router],
  );

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((index) => Math.min(index + 1, items.length - 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((index) => Math.max(index - 1, 0));
      }
      if (event.key === "Enter") {
        event.preventDefault();
        run(items[active]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, active, run]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-start justify-center bg-midnight-950/70 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/12 bg-midnight-900/97 shadow-glass"
          >
            <div className="flex items-center gap-3 border-b border-white/8 px-4">
              <Search className="h-4 w-4 text-parchment/40" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                placeholder="Search projects, pages or actions…"
                aria-label="Search"
                className="h-12 flex-1 bg-transparent text-sm text-parchment placeholder:text-parchment/40 focus:outline-none"
              />
              <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-parchment/40">
                Esc
              </kbd>
            </div>

            <ul className="max-h-80 overflow-y-auto p-2">
              {loading && (
                <li className="px-3 py-2 text-xs text-parchment/45">Loading projects…</li>
              )}
              {!loading && items.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-parchment/45">
                  Nothing matched “{query}”.
                </li>
              )}
              {items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => run(item)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        index === active ? "bg-gold-400/12" : "hover:bg-white/6",
                      )}
                    >
                      <Icon className={cn("h-4 w-4", index === active ? "text-gold-300" : "text-parchment/50")} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-parchment">{item.label}</span>
                        <span className="block truncate text-[11px] text-parchment/45">{item.hint}</span>
                      </span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-parchment/35">
                        {item.group}
                      </span>
                      {index === active && <CornerDownLeft className="h-3.5 w-3.5 text-parchment/40" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Small button that opens the palette — shown in the top bar on mobile. */
export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
        );
      }}
      className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-parchment/70 hover:text-parchment"
      aria-label="Open command palette"
    >
      <Search className="h-[18px] w-[18px]" />
    </button>
  );
}
