import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="font-display text-2xl font-semibold text-parchment">Welcome back, Captain</h1>
      <p className="mb-6 mt-1 text-sm text-parchment/60">Sign in to your crew.</p>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-white/5" />}>
        <AuthForm mode="login" />
      </Suspense>
    </>
  );
}
