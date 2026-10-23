"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowRight, BookOpen, Globe, Paperclip, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The primary prompt box. Submitting sends the prompt to the real
 * prompt-to-application API and routes the user to the created project
 * workspace. Errors are surfaced honestly — no fake success.
 */
export function PromptComposer({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"build" | "research" | "analyze" | "write" | "automate">("build");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function submit() {
    const prompt = value.trim();
    if (prompt.length < 3 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, projectId, mode }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Request failed.");
      if (payload.projectId) {
        router.push(`/projects/${payload.projectId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-glass backdrop-blur-md">
      <div className="flex items-start gap-3 px-2 pt-1">
        <Sparkles className="mt-1 h-5 w-5 shrink-0 text-gold-300" />
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          rows={2}
          placeholder="What do you want to build today?"
          aria-label="Describe what you want to build"
          className="min-h-[48px] w-full resize-none bg-transparent text-[15px] text-parchment placeholder:text-parchment/45 focus:outline-none"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ModeChip active={mode === "build"} onClick={() => setMode("build")} icon={Sparkles} label="Build App" />
        <ModeChip active={mode === "research"} onClick={() => setMode("research")} icon={Globe} label="Research" />
        <ModeChip active={mode === "analyze"} onClick={() => setMode("analyze")} icon={BookOpen} label="Analyze" />
        <ModeChip active={mode === "write"} onClick={() => setMode("write")} icon={Paperclip} label="Write" />
        <ModeChip active={mode === "automate"} onClick={() => setMode("automate")} icon={Globe} label="Automate" />

        <div className="ml-auto flex items-center gap-2">
          {error && <span className="text-xs text-red-300">{error}</span>}
          <Button
            type="button"
            size="icon"
            aria-label="Send prompt"
            disabled={busy || value.trim().length < 3}
            onClick={submit}
          >
            <ArrowRight className={cn("h-4 w-4", busy && "animate-pulse")} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModeChip({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Sparkles;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
        active
          ? "border-gold-400/40 bg-gold-400/12 text-gold-100"
          : "border-white/10 bg-white/[0.04] text-parchment/65 hover:text-parchment",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
