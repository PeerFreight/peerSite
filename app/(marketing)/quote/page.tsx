import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ChromeScript } from "@/components/site/ChromeScript";

export const metadata: Metadata = {
  title: "Get a Quote - Peer Freight",
  description:
    "Request a freight quote from Peer Freight. Tell us about your lane and we will come back with a market-backed rate.",
  alternates: { canonical: "https://www.peer-freight.com/quote" },
  robots: { index: false },
};

export default function QuotePage() {
  return (
    <>
      <SiteHeader cta={{ href: "/quote", label: "Get a Quote" }} />

      <main id="main">
        <section className="subhero" aria-labelledby="quote-title" style={{ paddingBottom: "clamp(2rem,4vw,3rem)" }}>
          <img className="subhero__bg" src="/site/freight-highway-cornfield.jpg" alt="" />
          <div className="wrap">
            <h1 className="display" id="quote-title" style={{ fontSize: "clamp(2.4rem,5vw,4rem)" }}>Get a quote</h1>
            <p className="lead">Tell us about your lane and we will come back with a market-backed rate.</p>
          </div>
        </section>

        <section className="section section--paper" aria-label="Request a quote">
          <div className="wrap">
            <div className="formwrap">
              <div className="quote-aside">
                <h2>What you can expect</h2>
                <p className="lead">One of the owners gets back to you, usually within the hour during business hours.</p>
                <ul>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> A rate backed by real market comps</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> Carriers we screen for fraud ourselves</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> Hazmat-rated capacity when you need it</li>
                </ul>
              </div>

              <div>
                <div className="form__success" id="form-success" hidden>
                  <h2>Request received</h2>
                  <p>Your quote request is in our inbox. One of the owners will get back to you shortly.</p>
                  <a className="btn btn--navy" href="/">
                    Back to home
                    <span className="btn__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg></span>
                  </a>
                </div>

                <form className="form" id="quote-form" action="https://formsubmit.co/team@peer-freight.com" method="post">
                  <input type="hidden" name="_subject" defaultValue="New quote request — peer-freight.com" />
                  <input type="hidden" name="_template" defaultValue="table" />
                  <input type="hidden" name="_captcha" defaultValue="false" />
                  <input type="hidden" name="_next" defaultValue="https://www.peer-freight.com/quote?sent=1" />
                  <input type="text" name="_honey" style={{ display: "none" }} tabIndex={-1} autoComplete="off" aria-hidden="true" />

                  <div className="form__row">
                    <div className="field">
                      <label htmlFor="company">Company</label>
                      <input id="company" name="company" type="text" autoComplete="organization" required />
                    </div>
                    <div className="field">
                      <label htmlFor="name">Your name</label>
                      <input id="name" name="name" type="text" autoComplete="name" required />
                    </div>
                  </div>
                  <div className="form__row">
                    <div className="field">
                      <label htmlFor="email">Email</label>
                      <input id="email" name="email" type="email" autoComplete="email" required />
                    </div>
                    <div className="field">
                      <label htmlFor="phone">Phone (optional)</label>
                      <input id="phone" name="phone" type="tel" autoComplete="tel" />
                    </div>
                  </div>
                  <div className="form__row">
                    <div className="field">
                      <label htmlFor="origin">Origin (city, state, ZIP)</label>
                      <input id="origin" name="origin" type="text" placeholder="e.g. Stockton, CA 95206" required />
                    </div>
                    <div className="field">
                      <label htmlFor="destination">Destination (city, state, ZIP)</label>
                      <input id="destination" name="destination" type="text" placeholder="e.g. Reno, NV 89502" required />
                    </div>
                  </div>
                  <div className="form__row">
                    <div className="field">
                      <label htmlFor="pickup">Pickup date</label>
                      <input id="pickup" name="pickup" type="date" required />
                    </div>
                    <div className="field">
                      <label htmlFor="delivery">Delivery date (optional)</label>
                      <input id="delivery" name="delivery" type="date" />
                    </div>
                  </div>
                  <div className="form__row">
                    <div className="field">
                      <label htmlFor="equipment">Equipment</label>
                      <select id="equipment" name="equipment" required defaultValue="">
                        <option value="" disabled>Select equipment</option>
                        <option>Dry van</option>
                        <option>Reefer</option>
                        <option>Flatbed</option>
                        <option>Tanker</option>
                        <option>Drayage / container</option>
                        <option>Specialized / oversize</option>
                        <option>Not sure yet</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="loadtype">Load type</label>
                      <select id="loadtype" name="load_type" defaultValue="Full truckload">
                        <option>Full truckload</option>
                        <option>Partial / LTL</option>
                        <option>Not sure yet</option>
                      </select>
                    </div>
                  </div>
                  <div className="form__row">
                    <div className="field">
                      <label htmlFor="commodity">Commodity</label>
                      <input id="commodity" name="commodity" type="text" placeholder="What are we hauling?" required />
                    </div>
                    <div className="field">
                      <label htmlFor="weight">Weight</label>
                      <input id="weight" name="weight" type="text" placeholder="e.g. 42,000 lbs" required />
                    </div>
                  </div>
                  <div className="form__row">
                    <div className="field">
                      <label htmlFor="pieces">Pallets / piece count (optional)</label>
                      <input id="pieces" name="pieces" type="text" placeholder="e.g. 24 pallets" />
                    </div>
                    <div className="field">
                      <label htmlFor="dims">Dimensions (optional)</label>
                      <input id="dims" name="dimensions" type="text" placeholder="L × W × H, for flatbed or oversize" />
                    </div>
                  </div>
                  <div className="form__row">
                    <div className="field">
                      <label htmlFor="hazmat">Is this hazmat?</label>
                      <select id="hazmat" name="hazmat" defaultValue="No">
                        <option>No</option>
                        <option>Yes</option>
                        <option>Not sure</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="hazmat-details">Hazmat details (if yes)</label>
                      <input id="hazmat-details" name="hazmat_details" type="text" placeholder="UN number, hazard class, packing group" />
                    </div>
                  </div>
                  <div className="form__row">
                    <div className="field">
                      <label htmlFor="temp">Temperature requirement (optional)</label>
                      <input id="temp" name="temperature" type="text" placeholder="e.g. keep at 34 to 38°F" />
                    </div>
                    <div className="field">
                      <label htmlFor="frequency">How often does this ship?</label>
                      <select id="frequency" name="frequency" defaultValue="One-time load">
                        <option>One-time load</option>
                        <option>Weekly</option>
                        <option>Monthly</option>
                        <option>Ongoing lane</option>
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="notes">Anything else we should know?</label>
                    <textarea id="notes" name="notes" placeholder="Accessorials (liftgate, tarps, team service), appointment requirements, reference numbers…"></textarea>
                  </div>
                  <button className="btn btn--yellow" type="submit">
                    Send request
                    <span className="btn__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg></span>
                  </button>
                  <p className="form__note">Goes straight to the owners. Shipping hazmat? Keep the SDS handy.</p>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <ChromeScript formId="quote-form" />
    </>
  );
}
