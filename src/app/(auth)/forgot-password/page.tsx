import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-display text-2xl font-semibold text-parchment">Reset your password</h1>
      <p className="mb-6 mt-1 text-sm text-parchment/60">
        Enter your email and we&apos;ll send a secure reset link.
      </p>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-white/5" />}>
        <AuthForm mode="reset" />
      </Suspense>
    </>
  );
}
