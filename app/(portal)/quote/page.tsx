import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OverlayShell } from "@/components/portal/overlay-shell";
import { getAuth } from "@/lib/auth";
import { GuestRfqForm } from "./guest-rfq-form";

/**
 * The public Get a Quote page: the real RFQ wizard, no login required until
 * the final step, where creating the account is what submits the request.
 * Lives inside (portal) for the wizard's fonts and styles but outside (app)
 * — same placement as /login — so no session shell wraps it. Renders as an
 * overlay on the site (the /login chrome, widened) with the wizard on a
 * floating paper sheet.
 */

export const metadata: Metadata = {
  title: "Get a Quote - Peer Freight",
  description:
    "Request a freight quote from Peer Freight. Tell us about your lane and we will come back with a market-backed rate.",
  alternates: { canonical: "https://www.peer-freight.com/quote" },
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function GuestQuotePage() {
  // Signed-in visitors get the portal wizard: same form, plus their
  // recent-request prefill, minus the account step.
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: new Headers({ cookie: (await cookies()).toString() }),
  });
  if (session) redirect("/quotes/new");

  return (
    <OverlayShell
      width="3xl"
      topRight={
        <p className="text-sm text-white/70">
          <span className="hidden sm:inline">Already have an account? </span>
          <a className="font-bold text-gold-soft hover:text-white" href="/login?next=/quotes/new">
            Log in
          </a>
        </p>
      }
    >
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Get a quote</h1>
        <p className="mx-auto mt-2 max-w-xl text-white/80">
          Tell us about your lane. One of the owners prices it personally and
          gets back to you within the hour during business hours.
        </p>
      </div>
      <div className="rounded-xl bg-paper p-4 shadow-card sm:p-6">
        <GuestRfqForm />
      </div>
    </OverlayShell>
  );
}
