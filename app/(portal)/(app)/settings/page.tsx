import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { JoinedGrid } from "@/components/ui/panel";
import {
  hasCredentialAccount,
  listOrgMembers,
  listPendingInvitations,
  listUserOrganizations,
} from "@/lib/portal/queries";
import { isAdmin } from "@/lib/portal/roles";
import { requireOrgSession } from "@/lib/portal/session";
import { CompanyForm } from "./company-form";
import { PasswordForm } from "./password-form";
import { EmailForm, ProfileForm } from "./profile-form";
import { SignOutPanel } from "./sign-out-panel";
import { CancelInviteButton, InviteForm } from "./teammates";

export const metadata: Metadata = {
  title: "Settings - Peer Freight",
  robots: { index: false },
};

const roleLabel: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { session, db, org } = await requireOrgSession();
  const { error } = await searchParams;
  const canManage = ["owner", "admin"].includes(org.role);
  const [orgs, hasPassword, members, invitations] = await Promise.all([
    listUserOrganizations(db, session.user.id),
    hasCredentialAccount(db, session.user.id),
    listOrgMembers(db, session.user.id, org.id),
    canManage ? listPendingInvitations(db, session.user.id, org.id) : Promise.resolve([]),
  ]);
  const current = orgs.find((o) => o.id === org.id) ?? org;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Settings</h1>

      {/* The change-email verify link lands back here; a dead token gets a
          banner instead of a silent no-op. */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          That verification link is no longer valid. Request the email change again.
        </div>
      ) : null}

      {/* One attached surface: settings sections meet at hairline joints,
          two-up on wide screens so the page fills the canvas. */}
      <JoinedGrid className="lg:grid-cols-2">
        <section className="bg-white p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="section-label">Profile</h2>
            {isAdmin(session.user) ? <Badge tone="navy">Admin</Badge> : null}
          </div>
          <div className="mt-4">
            <ProfileForm name={session.user.name} />
          </div>
        </section>

        <section className="bg-white p-6">
          <h2 className="section-label">Email</h2>
          <div className="mt-4">
            <EmailForm email={session.user.email} />
          </div>
        </section>

        <section className="bg-white p-6">
          <h2 className="section-label">Password</h2>
          <div className="mt-4">
            <PasswordForm hasPassword={hasPassword} />
          </div>
        </section>

        <section className="bg-white p-6">
          <h2 className="section-label">Company</h2>
          <div className="mt-4">
            <CompanyForm name={current.name} role={current.role} canEdit={canManage} />
          </div>
        </section>

        <section className="bg-white p-6 lg:col-span-2">
          <h2 className="section-label">Teammates</h2>
          <ul className="mt-4 divide-y divide-line">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink">
                    {m.name}
                    {m.userId === session.user.id ? (
                      <span className="ml-1.5 text-xs font-semibold text-muted">You</span>
                    ) : null}
                  </p>
                  <p className="truncate text-sm text-muted">{m.email}</p>
                </div>
                <Badge>{roleLabel[m.role] ?? m.role}</Badge>
              </li>
            ))}
          </ul>
          {canManage ? (
            <>
              {invitations.length > 0 ? (
                <div className="mt-4">
                  <p className="text-sm font-bold text-ink">Pending invitations</p>
                  <ul className="mt-1 divide-y divide-line">
                    {invitations.map((inv) => (
                      <li key={inv.id} className="flex items-center justify-between gap-4 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ink">{inv.email}</p>
                          <p className="text-xs text-muted">
                            {roleLabel[inv.role ?? "member"] ?? inv.role} · expires{" "}
                            {new Intl.DateTimeFormat("en-US", {
                              month: "short",
                              day: "numeric",
                            }).format(inv.expiresAt)}
                          </p>
                        </div>
                        <CancelInviteButton invitationId={inv.id} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="mt-5">
                <InviteForm />
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Ask an owner or admin on your team to invite new teammates.
            </p>
          )}
        </section>

        <section className="bg-white p-6 lg:col-span-2">
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
