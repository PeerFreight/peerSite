"use client";

import { useActionState } from "react";
import { submitCarrierSetup, type CarrierSetupFormState } from "./actions";

/**
 * The carrier setup form, posting to our own server action (Resend to
 * team@peer-freight.com) instead of the old FormSubmit relay. Markup and
 * classes are the static site's; the success block replaces the ?sent=1
 * redirect the relay used, and server actions keep it working without JS.
 */
export function CarrierSetupForm() {
  const [state, formAction, pending] = useActionState<CarrierSetupFormState, FormData>(
    submitCarrierSetup,
    null,
  );

  if (state?.sent) {
    return (
      <div className="form__success">
        <h2>Request received</h2>
        <p>Your setup request is in our inbox. We will verify your authority and reply with the rest of the packet, usually the same day.</p>
        <a className="btn btn--navy" href="/carriers">
          Back to carriers
          <span className="btn__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg></span>
        </a>
      </div>
    );
  }

  return (
    <form className="form" id="setup-form" action={formAction}>
      {/* Honeypot: humans never see it; bots that fill it get a fake success. */}
      <input
        type="text"
        name="website"
        style={{ display: "none" }}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

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
      {state?.formError ? (
        <p className="form__note" role="alert" style={{ color: "#b3261e", fontWeight: 700 }}>
          {state.formError}
        </p>
      ) : null}
      <button className="btn btn--yellow" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send request"}
        <span className="btn__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg></span>
      </button>
      <p className="form__note">Goes straight to the owners. We never ask for banking details over a web form; those come with the packet.</p>
    </form>
  );
}
