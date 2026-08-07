import type { Metadata } from "next";

/**
 * Mock lab: the source of truth for the frozen product snapshots embedded on
 * the marketing pages. Each mock renders at its natural export width inside
 * an anchored frame; `tools/freeze-mocks.mjs` screenshots each frame with
 * headless Chrome at @2x and writes public/site/mock-*@2x.png.
 *
 * If the portal design changes, update the JSX here and rerun:
 *   node tools/freeze-mocks.mjs   (dev server must be on :3000)
 *
 * Never linked from anywhere; noindex keeps crawlers out.
 */
export const metadata: Metadata = {
  title: "Mock lab",
  robots: { index: false, follow: false },
};

/** Static miniature of the portal Loads page (the homepage hero card). */
function LoadsMock() {
  return (
    <div className="mock">
      <div className="mock__nav">
        <div className="mock__brand">
          <img src="/site/peer-logo-mark.png" alt="" />
          <span>Peer <b>Freight</b></span>
        </div>
        <ul className="mock__menu">
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Dashboard
          </li>
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
            Quotes
          </li>
          <li className="is-active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8h12v8H2z"/><path d="M14 11h4l3 3v2h-7z"/><circle cx="6.5" cy="17.5" r="1.7"/><circle cx="17" cy="17.5" r="1.7"/></svg>
            Loads
          </li>
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 8h8"/><path d="M8 12h8"/></svg>
            Invoices
          </li>
        </ul>
        <div className="mock__user">
          <span className="mock__avatar">DK</span>
          <span className="mock__userblock">
            <b>Dana K.</b>
            <i>Shipper</i>
          </span>
        </div>
      </div>
      <div className="mock__main">
        <div className="mock__head">
          <strong>Loads</strong>
          <span className="mock__quote-btn">Request a quote</span>
        </div>
        <div className="mock__stats">
          <div className="mock__stat"><b>4</b><span>In transit</span></div>
          <div className="mock__stat"><b>98%</b><span>On time</span></div>
          <div className="mock__stat"><b>12</b><span>Delivered</span></div>
        </div>
        <div className="mock__panel">
          <div className="mock__row">
            <span className="mock__ref">PEER-51427</span>
            <div className="mock__laneblock">
              <span className="mock__lane">Sacramento, CA &rarr; Reno, NV</span>
              <span className="mock__meta">Pickup Aug 7 &middot; ETA today 5:30 PM</span>
            </div>
            <span className="mock__badge mock__badge--gold">In transit</span>
          </div>
          <div className="mock__row">
            <span className="mock__ref">PEER-46108</span>
            <div className="mock__laneblock">
              <span className="mock__lane">Houston, TX &rarr; Baton Rouge, LA</span>
              <span className="mock__meta">Pickup Aug 8 &middot; Reefer 53&apos;</span>
            </div>
            <span className="mock__badge mock__badge--navy">Booked</span>
          </div>
          <div className="mock__row">
            <span className="mock__ref">PEER-50871</span>
            <div className="mock__laneblock">
              <span className="mock__lane">Stockton, CA &rarr; Salt Lake City, UT</span>
              <span className="mock__meta">Pickup Aug 8 &middot; Dry van 53&apos;</span>
            </div>
            <span className="mock__badge mock__badge--gold">In transit</span>
          </div>
          <div className="mock__row">
            <span className="mock__ref">PEER-48293</span>
            <div className="mock__laneblock">
              <span className="mock__lane">Sacramento, CA &rarr; Fairfield, CA</span>
              <span className="mock__meta">Delivered Aug 6 &middot; Dry van 53&apos;</span>
            </div>
            <span className="mock__badge mock__badge--green">Delivered</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Static miniature of the portal quote request wizard, step 1 (Lane & dates)
 * — the shortest step, so the split section beside it stays balanced.
 * Faithful to components/portal/rfq/rfq-form.tsx + lib/portal/rfq.ts. */
function QuoteMock() {
  return (
    <div className="mockq">
      <div className="mockq__head">
        <strong>Request a quote</strong>
      </div>
      <ol className="mockq__steps">
        <li className="is-current">
          <span className="mockq__dot">1</span>
          Lane &amp; dates
        </li>
        <li>
          <span className="mockq__dot">2</span>
          Freight
        </li>
        <li>
          <span className="mockq__dot">3</span>
          Services &amp; extras
        </li>
        <li>
          <span className="mockq__dot">4</span>
          Review &amp; submit
        </li>
      </ol>
      <div className="mockq__card">
        <div className="mockq__grid">
          <div className="mockq__field">
            <label>Pickup city</label>
            <span className="mockq__input">Sacramento, CA</span>
          </div>
          <div className="mockq__field">
            <label>Delivery city</label>
            <span className="mockq__input">Reno, NV</span>
          </div>
        </div>
        <div className="mockq__grid">
          <div className="mockq__field">
            <label>Pickup date</label>
            <span className="mockq__input mockq__input--select">
              Fri, Aug 8
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </span>
          </div>
          <div className="mockq__field">
            <label>Delivery date</label>
            <span className="mockq__input mockq__input--select">
              Sat, Aug 9
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </span>
          </div>
        </div>
        <div className="mockq__grid">
          <div className="mockq__field">
            <label>Pickup window</label>
            <span className="mockq__input">8 AM &ndash; 12 PM</span>
          </div>
          <div className="mockq__field">
            <label>Delivery window</label>
            <span className="mockq__input">By 3 PM</span>
          </div>
        </div>
      </div>
      <div className="mockq__foot">
        <span className="mockq__note">Takes about two minutes.</span>
        <span className="mockq__btn">Continue</span>
      </div>
    </div>
  );
}

/** Static miniature of the "Where your freight is" card on the portal load
 * page. Faithful to components/portal/load-progress.tsx, lib/portal/loads.ts,
 * and app/(portal)/(app)/loads/[id]/page.tsx. The em dash in the timeline row
 * is the product's own UI text (event-timeline.tsx), verbatim inside a
 * decorative image. */
function TrackMock() {
  return (
    <div className="mockt">
      <div className="mockt__head">
        <strong>Where your freight is</strong>
        <span className="mock__badge mock__badge--gold">In transit</span>
      </div>
      <p className="mockt__meta">PEER-51427 &middot; Sacramento, CA &rarr; Reno, NV</p>
      <ol className="mockt__path">
        <li className="is-done"><span className="mockt__dot" />Booked</li>
        <li className="is-done"><span className="mockt__line" /><span className="mockt__dot" />Dispatched</li>
        <li className="is-current"><span className="mockt__line" /><span className="mockt__dot" />In transit</li>
        <li><span className="mockt__line mockt__line--todo" /><span className="mockt__dot" />Delivered</li>
        <li><span className="mockt__line mockt__line--todo" /><span className="mockt__dot" />Invoiced</li>
        <li><span className="mockt__line mockt__line--todo" /><span className="mockt__dot" />Closed</li>
      </ol>
      <div className="mockt__rule" />
      <ul className="mockt__events">
        <li>
          <b>Picked up &mdash; in transit</b>
          <span>Aug 7, 8:12 AM PT</span>
        </li>
        <li>
          <b>Carrier dispatched</b>
          <span>Aug 7, 6:40 AM PT</span>
        </li>
      </ul>
      <div className="mockt__foot">
        <span className="mockt__btn">View live tracking &rarr;</span>
        <span className="mockt__note">Follow your delivery on our tracking partner&apos;s page. No login needed.</span>
      </div>
    </div>
  );
}

/** Accordion step 1, "Transparent quoting": a quote card with the market
 * comps that ship with every rate. */
function CompsMock() {
  return (
    <div className="mocka">
      <div className="mocka__head">
        <strong>Your quote</strong>
        <span className="mock__badge mock__badge--gold">Quote ready</span>
      </div>
      <p className="mocka__meta">Sacramento, CA &rarr; Reno, NV &middot; Dry van 53&apos;</p>
      <div className="mocka__amount">
        <b>$1,840</b>
        <span>All-in rate</span>
      </div>
      <div className="mocka__rule" />
      <ul className="mocka__rows">
        <li>
          <b>Spot average</b>
          <span>$1,795</span>
        </li>
        <li>
          <b>Contract average</b>
          <span>$1,910</span>
        </li>
      </ul>
      <div className="mocka__foot">
        <span className="mocka__note">Comps included with every rate</span>
      </div>
    </div>
  );
}

/** Accordion step 2, "Fraud screened coverage": the carrier check card. */
function VettingMock() {
  return (
    <div className="mocka">
      <div className="mocka__head">
        <strong>Carrier vetting</strong>
        <span className="mock__badge mock__badge--green">Cleared</span>
      </div>
      <p className="mocka__meta">Summit Ridge Transport &middot; MC 118422</p>
      <div className="mocka__rule" />
      <ul className="mocka__rows">
        <li className="mocka__check">
          <span className="mocka__tick" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
          Carrier411 &middot; no fraud flags
        </li>
        <li className="mocka__check">
          <span className="mocka__tick" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
          FMCSA authority &middot; active
        </li>
        <li className="mocka__check">
          <span className="mocka__tick" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
          Insurance &middot; verified with the producer
        </li>
        <li className="mocka__check">
          <span className="mocka__tick" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
          Identity &middot; confirmed at dispatch
        </li>
      </ul>
    </div>
  );
}

/** Accordion step 3, "Proactive tracking": the update feed (distinct from the
 * progress-path track mock used on the Why Peer section). Event labels are the
 * product's real timeline vocabulary (event-timeline.tsx), em dash verbatim. */
function UpdatesMock() {
  return (
    <div className="mocka">
      <div className="mocka__head">
        <strong>Load updates</strong>
        <span className="mock__badge mock__badge--gold">In transit</span>
      </div>
      <div className="mocka__rule" />
      <ul className="mocka__rows">
        <li>
          <b>Carrier dispatched</b>
          <span>6:40 AM PT</span>
        </li>
        <li>
          <b>Picked up &mdash; in transit</b>
          <span>8:12 AM PT</span>
        </li>
        <li>
          <b>ETA today</b>
          <span>5:30 PM</span>
        </li>
      </ul>
      <div className="mocka__foot">
        <span className="mocka__note">Live tracking link with every dispatch. No login needed.</span>
      </div>
    </div>
  );
}

/** Accordion step 4, "A clean close": the delivery documents card. */
function CloseMock() {
  return (
    <div className="mocka">
      <div className="mocka__head">
        <strong>Delivery documents</strong>
        <span className="mock__badge mock__badge--green">Posted same day</span>
      </div>
      <p className="mocka__meta">Proof of delivery &middot; signed at receiver</p>
      <div className="mocka__rule" />
      <ul className="mocka__rows">
        <li>
          <b>Invoice INV-2041</b>
          <span>$1,840.00 &middot; matches the quote</span>
        </li>
        <li>
          <b>Accessorials</b>
          <span>In writing, none this load</span>
        </li>
      </ul>
    </div>
  );
}

/** The load details card for the specialties mosaic: hazmat freight in the
 * portal's vocabulary. */
function FreightMock() {
  return (
    <div className="mocka">
      <div className="mocka__head">
        <strong>Load details</strong>
        <span className="mock__badge mock__badge--gold">Hazmat</span>
      </div>
      <p className="mocka__meta">PEER-51427 &middot; Sacramento, CA &rarr; Reno, NV</p>
      <div className="mocka__rule" />
      <ul className="mocka__rows">
        <li>
          <b>Equipment</b>
          <span>Tanker 42&apos;</span>
        </li>
        <li>
          <b>Commodity</b>
          <span>Packaged chemicals, drums on pallets</span>
        </li>
        <li>
          <b>Placards</b>
          <span>Supplied and posted</span>
        </li>
      </ul>
    </div>
  );
}

/** Miniature of the real carrier setup form (carrier-setup-form.tsx), for the
 * /carriers hero pane. */
function CarrierMock() {
  return (
    <div className="mockq">
      <div className="mockq__head">
        <strong>Get set up</strong>
      </div>
      <div className="mockq__card">
        <div className="mockq__grid">
          <div className="mockq__field">
            <label>Company (legal name)</label>
            <span className="mockq__input">Summit Ridge Transport LLC</span>
          </div>
          <div className="mockq__field">
            <label>Your name</label>
            <span className="mockq__input">Ray Delgado</span>
          </div>
        </div>
        <div className="mockq__grid">
          <div className="mockq__field">
            <label>MC number</label>
            <span className="mockq__input">MC 118422</span>
          </div>
          <div className="mockq__field">
            <label>USDOT number</label>
            <span className="mockq__input">3120984</span>
          </div>
        </div>
        <div className="mockq__field">
          <label>Equipment you run</label>
          <div className="mockq__pills">
            <span className="mockq__pill is-on">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              Dry van
            </span>
            <span className="mockq__pill is-on">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              Reefer
            </span>
            <span className="mockq__pill">Flatbed</span>
            <span className="mockq__pill is-on">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              Tanker
            </span>
            <span className="mockq__pill">Drayage</span>
          </div>
        </div>
        <div className="mockq__grid">
          <div className="mockq__field">
            <label>Hazmat certified drivers?</label>
            <span className="mockq__input mockq__input--select">
              Yes
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </span>
          </div>
          <div className="mockq__field">
            <label>Home base (city, state)</label>
            <span className="mockq__input">Fresno, CA</span>
          </div>
        </div>
      </div>
      <div className="mockq__foot">
        <span className="mockq__note">Goes straight to the owners.</span>
        <span className="mockq__btn">Send request</span>
      </div>
    </div>
  );
}

export default function MockLabPage() {
  return (
    <main className="lab">
      <div className="lab__frame lab__frame--loads" id="loads">
        <LoadsMock />
      </div>
      <div className="lab__frame" id="quote">
        <QuoteMock />
      </div>
      <div className="lab__frame" id="track">
        <TrackMock />
      </div>
      <div className="lab__frame lab__frame--sm" id="comps">
        <CompsMock />
      </div>
      <div className="lab__frame lab__frame--sm" id="vetting">
        <VettingMock />
      </div>
      <div className="lab__frame lab__frame--sm" id="updates">
        <UpdatesMock />
      </div>
      <div className="lab__frame lab__frame--sm" id="close">
        <CloseMock />
      </div>
      <div className="lab__frame lab__frame--sm" id="freight">
        <FreightMock />
      </div>
      <div className="lab__frame" id="carrier">
        <CarrierMock />
      </div>
    </main>
  );
}
