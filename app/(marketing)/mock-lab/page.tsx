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

/** Static miniature of the portal quote request wizard, step 2 (Freight).
 * Faithful to components/portal/rfq/rfq-form.tsx + lib/portal/rfq.ts. */
function QuoteMock() {
  return (
    <div className="mockq">
      <div className="mockq__head">
        <strong>Request a quote</strong>
      </div>
      <ol className="mockq__steps">
        <li className="is-done">
          <span className="mockq__dot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </span>
          Lane &amp; dates
        </li>
        <li className="is-current">
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
        <div className="mockq__field">
          <label>Commodity</label>
          <span className="mockq__input">Packaged chemicals, drums on pallets</span>
        </div>
        <div className="mockq__grid">
          <div className="mockq__field">
            <label>Total weight (lbs)</label>
            <span className="mockq__input">38,000</span>
          </div>
          <div className="mockq__field">
            <label>Pieces / pallets</label>
            <span className="mockq__input">26 pallets</span>
          </div>
        </div>
        <div className="mockq__grid">
          <div className="mockq__field">
            <label>Equipment</label>
            <span className="mockq__input mockq__input--select">
              Dry van 53&apos;
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </span>
          </div>
          <div className="mockq__field">
            <label>Declared cargo value (USD)</label>
            <span className="mockq__input">$45,000</span>
          </div>
        </div>
        <div className="mockq__check">
          <span className="mockq__box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </span>
          Any of this freight is hazardous material
        </div>
      </div>
      <div className="mockq__foot">
        <span className="mockq__note">One of the owners gets back to you within the hour.</span>
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
    </main>
  );
}
