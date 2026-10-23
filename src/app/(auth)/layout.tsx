import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { isSupabaseConfigured } from "@/lib/env";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ocean-sunset lg:block">
        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          <Logo />
          <div>
            <h1 className="font-display text-3xl font-semibold text-parchment">
              One Crew. One Goal.
            </h1>
            <p className="mt-3 max-w-sm text-sm text-parchment/75">
              Seven AI specialists ready to plan, design, build, test and ship your next idea.
            </p>
          </div>
          <p className="text-xs text-parchment/60">“Bigger Dreams Ahead” — Luffy</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link href="/">
              <Logo />
            </Link>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-6 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3.5 py-3 text-xs text-amber-200">
              Supabase isn&apos;t configured yet. Copy <code>.env.example</code> to{" "}
              <code>.env.local</code> and add your project URL and anon key, then restart the dev
              server.
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
