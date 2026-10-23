import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
  {
    variants: {
      variant: {
        default: "border-white/12 bg-white/8 text-parchment/80",
        gold: "border-gold-400/30 bg-gold-400/12 text-gold-200",
        success: "border-emerald-400/30 bg-emerald-400/12 text-emerald-300",
        warning: "border-amber-400/30 bg-amber-400/12 text-amber-300",
        danger: "border-red-400/30 bg-red-400/12 text-red-300",
        info: "border-sky-400/30 bg-sky-400/12 text-sky-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
