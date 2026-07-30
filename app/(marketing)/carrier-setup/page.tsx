import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ChromeScript } from "@/components/site/ChromeScript";

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
                <div className="form__success" id="form-success" hidden>
                  <h2>Request received</h2>
                  <p>Your setup request is in our inbox. We will verify your authority and reply with the rest of the packet, usually the same day.</p>
                  <a className="btn btn--navy" href="/carriers">
                    Back to carriers
                    <span className="btn__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg></span>
                  </a>
                </div>

                <form className="form" id="setup-form" action="https://formsubmit.co/team@peer-freight.com" method="post">
                  <input type="hidden" name="_subject" defaultValue="New carrier setup — peer-freight.com" />
                  <input type="hidden" name="_template" defaultValue="table" />
                  <input type="hidden" name="_captcha" defaultValue="false" />
                  <input type="hidden" name="_next" defaultValue="https://www.peer-freight.com/carrier-setup?sent=1" />
                  <input type="text" name="_honey" style={{ display: "none" }} tabIndex={-1} autoComplete="off" aria-hidden="true" />

                  <div className="form__row">
                    <div className="field">
                      <label htmlFor="company">Company (legal name)</label>
                      <input id="company" name="company" type="text" autoComplete="organization" required />
                    </div>
                    <div className="field">
                      <label htmlFor="name">Your name</label>
                      <input id="name" name="name" type="text" autoComplete="name" required />
                    </div>
                  </div>
                  <div className="form__row">
                    <div className="field">
                      <label htmlFor="mc">MC number</label>
                      <input id="mc" name="mc_number" type="text" inputMode="numeric" placeholder="e.g. MC 123456" required />
                    </div>
                    <div className="field">
                      <label htmlFor="dot">USDOT number</label>
                      <input id="dot" name="usdot_number" type="text" inputMode="numeric" placeholder="e.g. 1234567" required />
                    </div>
                  </div>
                  <div className="form__row">
                    <div className="field">
                      <label htmlFor="email">Email</label>
                      <input id="email" name="email" type="email" autoComplete="email" required />
                    </div>
                    <div className="field">
                      <label htmlFor="phone">Phone</label>
                      <input id="phone" name="phone" type="tel" autoComplete="tel" required />
                    </div>
                  </div>
                  <div className="form__row">
                    <div className="field">
                      <label htmlFor="base">Home base (city, state)</label>
                      <input id="base" name="home_base" type="text" placeholder="e.g. Fresno, CA" required />
                    </div>
                    <div className="field">
                      <label htmlFor="trucks">Number of trucks</label>
                      <input id="trucks" name="truck_count" type="text" inputMode="numeric" placeholder="e.g. 3" required />
                    </div>
                  </div>
                  <fieldset className="field field--checks">
                    <legend>Equipment you run</legend>
                    <div className="checks">
                      <label className="check"><input type="checkbox" name="equipment" value="Dry van" /><span>Dry van</span></label>
                      <label className="check"><input type="checkbox" name="equipment" value="Reefer" /><span>Reefer</span></label>
                      <label className="check"><input type="checkbox" name="equipment" value="Flatbed" /><span>Flatbed</span></label>
                      <label className="check"><input type="checkbox" name="equipment" value="Tanker" /><span>Tanker</span></label>
                      <label className="check"><input type="checkbox" name="equipment" value="Drayage" /><span>Drayage</span></label>
                      <label className="check"><input type="checkbox" name="equipment" value="Specialized" /><span>Specialized</span></label>
                    </div>
                  </fieldset>
                  <div className="form__row">
                    <div className="field">
                      <label htmlFor="hazmat">Hazmat certified drivers?</label>
                      <select id="hazmat" name="hazmat" defaultValue="No">
                        <option>No</option>
                        <option>Yes</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="pay">How do you want to get paid?</label>
                      <select id="pay" name="payment" defaultValue="Direct deposit">
                        <option>Direct deposit</option>
                        <option>Factoring company</option>
                      </select>
                    </div>
                  </div>
                  <div className="form__row">
                    <div className="field">
                      <label htmlFor="lanes">Preferred lanes or regions (optional)</label>
                      <input id="lanes" name="lanes" type="text" placeholder="e.g. CA to NV, West Coast" />
                    </div>
                    <div className="field">
                      <label htmlFor="factor">Factoring company name (if any)</label>
                      <input id="factor" name="factoring_company" type="text" placeholder="e.g. OTR Solutions" />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="notes">Anything else we should know?</label>
                    <textarea id="notes" name="notes" placeholder="Endorsements, trailer specs, teams…"></textarea>
                  </div>
                  <button className="btn btn--yellow" type="submit">
                    Send request
                    <span className="btn__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg></span>
                  </button>
                  <p className="form__note">Goes straight to the owners. We never ask for banking details over a web form; those come with the packet.</p>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <ChromeScript formId="setup-form" />
    </>
  );
}
