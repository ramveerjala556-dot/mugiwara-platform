import { cn } from "@/lib/utils";

/**
 * MUGIWARA wordmark. Uses a stylised skull-in-straw-hat glyph drawn inline as
 * SVG so the mark is original and carries no third-party artwork licensing.
 */
export function Logo({ className, showTagline = true }: { className?: string; showTagline?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="relative grid h-9 w-9 place-items-center rounded-lg bg-gold-sheen text-midnight-950 shadow-glow">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="currentColor">
          {/* straw hat */}
          <path d="M3.2 10.4c0-1 3.9-2.6 8.8-2.6s8.8 1.6 8.8 2.6c0 .5-1 .9-2.6 1.2-.2 1.4-1.6 2.4-3.2 2.4H9.8c-1.6 0-3-1-3.2-2.4-1.6-.3-2.6-.7-2.6-1.2Z" />
          {/* skull */}
          <path d="M8.2 13.6h7.6c.9 1 .2 2.4-.7 2.4h-.5v1.1c0 .6-.5 1-1 1h-.9v-.9h-.6v.9H9.4c-.6 0-1-.4-1-1v-1.1H7.9c-.9 0-1.6-1.4-.7-2.4Z" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg font-semibold tracking-wide text-parchment">
          Mugiwara
        </span>
        {showTagline && (
          <span className="block text-[10px] uppercase tracking-[0.18em] text-gold-300/70">
            Your Crew. Your Goals.
          </span>
        )}
      </span>
    </span>
  );
}
