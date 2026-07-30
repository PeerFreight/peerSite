import type { Metadata } from "next";
import { AppShell } from "@/components/portal/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

export const metadata: Metadata = {
  title: "Portal styleguide - Peer Freight",
  robots: { index: false },
};

/**
 * Internal reference page for the shipper-portal UI primitives (Phase 0).
 * Not linked from anywhere; exists so the portal design system builds and can
 * be reviewed on a preview deploy before the real portal routes land.
 */
export default function StyleguidePage() {
  return (
    <AppShell
      nav={
        <>
          <a href="#" className="text-white">Dashboard</a>
          <a href="#" className="hover:text-white">Quotes</a>
          <a href="#" className="hover:text-white">Loads</a>
        </>
      }
      user={<span className="text-sm text-white/80">styleguide</span>}
    >
      <div className="space-y-10">
        <div>
          <h1 className="text-2xl font-extrabold">Portal styleguide</h1>
          <p className="mt-1 text-muted">
            Shared primitives for the shipper portal. White canvas, paper panels,
            navy header, gold for primary actions only.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-extrabold">Buttons</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button disabled>Disabled</Button>
            <Button size="sm">Small</Button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-extrabold">Badges</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Submitted</Badge>
            <Badge tone="gold">Needs info</Badge>
            <Badge tone="navy">In transit</Badge>
            <Badge tone="green">Delivered</Badge>
            <Badge tone="red">Cancelled</Badge>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-extrabold">Cards</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardTitle>PEER-0001</CardTitle>
              <CardDescription>
                Stockton, CA → Reno, NV · Dry van 53&apos; · Picks up Aug 4
              </CardDescription>
              <div className="mt-4">
                <Badge tone="navy">In transit</Badge>
              </div>
            </Card>
            <Card className="shadow-card">
              <CardTitle>Quote ready</CardTitle>
              <CardDescription>All-in rate, valid until Aug 2.</CardDescription>
              <div className="mt-4 flex gap-2">
                <Button size="sm">Accept</Button>
                <Button size="sm" variant="secondary">Decline</Button>
              </div>
            </Card>
          </div>
        </section>

        <section className="max-w-md space-y-4">
          <h2 className="text-lg font-extrabold">Form fields</h2>
          <Field label="Origin" htmlFor="sg-origin" hint="Full address, city, state, ZIP.">
            <Input id="sg-origin" placeholder="e.g. Stockton, CA 95206" />
          </Field>
          <Field label="Equipment" htmlFor="sg-equipment">
            <Select id="sg-equipment" defaultValue="Dry van 53'">
              <option>Dry van 53&apos;</option>
              <option>Reefer</option>
              <option>Flatbed</option>
            </Select>
          </Field>
          <Field label="Notes" htmlFor="sg-notes" error="Example of a field error.">
            <Textarea id="sg-notes" placeholder="Anything else we should know?" />
          </Field>
        </section>
      </div>
    </AppShell>
  );
}
