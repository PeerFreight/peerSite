import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { IconClock, IconFileText, IconTruck } from "@/components/ui/icons";
import { ListPanel, ListRow } from "@/components/ui/list";
import { JoinedGrid, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat";

export const metadata: Metadata = {
  title: "Portal styleguide - Peer Freight",
  robots: { index: false },
};

/**
 * Internal reference page for the shipper-portal UI primitives. Reviewable
 * only on preview deploys (which sit behind Vercel SSO); production builds
 * bake in a 404 so the unreleased portal UI is never public.
 *
 * Sectioning system: navy chrome (sidebar), paper canvas, bordered white
 * surfaces — the hairline carries structure. Related sections share one
 * surface via JoinedGrid (hairline joints) instead of floating separately.
 */
export default function StyleguidePage() {
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-extrabold">Portal styleguide</h1>
        <p className="mt-1 text-muted">
          Shared primitives for the shipper portal. Navy chrome, paper canvas,
          white panels; gold for primary actions only.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-extrabold">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary action</Button>
          <Button variant="navy">Continue</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Signing in</Button>
          <Button size="sm">Small</Button>
        </div>
        <p className="text-sm text-muted">
          Gold gradient = the one primary CTA per screen. Navy solid = wizard
          Continue / form saves. Everything else secondary or ghost. Pass
          `loading` while an action is in flight — it disables the button and
          prepends the spinner.
        </p>
      </section>

      <section className="max-w-md space-y-4">
        <h2 className="text-lg font-extrabold">Alerts</h2>
        <Alert tone="error">
          That email and password don&apos;t match. Check them and try again, or
          use a sign-in link.
        </Alert>
        <Alert tone="success">Check your inbox — we sent a sign-in link.</Alert>
        <Alert tone="info">Enter your email above and we&apos;ll send you a link.</Alert>
        <p className="text-sm text-muted">
          Inline, form-adjacent feedback — no floating toasts. Key the Alert
          with a per-submit attempt counter (`key={"{attempt}"}`) so it
          re-animates on every failed retry.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-extrabold">Skeletons</h2>
        <div className="max-w-md space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <p className="text-sm text-muted">
          Route-level `loading.tsx` silhouettes while force-dynamic pages
          fetch. Keep shapes matched to the real page anatomy.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-extrabold">Badges</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Submitted</Badge>
          <Badge tone="gold">Needs info</Badge>
          <Badge tone="navy">In transit</Badge>
          <Badge tone="green">Delivered</Badge>
          <Badge tone="red">Hazmat 3</Badge>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-extrabold">Stat tiles</h2>
        <JoinedGrid className="sm:grid-cols-3">
          <StatTile label="Active loads" value={4} icon={<IconTruck size={18} />} />
          <StatTile label="In transit" value={2} icon={<IconClock size={18} />} />
          <StatTile label="Open quotes" value={7} icon={<IconFileText size={18} />} />
        </JoinedGrid>
        <p className="text-sm text-muted">
          KPI cells live on one JoinedGrid surface — attached at hairline
          joints, never floating as separate cards.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-extrabold">Panels & lists</h2>
        <Panel>
          <PanelHeader
            label="Panel header"
            action={
              <a href="#" className="text-sm font-bold text-muted hover:text-ink">
                View all →
              </a>
            }
          />
          <PanelBody>
            <p className="text-sm text-muted">
              Bordered white surface on the paper canvas; the small-caps
              `.section-label` carries the sectioning.
            </p>
          </PanelBody>
        </Panel>
        <ListPanel label="List panel">
          <ListRow href="#">
            <span className="w-24 text-sm font-extrabold tabular-nums text-navy">PEER-1001</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink">Stockton, CA → Reno, NV</p>
              <p className="mt-0.5 truncate text-sm text-muted">Dry van 53' · Packaged beer</p>
            </div>
            <Badge tone="gold">In transit</Badge>
          </ListRow>
          <ListRow href="#">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink">Petaluma, CA → Sparks, NV</p>
              <p className="mt-0.5 truncate text-sm text-muted">Reefer 53' · Cold-pack produce</p>
            </div>
            <Badge tone="navy">Submitted</Badge>
          </ListRow>
        </ListPanel>
        <Panel>
          <EmptyState
            icon={<IconTruck size={20} />}
            title="Empty state"
            description="Icon on a paper disc, one-line description, at most one action."
            action={<Button size="sm">Request a quote</Button>}
          />
        </Panel>
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
          <Card className="border-navy/30">
            <CardTitle>Quote ready</CardTitle>
            <CardDescription>
              The navy border marks the one card that needs a decision.
            </CardDescription>
            <div className="mt-4 flex gap-2">
              <Button size="sm">Accept</Button>
              <Button size="sm" variant="secondary">Decline</Button>
            </div>
          </Card>
        </div>
      </section>

      <section className="max-w-md space-y-4">
        <h2 className="text-lg font-extrabold">Form fields</h2>
        <p className="text-sm text-muted">
          Convention: unmarked fields are required; optional fields carry the
          muted suffix.
        </p>
        <Field label="Origin" htmlFor="sg-origin" hint="City, state, ZIP.">
          <Input id="sg-origin" placeholder="e.g. Stockton, CA 95206" />
        </Field>
        <Field label="Equipment" htmlFor="sg-equipment">
          <Select id="sg-equipment" defaultValue="Dry van 53'">
            <option>Dry van 53&apos;</option>
            <option>Reefer 53&apos;</option>
            <option>Flatbed</option>
          </Select>
        </Field>
        <Field label="Notes" htmlFor="sg-notes" optional error="Example of a field error.">
          <Textarea id="sg-notes" placeholder="Anything else we should know?" />
        </Field>
        <Field label="Date flexibility">
          <SegmentedControl
            name="sg-flexibility"
            ariaLabel="Date flexibility"
            defaultValue="exact"
            options={[
              { value: "exact", label: "Dates are firm" },
              { value: "flexible", label: "Dates are flexible" },
            ]}
          />
        </Field>
        <Field label="Placards required?" optional>
          <SegmentedControl
            name="sg-placards"
            ariaLabel="Placards required?"
            defaultValue="unknown"
            options={[
              { value: "unknown", label: "Not sure" },
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
        </Field>
        <p className="text-sm text-muted">
          Two- or three-option choices are a SegmentedControl (native radios,
          attached cells) instead of a dropdown; 4+ options stay a Select.
        </p>
        <div className="flex items-center gap-3 text-sm">
          <IconFileText size={16} className="text-muted" />
          <span className="text-muted">
            Icons: inline Lucide paths in `components/ui/icons.tsx`, 18px stroke.
          </span>
        </div>
      </section>
    </div>
  );
}
