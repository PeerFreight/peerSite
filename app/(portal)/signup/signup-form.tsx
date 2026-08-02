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

function SignupFormInner({ providers }: { providers: SocialProviderFlags }) {
  const router = useRouter();
  const params = useSearchParams();
  // Teammate-invitation entry: /signup?invite=<id>&email=<invited email>.
  // The invited email is admitted by the signup hook while the invitation
  // is pending, and the accept page finishes the join after signup.
  const inviteId = params.get("invite");
  const oauthError = oauthErrorMessage(params.get("error"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const afterSignup = inviteId ? `/invite/${inviteId}` : "/onboarding";

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.signUp.email({ name, email, password });
    setBusy(false);
    if (error) setError(error.message ?? "Signup failed.");
    else router.push(afterSignup);
  }

  return (
    <AuthShell
      footer={
        <>
          Already set up?{" "}
          <a className="font-bold text-gold-soft hover:text-white" href="/login">
            Sign in
          </a>
        </>
      }
    >
      <CardTitle className="text-2xl">Create your account</CardTitle>
      <CardDescription>
        {inviteId
          ? "You were invited to join a team on Peer Freight. Create your account with the invited email to continue."
          : "Signup is invite-only right now. If we have not set your email up yet, email team@peer-freight.com first."}
      </CardDescription>
      <SocialSignIn providers={providers} callbackURL={afterSignup} errorCallbackURL="/signup" />
      <form onSubmit={signUp} className="mt-6 space-y-4">
        <Field label="Your name" htmlFor="name">
          <Input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Work email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters.">
          <PasswordInput id="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error ?? oauthError ? <p className="text-sm text-red-700">{error ?? oauthError}</p> : null}
        <Button type="submit" disabled={busy}>Create account</Button>
      </form>
    </AuthShell>
  );
}

export function SignupForm({ providers }: { providers: SocialProviderFlags }) {
  return (
    <Suspense>
      <SignupFormInner providers={providers} />
    </Suspense>
  );
}
