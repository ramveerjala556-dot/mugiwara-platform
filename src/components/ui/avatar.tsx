import * as React from "react";
import { cn } from "@/lib/utils";

export function Avatar({
  src,
  alt,
  fallback,
  className,
}: {
  src?: string | null;
  alt?: string;
  fallback?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-midnight-700 text-xs font-semibold text-parchment",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? ""} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{fallback ?? "?"}</span>
      )}
    </span>
  );
}
