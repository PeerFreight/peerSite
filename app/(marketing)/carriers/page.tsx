import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ChromeScript } from "@/components/site/ChromeScript";

export const metadata: Metadata = {
  title: "Haul for Peer Freight - Get paid in 24 to 48 hours",
  description:
    "Haul for Peer Freight. We pay carriers within 24 to 48 hours, we put detention and TONU in writing, and we run accurate loads with no surprises at the dock.",
  alternates: { canonical: "https://www.peer-freight.com/carriers" },
  openGraph: {
    type: "website",
    siteName: "Peer Freight",
    title: "Haul for Peer Freight - Get paid in 24 to 48 hours",
    description:
      "We pay carriers within 24 to 48 hours, put detention and TONU in writing, and run accurate loads with no surprises at the dock.",
    url: "https://www.peer-freight.com/carriers",
    images: [
      {
        url: "https://www.peer-freight.com/site/freight-og-card.png",
        secureUrl: "https://www.peer-freight.com/site/freight-og-card.png",
        type: "image/png",
        width: 1200,
        height: 630,
        alt: "Peer Freight, get loaded and get paid fast",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Haul for Peer Freight - Get paid in 24 to 48 hours",
    description:
      "We pay carriers within 24 to 48 hours, put detention and TONU in writing, and run accurate loads.",
    images: ["https://www.peer-freight.com/site/freight-og-card.png"],
  },
};

export default function CarriersPage() {
  return (
    <>
      <SiteHeader cta={{ href: "/carrier-setup", label: "Get Set Up" }} />

      <main id="main">
        {/* Hero parity with home: two columns, glass pane over the photo,
            frozen carrier-setup form mock (tools/freeze-mocks.mjs). */}
        <section className="hero hero--home hero--carriers" aria-labelledby="carrier-title">
          <img className="hero__bg" src="/site/freight-oversize-morning.jpg" alt="" fetchPriority="high" />
          <div className="wrap">
            <div className="hero__grid">
              <div className="hero__content">
                <h1 id="carrier-title" className="display">Get loaded and get paid fast</h1>
                <p className="hero__sub">We pay you within 24 to 48 hours of a clean POD, put detention, layover, and TONU in writing on the rate confirmation, and run loads with real weights and real appointment times. Upload your POD from your phone and you are done.</p>
                <div className="hero__cta">
                  <a className="btn btn--yellow" href="/carrier-setup">
                    Get Set Up
                    <span className="btn__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg></span>
                  </a>
                </div>
              </div>

              <div className="hero__panel glass" aria-hidden="true">
                <img className="mockshot" src="/site/mock-carrier@2x.png" alt="" width={640} height={461} fetchPriority="high" />
              </div>
            </div>
          </div>
        </section>

        <section className="section section--paper" aria-labelledby="perks-title">
          <div className="wrap">
            <div className="section__head">
              <h2 className="heading" id="perks-title">The loads you come back for</h2>
            </div>
            <div className="perks mosaic">
              <article className="perk">
                <div className="perk__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 6.5c0-2-2.2-3-5-3s-5 1-5 3.2c0 4.8 10 2.8 10 7.6 0 2.2-2.2 3.2-5 3.2s-5-1.2-5-3.2"/></svg></div>
                <h3>Fast pay</h3>
                <p>24 to 48 hours standard, same day when you need it. Skip your factor&apos;s fee.</p>
              </article>
              <article className="perk">
                <div className="perk__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/><path d="m17 16 2 2 3-3"/></svg></div>
                <h3>Accessorials honored</h3>
                <p>Detention, layover, and TONU, in writing on the rate confirmation.</p>
              </article>
              <div className="tile--img">
                <img src="/site/freight-bol-daylight.jpg" alt="Bill of lading paperwork on a trailer door" loading="lazy" />
              </div>
              {/* Frozen delivery-documents snapshot (tools/freeze-mocks.mjs) —
                  pairs with the easy-paperwork perk. */}
              <div className="tile--asset" aria-hidden="true">
                <img className="mockshot" src="/site/mock-close@2x.png" alt="" width={560} height={171} loading="lazy" />
              </div>
              <article className="perk">
                <div className="perk__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>
                <h3>Accurate loads</h3>
                <p>Real weights and real appointment times.</p>
              </article>
              <article className="perk">
                <div className="perk__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M17 3l4 4-9 9H8v-4Z"/></svg></div>
                <h3>Easy paperwork</h3>
                <p>Upload your POD from your phone. No endless check calls.</p>
              </article>
              <div className="tile--img">
                <img src="/site/freight-reefer-evening.jpg" alt="Refrigerated trailer at a dock in the evening" loading="lazy" />
              </div>
              <article className="perk">
                <div className="perk__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg></div>
                <h3>A broker that does not ghost</h3>
                <p>Active authority, bonded, and we pay on time.</p>
              </article>
              <article className="perk">
                <div className="perk__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4"/><path d="M12 17h.01"/></svg></div>
                <h3>Hazmat and repeat freight</h3>
                <p>Steady lanes for carriers rated to haul hazmat.</p>
              </article>
              <div className="tile--img tile--wide">
                <img src="/site/freight-drayage-port.jpg" alt="Container trucks working a port terminal" loading="lazy" />
              </div>
            </div>
          </div>
        </section>

        {/* One-packet CTA: the same full-bleed gold band treatment as the
            bottom of home. */}
        <section className="cta-band" aria-label="Get set up">
          <img className="cta-band__bg" src="/site/freight-dock-dusk.jpg" alt="" />
          <div className="wrap">
            <div className="cta-band__top">
              <div>
                <h2>One packet, then you are cleared</h2>
                <p className="lead">Tell us who you are, we verify your authority and insurance, and you are set up for our loads.</p>
              </div>
            </div>
            <div className="cta-bar">
              <strong>Ready to haul for us?</strong>
              <a className="btn btn--navy" href="/carrier-setup">
                Get Set Up
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
