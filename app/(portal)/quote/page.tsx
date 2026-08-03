import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { GuestRfqForm } from "./guest-rfq-form";

/**
 * The public Get a Quote page: the real RFQ wizard, no login required until
 * the final step, where creating the account is what submits the request.
 * Lives inside (portal) for the wizard's fonts and styles but outside (app)
 * — same placement as /login — so no session shell wraps it.
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
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="/" className="flex items-center gap-2.5" aria-label="Peer Freight home">
            <img src="/site/peer-logo-mark.png" alt="" width={30} height={30} />
            <span className="text-lg font-extrabold tracking-tight text-navy">
              Peer Freight
            </span>
          </a>
          <p className="text-sm text-muted">
            Already have an account?{" "}
            <a className="font-bold text-navy hover:underline" href="/login?next=/quotes/new">
              Log in
            </a>
          </p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-extrabold">Get a quote</h1>
          <p className="mt-1 text-muted">
            Tell us about your lane. One of the owners prices it personally and
            gets back to you within the hour during business hours.
          </p>
        </div>
        <GuestRfqForm />
      </main>
    </div>
  );
}
