import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="font-display text-2xl font-semibold text-parchment">Join the crew</h1>
      <p className="mb-6 mt-1 text-sm text-parchment/60">Create your MUGIWARA account.</p>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-white/5" />}>
        <AuthForm mode="signup" />
      </Suspense>
    </>
  );
}
