"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brain, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { cn, timeAgo } from "@/lib/utils";
import type { MemoryRow } from "@/types/database";

const KINDS = ["preference", "decision", "architecture", "fix", "learning", "open_task"] as const;

const KIND_DOT: Record<string, string> = {
  preference: "bg-sky-400",
  decision: "bg-amber-400",
  architecture: "bg-violet-400",
  fix: "bg-emerald-400",
  learning: "bg-cyan-400",
  open_task: "bg-rose-400",
};

export function MemoryManager({ memories }: { memories: MemoryRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("learning");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = memories.filter((memory) =>
    `${memory.title} ${memory.content} ${memory.tags.join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  async function add() {
    if (!title.trim() || !content.trim() || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/memory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, title, content, verified: false, tags: [] }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not save.");
      setTitle("");
      setContent("");
      toast({ title: "Remembered", description: title, variant: "success" });
      router.refresh();
    } catch (error) {
      toast({
        title: "Not saved",
        description: error instanceof Error ? error.message : "Unknown error.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/memory?id=${id}`, { method: "DELETE" });
    if (response.ok) {
      toast({ title: "Memory deleted", variant: "info" });
      router.refresh();
    } else {
      toast({ title: "Delete failed", variant: "error" });
    }
  }

  async function toggle(memory: MemoryRow) {
    const response = await fetch("/api/memory", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: memory.id, enabled: !memory.enabled }),
    });
    if (response.ok) router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-glass backdrop-blur-md">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-parchment">
          <Plus className="h-4 w-4 text-gold-300" /> Add a memory
        </h2>
        <p className="mt-1 text-[11px] text-parchment/50">
          Preferences, decisions and verified fixes the crew should reuse. Secrets are refused.
        </p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="memory-kind">Kind</Label>
            <select
              id="memory-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as (typeof KINDS)[number])}
              className="h-11 w-full rounded-lg border border-white/12 bg-white/[0.05] px-3 text-sm text-parchment focus-visible:border-gold-400/60 focus-visible:outline-none"
            >
              {KINDS.map((value) => (
                <option key={value} value={value} className="bg-midnight-900">
                  {value.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="memory-title">Title</Label>
            <Input
              id="memory-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Tech stack preference"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="memory-content">Detail</Label>
            <Textarea
              id="memory-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="React + Supabase, Tailwind for styling."
            />
          </div>
          <Button onClick={add} disabled={busy || !title.trim() || !content.trim()} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {busy ? "Saving…" : "Remember this"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-glass backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-parchment">
            <Brain className="h-4 w-4 text-gold-300" /> Vault
          </h2>
          <span className="text-[11px] text-parchment/50">{filtered.length} shown</span>
        </div>

        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search memories…"
          aria-label="Search memories"
          className="mt-3"
        />

        <div className="mt-4 space-y-2.5">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Brain}
              title={query ? "Nothing matched" : "Your vault is empty"}
              description={
                query
                  ? "Try a different search term."
                  : "Add your first memory and the crew will reuse it on future prompts."
              }
            />
          ) : (
            filtered.map((memory) => (
              <div
                key={memory.id}
                className={cn(
                  "rounded-xl border border-white/8 bg-white/[0.03] p-3.5",
                  !memory.enabled && "opacity-50",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${KIND_DOT[memory.kind] ?? "bg-white/40"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-parchment">{memory.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-parchment/60">{memory.content}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant="gold">{memory.kind.replace("_", " ")}</Badge>
                      <Badge variant={memory.verified ? "success" : "default"}>
                        {memory.verified ? "verified" : "unverified"}
                      </Badge>
                      <span className="text-[10px] text-parchment/35">{timeAgo(memory.updated_at)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggle(memory)}
                      className="rounded-md px-2 py-1 text-[10px] text-parchment/55 hover:bg-white/10 hover:text-parchment"
                    >
                      {memory.enabled ? "disable" : "enable"}
                    </button>
                    <button
                      type="button"
                      aria-label="Delete memory"
                      onClick={() => remove(memory.id)}
                      className="rounded-md p-1.5 text-parchment/45 hover:bg-red-500/15 hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
