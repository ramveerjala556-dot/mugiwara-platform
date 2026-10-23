import { cn } from "@/lib/utils";

/** Loading placeholder with a subtle shimmer. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-white/8",
        "after:absolute after:inset-0 after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent",
        className,
      )}
      {...props}
    />
  );
}
