"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { SocialProviderFlags } from "@/lib/auth";
import { AuthShell } from "@/components/portal/auth-shell";
import { SocialSignIn, oauthErrorMessage } from "@/components/portal/social-sign-in";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";

function SignupFormInner({ providers }: { providers: SocialProviderFlags }) {
  const router = useRouter();
  const params = useSearchParams();
  // Teammate-invitation entry: /signup?invite=<id>&email=<invited email>.
  // The accept page finishes the join after signup.
  const inviteId = params.get("invite");
  const oauthError = oauthErrorMessage(params.get("error"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(oauthError);
  const [attempt, setAttempt] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);

  const afterSignup = inviteId ? `/invite/${inviteId}` : "/onboarding";

  // Pay the auth cold start while the user is still typing instead of after
  // they click a sign-up button.
  useEffect(() => {
    void authClient.getSession().catch(() => {});
  }, []);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.signUp.email({ name, email, password });
    if (error) {
      setBusy(false);
      setInvalid(true);
      setError(error.message ?? "Signup failed.");
      setAttempt((a) => a + 1);
    } else {
      // Keep the button spinning through the client-side navigation.
      router.push(afterSignup);
    }
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
          : "Get instant quotes, book loads, and track shipments. Free to set up — invite your team once you're in."}
      </CardDescription>
      <SocialSignIn providers={providers} callbackURL={afterSignup} errorCallbackURL="/signup" />
      <form onSubmit={signUp} className="mt-6 space-y-4">
        <Field label="Your name" htmlFor="name">
          <Input
            id="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Work email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            aria-invalid={invalid || undefined}
            onChange={(e) => {
              setEmail(e.target.value);
              setInvalid(false);
            }}
          />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters.">
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            aria-invalid={invalid || undefined}
            onChange={(e) => {
              setPassword(e.target.value);
              setInvalid(false);
            }}
          />
        </Field>
        {error ? (
          <Alert key={attempt} tone="error">
            {error}
          </Alert>
        ) : null}
        <Button type="submit" className="w-full" loading={busy}>
          Create account
        </Button>
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
