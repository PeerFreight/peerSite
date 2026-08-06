import type { Metadata } from "next";
import { OverlayShell } from "@/components/portal/overlay-shell";
import { IconCheck } from "@/components/ui/icons";
import { CarrierSetupForm } from "./carrier-setup-form";

/**
 * Get Set Up as an overlay on the site: same chrome as /login and /quote,
 * widened, with the setup form on a floating paper sheet. Lives in (portal)
 * for portal.css and Manrope but outside (app) — public, no session shell.
 */

export const metadata: Metadata = {
  title: "Get Set Up - Peer Freight",
  description:
    "Get set up to haul for Peer Freight. Tell us about your trucks and we will get you cleared for our loads.",
  alternates: { canonical: "https://www.peer-freight.com/carrier-setup" },
  robots: { index: false },
};

const NEXT_STEPS = [
  "We verify your authority through Carrier411 and FMCSA",
  "We reply for the rest of the packet: W-9 and a COI naming Peer Freight",
  "You get paid within 24 to 48 hours on every load",
];

export default function CarrierSetupPage() {
  return (
    <OverlayShell
      width="3xl"
      topRight={
        <p className="text-sm text-white/70">
          <span className="hidden sm:inline">Shipping freight? </span>
          <a className="font-bold text-gold-soft hover:text-white" href="/quote">
            Get a quote
          </a>
        </p>
      }
    >
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Get set up</h1>
        <p className="mx-auto mt-2 max-w-xl text-white/80">
          Tell us about your trucks. Most carriers are cleared for our loads
          the same day.
        </p>
      </div>
      <ul className="mx-auto mb-8 w-fit space-y-1.5 text-sm text-white/80">
        {NEXT_STEPS.map((step) => (
          <li key={step} className="flex items-start gap-2">
            <IconCheck size={15} className="mt-0.5 shrink-0 text-gold" />
            {step}
          </li>
        ))}
      </ul>
      <div className="rounded-xl bg-paper p-4 shadow-card sm:p-6">
        <CarrierSetupForm />
      </div>
    </OverlayShell>
  );
}
