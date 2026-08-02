"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { SocialProviderFlags } from "@/lib/auth";
import { AuthShell } from "@/components/portal/auth-shell";
import { SocialSignIn, oauthErrorMessage } from "@/components/portal/social-sign-in";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";

function LoginFormInner({ providers }: { providers: SocialProviderFlags }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const oauthError = oauthErrorMessage(params.get("error"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (error) setError(error.message ?? "Sign-in failed.");
    else router.push(next);
  }

  async function sendMagicLink() {
    if (!email) {
      setError("Enter your email first, then request the link.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.magicLink({ email, callbackURL: next });
    setBusy(false);
    if (error) setError(error.message ?? "Could not send the link.");
    else setNotice("Check your email for a sign-in link.");
  }

  return (
    <AuthShell
      footer={
        <>
          New here?{" "}
          <a className="font-bold text-gold-soft hover:text-white" href="/signup">
            Create an account
          </a>
        </>
      }
    >
      <CardTitle className="text-2xl">Sign in</CardTitle>
      <CardDescription>The shipper portal is invite-only while we finish setup.</CardDescription>
      <SocialSignIn providers={providers} callbackURL={next} errorCallbackURL="/login" />
      <form onSubmit={signIn} className="mt-6 space-y-4">
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error ?? oauthError ? <p className="text-sm text-red-700">{error ?? oauthError}</p> : null}
        {notice ? <p className="text-sm text-green-800">{notice}</p> : null}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy}>Sign in</Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={sendMagicLink}>
            Email me a link
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}

export function LoginForm({ providers }: { providers: SocialProviderFlags }) {
  return (
    <Suspense>
      <LoginFormInner providers={providers} />
    </Suspense>
  );
}
