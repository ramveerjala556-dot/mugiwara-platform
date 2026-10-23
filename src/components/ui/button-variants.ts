import { cva, type VariantProps } from "class-variance-authority";

/**
 * Button styles live in their own module (NOT marked "use client") so that
 * Server Components can build a link with button styling without importing
 * from a client module.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-900 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gold-400 text-midnight-950 shadow-[0_4px_18px_rgba(242,189,46,0.28)] hover:bg-gold-300",
        secondary:
          "bg-white/8 text-parchment backdrop-blur border border-white/10 hover:bg-white/14",
        outline: "border border-gold-400/40 text-gold-100 hover:bg-gold-400/10",
        ghost: "text-parchment/80 hover:bg-white/8 hover:text-parchment",
        destructive: "bg-red-500/90 text-white hover:bg-red-500",
        link: "text-gold-200 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
