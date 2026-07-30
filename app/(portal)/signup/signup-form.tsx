"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.signUp.email({ name, email, password });
    setBusy(false);
    if (error) setError(error.message ?? "Signup failed.");
    else router.push("/onboarding");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <a href="/" className="mb-8 flex items-center gap-2.5" aria-label="Peer Freight home">
        <img src="/site/peer-logo-mark.png" alt="" width={34} height={34} />
        <span className="text-lg font-extrabold tracking-tight text-navy">Peer Freight</span>
      </a>
      <Card className="shadow-card">
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Signup is invite-only right now. If we have not set your email up yet,
          email team@peer-freight.com first.
        </CardDescription>
        <form onSubmit={signUp} className="mt-6 space-y-4">
          <Field label="Your name" htmlFor="name">
            <Input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Work email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" htmlFor="password" hint="At least 8 characters.">
            <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <Button type="submit" disabled={busy}>Create account</Button>
        </form>
      </Card>
      <p className="mt-4 text-sm text-muted">
        Already set up? <a className="font-bold text-navy underline" href="/login">Sign in</a>
      </p>
    </div>
  );
}
