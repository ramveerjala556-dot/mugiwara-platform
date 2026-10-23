"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export interface ChatMessageView {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent?: string | null;
}

const AGENT_LABEL: Record<string, string> = {
  navigator: "Navigator",
  architect: "Architect",
  designer: "Designer",
  researcher: "Researcher",
  coder: "Coder",
  tester: "Tester",
  guardian: "Guardian",
};

/**
 * The crew chat. Sends the user's prompt to /api/ai/chat, which may answer,
 * build a new application, or apply a change to an existing one. Results are
 * reported honestly and the page is refreshed when files change.
 */
export function ChatPanel({
  projectId,
  initialMessages = [],
  className,
  emptyHint = "Describe what you want to build — for example “a coffee shop website with a menu and cart”.",
  compact = false,
}: {
  projectId?: string;
  initialMessages?: ChatMessageView[];
  className?: string;
  emptyHint?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessageView[]>(initialMessages);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send() {
    const prompt = value.trim();
    if (prompt.length < 3 || busy) return;

    setValue("");
    setBusy(true);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: prompt },
    ]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, projectId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "The crew could not respond.");

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: payload.reply ?? "Done.",
          agent: payload.agent ?? null,
        },
      ]);

      if (payload.built) {
        toast({
          title: "Application built",
          description: `${payload.files?.length ?? 0} files generated and verified.`,
          variant: "success",
        });
      } else if (payload.modified) {
        toast({
          title: "Change applied",
          description: `Updated ${payload.files?.length ?? 0} files.`,
          variant: "success",
        });
      }

      if (payload.projectId) {
        if (payload.built && payload.projectId !== projectId) {
          router.push(`/projects/${payload.projectId}`);
        } else {
          router.refresh();
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      toast({ title: "Request failed", description: message, variant: "error" });
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", content: `⚠️ ${message}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 space-y-3 overflow-y-auto pr-1",
          compact ? "max-h-72" : "min-h-[240px]",
        )}
      >
        {messages.length === 0 && (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-gold-300">
              <Sparkles className="h-4 w-4" />
            </span>
            <p className="max-w-sm text-xs text-parchment/55">{emptyHint}</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[92%] rounded-2xl border px-3.5 py-2.5 text-xs leading-relaxed",
                  message.role === "user"
                    ? "border-gold-400/25 bg-gold-400/12 text-parchment"
                    : "border-white/10 bg-white/[0.05] text-parchment/85",
                )}
              >
                {message.role === "assistant" && message.agent && (
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-gold-300/80">
                    {AGENT_LABEL[message.agent] ?? message.agent}
                  </p>
                )}
                <div className="whitespace-pre-wrap">{renderInline(message.content)}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {busy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs text-parchment/50"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            The crew is working…
          </motion.div>
        )}
      </div>

      <div className="mt-3 flex items-end gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          rows={compact ? 1 : 2}
          placeholder="Ask the crew, or describe a change…"
          aria-label="Message the crew"
          className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-1.5 py-1.5 text-xs text-parchment placeholder:text-parchment/40 focus:outline-none"
        />
        <Button size="icon" aria-label="Send" onClick={send} disabled={busy || value.trim().length < 3}>
          <CornerDownLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** Very small subset of markdown: **bold** and `code`, plus line breaks. */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-parchment">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded bg-black/30 px-1 py-0.5 font-mono text-[11px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
