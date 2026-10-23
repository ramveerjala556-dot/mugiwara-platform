import Link from "next/link";
import { ArrowRight, Brain, Code2, ShieldCheck, Sparkles, Users, Workflow } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: Users, title: "A crew, not a chatbot", body: "Seven specialists — Navigator, Architect, Designer, Researcher, Coder, Tester, Guardian — plan and build together." },
  { icon: Code2, title: "Prompt to application", body: "Generate real frontend and backend files, migrations and environment templates from one prompt." },
  { icon: ShieldCheck, title: "Guardian-reviewed", body: "Security review, RLS-backed data isolation, and approval gates before anything destructive runs." },
  { icon: Brain, title: "Memory Vault", body: "Preferences, decisions and verified fixes are remembered and reused on your next prompt." },
  { icon: Workflow, title: "Real verification", body: "Lint, typecheck, build and tests run in an isolated sandbox — results are reported honestly." },
  { icon: Sparkles, title: "Iterate by chat", body: "Change the theme, add search, fix the login error — all through follow-up prompts with rollback." },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-parchment/70 hover:text-parchment">
            Sign in
          </Link>
          <Link href="/signup" className={cn(buttonVariants(), "h-9 px-4")}>
            Get started
          </Link>
        </nav>
      </header>

      <section className="mt-16 max-w-3xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-gold-400/25 bg-gold-400/10 px-3 py-1 text-xs text-gold-200">
          <Sparkles className="h-3.5 w-3.5" /> AI Software Creation Platform
        </p>
        <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-parchment sm:text-5xl">
          Turn ideas into reality with your AI crew.
        </h1>
        <p className="mt-4 text-balance text-parchment/70">
          Describe what you want to build. MUGIWARA&apos;s crew plans it, designs it, writes it,
          tests it and ships it — reporting every real step along the way.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className={cn(buttonVariants(), "flex items-center gap-2")}>
            Start building <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "secondary" }))}>
            I already have an account
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/6 text-gold-200">
              <Icon className="h-4 w-4" />
            </span>
            <h2 className="mt-3 text-sm font-semibold text-parchment">{title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-parchment/60">{body}</p>
          </div>
        ))}
      </section>

      <footer className="mt-16 flex flex-col items-center gap-2 border-t border-white/8 py-8 text-center">
        <p className="font-display text-sm text-gold-200">One Crew. One Goal.</p>
        <p className="text-xs text-parchment/40">
          Built with Next.js, TypeScript, Tailwind CSS and Supabase.
        </p>
      </footer>
    </main>
  );
}
