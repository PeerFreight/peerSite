import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ChromeScript } from "@/components/site/ChromeScript";
import { HowWeRun } from "@/components/site/HowWeRun";
import { HowTimeline } from "@/components/site/HowTimeline";
import { RevealScript } from "@/components/site/RevealScript";

export const metadata: Metadata = {
  title: "Peer Freight - Truckload Freight Brokerage",
  description:
    "Peer Freight is a truckload brokerage built on modern technology. Fast answers, carriers we screen for fraud ourselves, and status updates before you ask, with the owners reachable on every load. Dry van, reefer, flatbed, hazmat, tanker, and port drayage.",
  alternates: { canonical: "https://www.peer-freight.com/" },
  openGraph: {
    type: "website",
    siteName: "Peer Freight",
    title: "Peer Freight - Truckload Freight Brokerage",
    description:
      "Fraud-screened carriers, transparent pricing, and status before you ask, with the owners reachable on every load. Licensed, bonded, insured, and a TIA member.",
    url: "https://www.peer-freight.com/",
    images: [
      {
        url: "https://www.peer-freight.com/site/freight-og-card.png",
        secureUrl: "https://www.peer-freight.com/site/freight-og-card.png",
        type: "image/png",
        width: 1200,
        height: 630,
        alt: "Peer Freight, a truckload freight brokerage",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Peer Freight - Truckload Freight Brokerage",
    description:
      "Fraud-screened carriers, transparent pricing, and status before you ask, with the owners reachable on every load.",
    images: ["https://www.peer-freight.com/site/freight-og-card.png"],
  },
};

export default function HomePage() {
  return (
    <>
      <SiteHeader cta={{ href: "/quote", label: "Get a Quote" }} />

      <main id="main">
        {/* HERO */}
        <section className="hero hero--home" aria-labelledby="hero-title">
          <img className="hero__bg" src="/site/freight-tanker-day.jpg" alt="" fetchPriority="high" />
          <div className="wrap">
            <div className="hero__grid">
              <div className="hero__content">
                <h1 id="hero-title" className="display">Difficult freight handled right</h1>
                <p className="hero__sub">A new brokerage built on modern technology. We use AI to get quotes back fast, vet carriers in more depth, and catch problems before they reach you. Track every load live, with a human in the loop whenever you need one.</p>
                <div className="hero__cta">
                  <a className="btn btn--yellow" href="/quote">
                    Get a Quote
                    <span className="btn__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg></span>
                  </a>
                </div>
              </div>

              {/* Frozen snapshot of the real customer portal (Loads page),
                  exported by tools/freeze-mocks.mjs from /mock-lab. Decoration
                  only; scales proportionally at any viewport. */}
              <div className="hero__panel glass" aria-hidden="true">
                <img className="mockshot" src="/site/mock-loads@2x.png" alt="" width={640} height={520} fetchPriority="high" />
              </div>
            </div>
          </div>
        </section>

        {/* Mentors/advisors proof band, first thing below the fold */}
        <section className="logo-band" id="mentors" aria-label="Mentors and advisors">
          <div className="wrap">
            <p className="logo-band__label">Mentors and advisors from</p>
            <div className="logo-band__row">
              <img src="/logos/atob.svg" alt="AtoB" />
              <img src="/logos/cdl1000.svg" alt="CDL1000" />
              <span className="logo--yc-lockup" role="img" aria-label="Y Combinator">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 3h18v18H3z" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M11.5 13.5 8 7h1.9l2.1 4 2.1-4h1.9L12.5 13.5V17h-1z"/></svg>
                <span>Combinator</span>
              </span>
              <img src="/logos/otr-transportation.svg" alt="OTR Transportation" />
              <img className="logo--md" src="/logos/dynamic-connections.png" alt="Dynamic Connections" />
              <img className="logo--tall" src="/logos/waylens.svg" alt="Waylens" />
            </div>
          </div>
        </section>

        {/* WHO WE SERVE (one fused mosaic: copy cells + photo cells) */}
        <section className="section section--paper" id="freight" aria-labelledby="serve-title">
          <div className="wrap">
            <div className="section__head" data-reveal>
              <h2 className="heading" id="serve-title">Freight we specialize in</h2>
              <p className="lead">We specialize in hazmat, and we cover reefer, dry van, flatbed, and port drayage just as well. Whatever the load, the carriers, the placards, and the paperwork are our problem, not yours.</p>
            </div>

            <div className="pane" data-reveal>
            <div className="serve__mosaic mosaic">
              <article className="card">
                <div className="card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4"/><path d="M12 17h.01"/></svg></div>
                <h3>Hazmat</h3>
                <p>Placarded, compliant, and hauled only by carriers rated and insured for it.</p>
              </article>
              <article className="card">
                <div className="card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/></svg></div>
                <h3>Reefer and dry van</h3>
                <p>Temperature controlled and standard truckload, delivered on time.</p>
              </article>
              <div className="tile--img">
                <img src="/site/freight-hero-terminal-morning.jpg" alt="Placarded chemical tanker truck at a terminal at sunrise" loading="lazy" />
              </div>
              {/* Frozen load-details snapshot (tools/freeze-mocks.mjs) over
                  its own blurred scene, so the mock never sits on bare white */}
              <div className="tile--asset" aria-hidden="true">
                <img className="scene" src="/site/freight-tanker-day.jpg" alt="" loading="lazy" />
                <img className="mockshot" src="/site/mock-freight@2x.png" alt="" width={560} height={200} loading="lazy" />
              </div>
              <article className="card">
                <div className="card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8h12v8H2z"/><path d="M14 11h4l3 3v2h-7z"/><circle cx="6.5" cy="17.5" r="1.7"/><circle cx="17" cy="17.5" r="1.7"/></svg></div>
                <h3>Flatbed and specialized</h3>
                <p>Machinery, building materials, and oversize loads.</p>
              </article>
              <article className="card">
                <div className="card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20"/><path d="M4 20V9h6v11"/><path d="M14 20V4h6v16"/><path d="M6 12h2"/><path d="M6 15h2"/><path d="M16 8h2"/><path d="M16 12h2"/></svg></div>
                <h3>Port drayage</h3>
                <p>Containers in and out of ports and rail ramps, hazmat endorsed when needed.</p>
              </article>
            </div>
            </div>
          </div>
        </section>

        {/* HOW WE RUN A LOAD (photo-backed split-screen tabs: glass step rows
            on the left, the active step's frozen snapshot cross-fading in one
            glass pane on the right) */}
        <section className="section section--photo" aria-labelledby="svc-title">
          <img className="section__bg" src="/site/freight-reefer-evening.jpg" alt="" loading="lazy" />
          <div className="wrap">
            <div className="section__head on-dark" data-reveal>
              <h2 className="heading" id="svc-title">We run every load the same way</h2>
              <p className="lead">Every load runs through the same four steps, no matter the freight.</p>
            </div>
            <HowWeRun />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section section--paper" id="how" aria-labelledby="how-title">
          <div className="wrap">
            <div className="split">
              <div className="split__copy" data-reveal>
                <div className="section__head">
                  <h2 className="heading" id="how-title">Covering a load with us is simple</h2>
                  <p className="lead">We always get back to you with a rate within one hour. Send the load, approve the number, and we take it from there.</p>
                </div>
              </div>
              {/* Frozen snapshot of the portal quote wizard (tools/freeze-mocks.mjs)
                  in the scene-backed glass pane: its own blurred photo bleeds
                  through the frost ring on this light section. */}
              <div className="split__panel split__panel--scene" aria-hidden="true" data-reveal="120">
                <img className="scene" src="/site/freight-dock-dusk.jpg" alt="" loading="lazy" />
                <img className="mockshot" src="/site/mock-quote@2x.png" alt="" width={640} height={429} loading="lazy" />
              </div>
            </div>
            {/* The four steps as a scroll-checked timeline under the split
                (HowTimeline fills the track as it scrolls into view). */}
            <HowTimeline />
          </div>
        </section>

        {/* WHY PEER (navy bento: photo, white proof tiles, and the tracking mock) */}
        <section className="section section--navy" aria-labelledby="why-title">
          <div className="wrap">
            <div className="section__head on-dark" data-reveal>
              <h2 className="heading" id="why-title">Built to be reliable, not just cheap</h2>
              <p className="lead">We take the loads other brokers turn down: oversize freight, hazmat, and the lanes nobody wants to run. If it absolutely has to move, we are built to move it.</p>
            </div>

            {/* Proof cells reuse the specialties .card recipe (icon on top,
                uppercase title, muted copy) so both mosaics read as one system. */}
            <div className="pane" data-reveal>
            <div className="bento mosaic">
              <div className="tile--img tile--wide">
                <img src="/site/freight-yard-aerial-night.jpg" alt="Intermodal container yard at night" loading="lazy" />
              </div>
              <article className="card">
                <div className="card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg></div>
                <h3>24/7 owner access</h3>
                <p>Reach an owner directly on any load, at any hour.</p>
              </article>
              <article className="card">
                <div className="card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="6"/><path d="m8.5 13.5-1.5 7 5-3 5 3-1.5-7"/></svg></div>
                <h3>TIA member</h3>
                <p>Held to the Transportation Intermediaries Association anti-fraud standard.</p>
              </article>
              <article className="card">
                <div className="card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v1.5"/><path d="M3.5 12a8.5 8.5 0 0 1 17 0Z"/><path d="M12 12v6a2.5 2.5 0 0 0 5 0"/></svg></div>
                <h3>Fully insured</h3>
                <p>Contingent cargo and auto, general liability, E&amp;O, and cyber.</p>
              </article>
              <article className="card">
                <div className="card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.2"/><path d="M6 12h.01"/><path d="M18 12h.01"/></svg></div>
                <h3>Same-day carrier pay</h3>
                <p>Same-day pay when carriers need it, 24 to 48 hours standard.</p>
              </article>
              {/* Frozen tracking snapshot (tools/freeze-mocks.mjs) over its
                  own blurred scene */}
              <div className="tile--asset tile--wide" aria-hidden="true">
                <img className="scene" src="/site/freight-drayage-port.jpg" alt="" loading="lazy" />
                <img className="mockshot" src="/site/mock-track@2x.png" alt="" width={640} height={281} loading="lazy" />
              </div>
            </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA (full-bleed photo band) */}
        <section className="cta-band" aria-label="Get started">
          <img className="cta-band__bg" src="/site/freight-highway-cornfield.jpg" alt="" />
          <div className="wrap" data-reveal>
            <div className="cta-band__top">
              <div>
                <h2>Freight that moves around your schedule</h2>
                <p className="lead">Tell us when it needs to move, and one of the owners takes it from there.</p>
              </div>
            </div>
            <div className="cta-bar">
              <strong>Got a load that can&apos;t be late?</strong>
              <a className="btn btn--navy" href="/quote">
                Get a Quote
                <span className="btn__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg></span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <ChromeScript />
      <RevealScript />
    </>
  );
}
