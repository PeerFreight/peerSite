"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AuthShell } from "@/components/portal/auth-shell";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
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
    </AuthShell>
  );
}
