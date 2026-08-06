import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ChromeScript } from "@/components/site/ChromeScript";

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
                <p className="hero__sub">A modern truckload brokerage built on modern technology. We use AI to get quotes back fast, vet carriers in more depth, and catch problems before they reach you. Track every load live, with a human in the loop whenever you need one.</p>
                <div className="hero__cta">
                  <a className="btn btn--yellow" href="/quote">
                    Get a Quote
                    <span className="btn__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg></span>
                  </a>
                </div>
              </div>

              {/* Static portal preview, decoration only */}
              <div className="hero__panel" aria-hidden="true">
                <div className="mock">
                  <div className="mock__top">
                    <span className="mock__live"><span className="mock__dot" />Shipper portal</span>
                    <span className="mock__ref">Load #P-2189</span>
                  </div>
                  <div className="mock__lane">
                    <strong>Houston, TX <span className="mock__arrow">&rarr;</span> Baton Rouge, LA</strong>
                    <span className="mock__pill">In transit</span>
                  </div>
                  <div className="mock__rail">
                    <span className="mock__rail-fill" />
                    <span className="mock__rail-dot" />
                  </div>
                  <div className="mock__times">
                    <span>Picked up 8:12 AM</span>
                    <span>Delivers 4:00 PM appt</span>
                  </div>
                  <ul className="mock__list">
                    <li><span className="mock__check">&#10003;</span>Carrier vetted, insurance and safety verified</li>
                    <li><span className="mock__check">&#10003;</span>Picked up on time</li>
                    <li className="mock__list-next"><span className="mock__next-dot" />Next update 2:40 PM</li>
                  </ul>
                </div>
                <div className="mock__chip">
                  <strong>Quote ready &middot; $1,840</strong>
                  <span>Sent 22 minutes after request</span>
                </div>
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

        {/* WHO WE SERVE */}
        <section className="section section--paper" id="freight" aria-labelledby="serve-title">
          <div className="wrap">
            <div className="section__head">
              <h2 className="heading" id="serve-title">Freight we specialize in</h2>
              <p className="lead">We specialize in hazmat, and we cover reefer, dry van, flatbed, and port drayage just as well. Whatever the load, the carriers, the placards, and the paperwork are our problem, not yours.</p>
            </div>

            <div className="serve__mosaic mosaic">
              <article className="card">
                <div className="card__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4"/><path d="M12 17h.01"/></svg></div>
                <h3>Hazmat</h3>
                <p>Placarded, compliant, and hauled only by carriers rated and insured for it.</p>
              </article>
              <article className="card">
                <div className="card__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/></svg></div>
                <h3>Reefer and dry van</h3>
                <p>Temperature controlled and standard truckload, delivered on time.</p>
              </article>
              <article className="card">
                <div className="card__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 8h12v8H2z"/><path d="M14 11h4l3 3v2h-7z"/><circle cx="6.5" cy="17.5" r="1.7"/><circle cx="17" cy="17.5" r="1.7"/></svg></div>
                <h3>Flatbed and specialized</h3>
                <p>Machinery, building materials, and oversize loads.</p>
              </article>
              <article className="card">
                <div className="card__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 20h20"/><path d="M4 20V9h6v11"/><path d="M14 20V4h6v16"/><path d="M6 12h2"/><path d="M6 15h2"/><path d="M16 8h2"/><path d="M16 12h2"/></svg></div>
                <h3>Port drayage</h3>
                <p>Containers in and out of ports and rail ramps, hazmat endorsed when needed.</p>
              </article>
              <div className="tile--img">
                <img src="/site/freight-hero-terminal-morning.jpg" alt="Placarded chemical tanker truck at a terminal at sunrise" />
                <span className="tile__overlay">Tanker</span>
              </div>
              <div className="tile--img">
                <img src="/site/freight-drayage-port.jpg" alt="Drayage truck hauling a container beneath port cranes" />
                <span className="tile__overlay">Drayage</span>
              </div>
            </div>
          </div>
        </section>

        {/* HOW WE RUN A LOAD (accordion) */}
        <section className="section section--white" aria-labelledby="svc-title">
          <div className="wrap">
            <div className="section__head">
              <h2 className="heading" id="svc-title">We run every load the same way</h2>
              <p className="lead">Every load runs through the same four steps, no matter the freight.</p>
            </div>

            <div className="svc">
              <details name="svc">
                <summary>
                  <span className="svc__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg></span>
                  <span className="svc__titles">
                    <span className="svc__title">Transparent quoting</span>
                    <span className="svc__sub">Market comps sent with every rate, so you see why the number is the number.</span>
                  </span>
                  <svg className="svc__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
                </summary>
                <div className="svc__panel">
                  <div className="svc__stat"><b>Real</b><span>market comps behind every rate</span></div>
                  <p className="svc__desc">Every quote comes with the current spot and contract comps for your lane. If the market moves between quotes, you see the new data, and the invoice always matches the rate you approved.</p>
                </div>
              </details>
              <details name="svc">
                <summary>
                  <span className="svc__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg></span>
                  <span className="svc__titles">
                    <span className="svc__title">Fraud-screened coverage</span>
                    <span className="svc__sub">Every carrier verified through Carrier411 and FMCSA before they touch your freight.</span>
                  </span>
                  <svg className="svc__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
                </summary>
                <div className="svc__panel">
                  <div className="svc__stat"><b>100%</b><span>of carriers verified before dispatch</span></div>
                  <p className="svc__desc">We recheck identity, authority, insurance, and safety history on every load, not only once at signup, because that is where fraud slips in. If anything looks off, the load goes to a different truck.</p>
                </div>
              </details>
              <details name="svc">
                <summary>
                  <span className="svc__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span>
                  <span className="svc__titles">
                    <span className="svc__title">Proactive tracking</span>
                    <span className="svc__sub">Updates at pickup, in transit, and at delivery, before you think to ask.</span>
                  </span>
                  <svg className="svc__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
                </summary>
                <div className="svc__panel">
                  <div className="svc__stat"><b>24/7</b><span>owner access on every load</span></div>
                  <p className="svc__desc">We surface problems early, while there is still time to fix them. If something goes sideways at 2 a.m., you reach one of the owners on the phone, not a call center.</p>
                </div>
              </details>
              <details name="svc">
                <summary>
                  <span className="svc__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/></svg></span>
                  <span className="svc__titles">
                    <span className="svc__title">A clean close</span>
                    <span className="svc__sub">A signed POD the same day it delivers, and an invoice that matches the quote.</span>
                  </span>
                  <svg className="svc__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
                </summary>
                <div className="svc__panel">
                  <div className="svc__stat"><b>Same day</b><span>signed proof of delivery</span></div>
                  <p className="svc__desc">The signed proof of delivery lands in your inbox the day the load delivers, so your own billing never waits on us. Accessorials are spelled out in writing, with no surprise charges weeks later.</p>
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section section--paper" id="how" aria-labelledby="how-title">
          <div className="wrap">
            <div className="section__head">
              <h2 className="heading" id="how-title">Covering a load with us is simple</h2>
              <p className="lead">We always get back to you with a rate within one hour. Send the load, approve the number, and we take it from there.</p>
            </div>
            <div className="steps mosaic">
              <div className="step">
                <img src="/site/freight-bol-daylight.jpg" alt="Bill of lading paperwork on a trailer door" />
                <div className="step__overlay">
                  <h3>Send us the load</h3>
                  <p>Lane, dates, and equipment, by email or from your TMS.</p>
                </div>
              </div>
              <div className="step">
                <img src="/site/freight-highway-cornfield.jpg" alt="Truckload trailer on an open highway through farmland" />
                <div className="step__overlay">
                  <h3>Get your rate</h3>
                  <p>Backed by your lane, with no hidden fees.</p>
                </div>
              </div>
              <div className="step">
                <img src="/site/freight-reefer-evening.jpg" alt="Reefer trailers lined up in a yard in the evening" />
                <div className="step__overlay">
                  <h3>We cover and track it</h3>
                  <p>A fraud-screened carrier hauls it, with updates through delivery.</p>
                </div>
              </div>
              <div className="step">
                <img src="/site/freight-dock-dusk.jpg" alt="Trailer at a loading dock at dusk" />
                <div className="step__overlay">
                  <h3>We close it out clean</h3>
                  <p>Same day POD, invoice that matches the quote.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WHY PEER (bento) */}
        <section className="section section--navy" aria-labelledby="why-title">
          <div className="wrap">
            <div className="section__head on-dark">
              <h2 className="heading" id="why-title">Built to be reliable, not just cheap</h2>
              <p className="lead">We take the loads other brokers turn down: oversize freight, hazmat, and the lanes nobody wants to run. If it absolutely has to move, we are built to move it.</p>
            </div>

            <div className="bento mosaic">
              <div className="tile tile--img tile--wide">
                <img src="/site/freight-yard-aerial-night.jpg" alt="Intermodal container yard at night" />
                <span className="tile__overlay">Intermodal</span>
              </div>
              <div className="tile tile--white">
                <span className="tile__label">Owner access</span>
                <span className="tile__stat">24/7</span>
                <span className="tile__desc">Reach an owner directly on any load, at any hour.</span>
              </div>
              <div className="tile tile--white">
                <span className="tile__label">Carrier pay</span>
                <span className="tile__stat">24-48h</span>
                <span className="tile__desc">Fast pay is why the best trucks take our loads first.</span>
              </div>

              <div className="tile tile--white">
                <div className="tile__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="6"/><path d="m8.5 13.5-1.5 7 5-3 5 3-1.5-7"/></svg></div>
                <span className="tile__label">TIA member</span>
                <span className="tile__desc">Held to the Transportation Intermediaries Association anti-fraud standard.</span>
              </div>
              <div className="tile tile--white">
                <div className="tile__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v1.5"/><path d="M3.5 12a8.5 8.5 0 0 1 17 0Z"/><path d="M12 12v6a2.5 2.5 0 0 0 5 0"/></svg></div>
                <span className="tile__label">Fully insured</span>
                <span className="tile__desc">Contingent cargo and auto, general liability, E&amp;O, and cyber.</span>
              </div>
              <div className="tile tile--img tile--wide">
                <img src="/site/freight-oversize-morning.jpg" alt="Flatbed truck hauling an oversize load in the morning" />
                <span className="tile__overlay">Oversize</span>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA (full-bleed photo band) */}
        <section className="cta-band" aria-label="Get started">
          <img className="cta-band__bg" src="/site/freight-highway-cornfield.jpg" alt="" />
          <div className="wrap">
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
    </>
  );
}
