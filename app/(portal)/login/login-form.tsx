"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

function LoginFormInner() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/dashboard";
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
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <a href="/" className="mb-8 flex items-center gap-2.5" aria-label="Peer Freight home">
        <img src="/site/peer-logo-mark.png" alt="" width={34} height={34} />
        <span className="text-lg font-extrabold tracking-tight text-navy">Peer Freight</span>
      </a>
      <Card className="shadow-card">
        <CardTitle>Sign in</CardTitle>
        <CardDescription>The shipper portal is invite-only while we finish setup.</CardDescription>
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
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {notice ? <p className="text-sm text-green-800">{notice}</p> : null}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy}>Sign in</Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={sendMagicLink}>
              Email me a link
            </Button>
          </div>
        </form>
      </Card>
      <p className="mt-4 text-sm text-muted">
        New here? <a className="font-bold text-navy underline" href="/signup">Create an account</a>
      </p>
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}
