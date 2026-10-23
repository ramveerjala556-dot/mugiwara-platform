import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Set a new password" };

export default function UpdatePasswordPage() {
  return (
    <>
      <h1 className="font-display text-2xl font-semibold text-parchment">Set a new password</h1>
      <p className="mb-6 mt-1 text-sm text-parchment/60">Choose a strong password you don&apos;t reuse.</p>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-white/5" />}>
        <AuthForm mode="update" />
      </Suspense>
    </>
  );
}
