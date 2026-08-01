"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AuthShell } from "@/components/portal/auth-shell";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await authClient.organization.create({ name, slug });
    if (error || !data) {
      setBusy(false);
      setError(error?.message ?? "Could not create the company profile.");
      return;
    }
    await authClient.organization.setActive({ organizationId: data.id });
    router.push("/dashboard");
  }

  return (
    <AuthShell>
      <CardTitle>Set up your company</CardTitle>
      <CardDescription>
        Your quotes, loads, and documents live under this profile. You can
        invite teammates later.
      </CardDescription>
      <form onSubmit={createOrg} className="mt-6 space-y-4">
        <Field label="Company name" htmlFor="org-name">
          <Input id="org-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anderson Valley Brewing" />
        </Field>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button type="submit" disabled={busy}>Continue</Button>
      </form>
    </AuthShell>
  );
}
