"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Mode = "login" | "signup" | "reset" | "update";

const COPY: Record<Mode, { title: string; subtitle: string; cta: string }> = {
  login: { title: "Welcome back, Captain", subtitle: "Sign in to your crew.", cta: "Sign in" },
  signup: { title: "Join the crew", subtitle: "Create your MUGIWARA account.", cta: "Create account" },
  reset: { title: "Reset your password", subtitle: "We'll email you a secure reset link.", cta: "Send reset link" },
  update: { title: "Set a new password", subtitle: "Choose a strong password.", cta: "Update password" },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = COPY[mode];

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        setMessage("Check your inbox to confirm your email, then sign in.");
        return;
      }

      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
        });
        if (error) throw error;
        setMessage("If that email exists, a reset link is on its way.");
        return;
      }

      if (mode === "update") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage("Password updated. Redirecting…");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      {mode !== "reset" && (
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
          {message}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Working…" : copy.cta}
      </Button>

      <div className="flex justify-between text-xs text-parchment/55">
        {mode === "login" && (
          <>
            <Link href="/forgot-password" className="hover:text-gold-200">Forgot password?</Link>
            <Link href="/signup" className="hover:text-gold-200">Create an account</Link>
          </>
        )}
        {mode === "signup" && (
          <Link href="/login" className="hover:text-gold-200">Already have an account?</Link>
        )}
        {mode === "reset" && (
          <Link href="/login" className="hover:text-gold-200">Back to sign in</Link>
        )}
      </div>
    </form>
  );
}
