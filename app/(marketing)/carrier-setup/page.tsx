import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ChromeScript } from "@/components/site/ChromeScript";
import { CarrierSetupForm } from "./carrier-setup-form";

export const metadata: Metadata = {
  title: "Get Set Up - Peer Freight",
  description:
    "Get set up to haul for Peer Freight. Tell us about your trucks and we will get you cleared for our loads.",
  alternates: { canonical: "https://www.peer-freight.com/carrier-setup" },
  robots: { index: false },
};

export default function CarrierSetupPage() {
  return (
    <>
      <SiteHeader cta={{ href: "/carrier-setup", label: "Get Set Up" }} />

      <main id="main">
        <section className="subhero" aria-labelledby="setup-title" style={{ paddingBottom: "clamp(2rem,4vw,3rem)" }}>
          <img className="subhero__bg" src="/site/freight-oversize-morning.jpg" alt="" />
          <div className="wrap">
            <h1 className="display" id="setup-title" style={{ fontSize: "clamp(2.4rem,5vw,4rem)" }}>Get set up</h1>
            <p className="lead">Tell us about your trucks. Most carriers are cleared for our loads the same day.</p>
          </div>
        </section>

        <section className="section section--paper" aria-label="Carrier setup">
          <div className="wrap">
            <div className="formwrap">
              <div className="quote-aside">
                <h2>What happens next</h2>
                <p className="lead">Send this once and we take it from there.</p>
                <ul>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> We verify your authority through Carrier411 and FMCSA</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> We reply for the rest of the packet: W-9 and a COI naming Peer Freight</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> You get paid within 24 to 48 hours on every load</li>
                </ul>
              </div>

              <div>
                <CarrierSetupForm />
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <ChromeScript />
    </>
  );
}
