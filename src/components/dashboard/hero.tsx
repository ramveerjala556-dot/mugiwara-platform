"use client";

import { useEffect, useState } from "react";
import { greeting } from "@/lib/utils";

/**
 * Hero banner: "Good evening, Captain" over an ocean-sunset gradient. The
 * greeting is computed on the client so it always matches the visitor's clock.
 */
export function Hero({ name }: { name: string }) {
  const [hello, setHello] = useState("Welcome");
  useEffect(() => setHello(greeting()), []);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-ocean-sunset p-6 sm:p-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(1200px 300px at 15% -10%, rgba(255,220,150,0.35), transparent 60%), radial-gradient(600px 200px at 90% 10%, rgba(120,190,255,0.25), transparent 60%)",
        }}
        aria-hidden
      />
      <div className="relative max-w-2xl">
        <p className="text-sm text-parchment/80">
          {hello},
        </p>
        <h1 className="mt-0.5 font-display text-3xl font-semibold text-parchment sm:text-4xl">
          {name} <span aria-hidden>👒</span>
        </h1>
        <p className="mt-2 text-sm text-parchment/75">
          Turn your ideas into reality with your AI crew.
        </p>
      </div>
      <div className="relative mt-6 flex items-center gap-3 text-xs text-parchment/60">
        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
          “Bigger Dreams Ahead” — Luffy
        </span>
      </div>
    </section>
  );
}
