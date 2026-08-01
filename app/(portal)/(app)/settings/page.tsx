import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { JoinedGrid } from "@/components/ui/panel";
import { listUserOrganizations } from "@/lib/portal/queries";
import { isAdmin } from "@/lib/portal/roles";
import { requireOrgSession } from "@/lib/portal/session";
import { CompanyForm } from "./company-form";
import { ProfileForm } from "./profile-form";
import { SignOutPanel } from "./sign-out-panel";

export const metadata: Metadata = {
  title: "Settings - Peer Freight",
  robots: { index: false },
};

export default async function SettingsPage() {
  const { session, db, org } = await requireOrgSession();
  const orgs = await listUserOrganizations(db, session.user.id);
  const current = orgs.find((o) => o.id === org.id) ?? org;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-extrabold">Settings</h1>

      {/* One attached surface: settings sections meet at hairline joints. */}
      <JoinedGrid>
        <section className="bg-white p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="section-label">Profile</h2>
            {isAdmin(session.user) ? <Badge tone="navy">Admin</Badge> : null}
          </div>
          <div className="mt-4">
            <ProfileForm name={session.user.name} email={session.user.email} />
          </div>
        </section>

        <section className="bg-white p-6">
          <h2 className="section-label">Company</h2>
          <div className="mt-4">
            <CompanyForm
              name={current.name}
              role={current.role}
              canEdit={["owner", "admin"].includes(current.role)}
            />
          </div>
        </section>

        <section className="bg-white p-6">
          <h2 className="section-label">Teammates</h2>
          <p className="mt-3 text-sm text-muted">
            Invites are coming with the quote-request flow. For now, email
            team@peer-freight.com and we will add your teammates.
          </p>
        </section>

        <section className="bg-white p-6">
          <h2 className="section-label">Session</h2>
          <p className="mt-3 text-sm text-muted">
            Signed in as {session.user.email}. Signing out ends this session on
            this device only.
          </p>
          <div className="mt-4">
            <SignOutPanel />
          </div>
        </section>
      </JoinedGrid>
    </div>
  );
}
