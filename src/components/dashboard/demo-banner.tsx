"use client";

import { useState } from "react";
import { FlaskConical, X } from "lucide-react";

/**
 * Demo Mode banner. Shown only when Supabase is not configured, so the user
 * always knows their data is local and will not survive a restart.
 */
export function DemoBanner() {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  return (
    <div className="mx-auto flex max-w-[1400px] items-start gap-3 px-4 pt-4 lg:px-6">
      <div className="flex flex-1 items-start gap-3 rounded-xl border border-sky-400/25 bg-sky-400/10 px-3.5 py-2.5 text-xs text-sky-100">
        <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          <strong className="font-semibold">Demo Mode.</strong> Supabase isn&apos;t configured, so
          projects and memories are kept in memory and reset when the server restarts. Add your
          Supabase keys to <code className="rounded bg-black/25 px-1">.env.local</code> for real
          persistence and accounts.
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setHidden(true)}
        className="mt-1 rounded-md p-1 text-sky-200/70 hover:bg-white/10 hover:text-sky-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
