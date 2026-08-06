"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { SocialProviderFlags } from "@/lib/auth";
import { safeNext } from "@/lib/portal/safe-next";
import { AuthShell } from "@/components/portal/auth-shell";
import { SocialSignIn, oauthErrorMessage } from "@/components/portal/social-sign-in";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";

type Feedback = { tone: "error" | "success" | "info"; text: string };

/**
 * Better-auth's invalid-credential message is terse; swap it for copy that
 * says what to do next. Anything else (rate limits, server trouble) shows
 * the server message verbatim so real errors are never masked.
 */
function signInErrorCopy(message: string | null | undefined): { text: string; credential: boolean } {
  const msg = message ?? "";
  if (/invalid (email or )?password|invalid credential|user not found/i.test(msg)) {
    return {
      text: "That email and password don't match. Check them and try again, or use a sign-in link.",
      credential: true,
    };
  }
  return { text: msg || "Sign-in failed. Try again.", credential: false };
}

function LoginFormInner({ providers }: { providers: SocialProviderFlags }) {
  const router = useRouter();
  const params = useSearchParams();
  // safeNext: ?next= is attacker-controlled; it feeds router.push and the
  // magic-link/social callbackURL, so it must never leave the site.
  const next = safeNext(params.get("next"));
  const oauthError = oauthErrorMessage(params.get("error"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(
    oauthError ? { tone: "error", text: oauthError } : null,
  );
  // Keys the Alert so it re-animates on every new message, including a
  // repeat of the same failure.
  const [attempt, setAttempt] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const [pending, setPending] = useState<"password" | "link" | null>(null);

  // Pay the auth cold start (lazy auth construction + DB connect) while the
  // user is still typing instead of after they click a sign-in button.
  useEffect(() => {
    void authClient.getSession().catch(() => {});
  }, []);

  function show(tone: Feedback["tone"], text: string) {
    setFeedback({ tone, text });
    setAttempt((a) => a + 1);
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setPending("password");
    setFeedback(null);
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      setPending(null);
      const copy = signInErrorCopy(error.message);
      setInvalid(copy.credential);
      show("error", copy.text);
    } else {
      // Keep the button spinning through the client-side navigation.
      router.push(next);
    }
  }

  async function sendMagicLink() {
    if (pending) return;
    if (!email) {
      show("info", "Enter your email above and we'll send you a one-time sign-in link.");
      return;
    }
    setPending("link");
    setFeedback(null);
    const { error } = await authClient.signIn.magicLink({ email, callbackURL: next });
    setPending(null);
    if (error) show("error", error.message ?? "Could not send the link. Try again.");
    else show("success", `Check your inbox: we sent a sign-in link to ${email}.`);
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
      <CardDescription>
        Welcome back. Sign in to manage your quotes, loads, and invoices.
      </CardDescription>
      <SocialSignIn providers={providers} callbackURL={next} errorCallbackURL="/login" />
      <form onSubmit={signIn} className="mt-6 space-y-4">
        <Field label="Email" htmlFor="email">
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
        <Field
          label="Password"
          htmlFor="password"
          labelEnd={
            <button
              type="button"
              disabled={pending !== null}
              onClick={sendMagicLink}
              className="text-sm font-bold text-navy hover:underline disabled:opacity-50"
            >
              Forgot password?
            </button>
          }
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            aria-invalid={invalid || undefined}
            onChange={(e) => {
              setPassword(e.target.value);
              setInvalid(false);
            }}
          />
        </Field>
        {feedback ? (
          <Alert key={attempt} tone={feedback.tone}>
            {feedback.text}
          </Alert>
        ) : null}
        <Button
          type="submit"
          className="w-full"
          loading={pending === "password"}
          disabled={pending !== null}
        >
          Sign in
        </Button>
        <p className="text-center text-sm">
          <button
            type="button"
            disabled={pending !== null}
            onClick={sendMagicLink}
            className="font-bold text-muted hover:text-ink disabled:opacity-50"
          >
            {pending === "link" ? "Sending your sign-in link…" : "Email me a one-time sign-in link instead"}
          </button>
        </p>
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
