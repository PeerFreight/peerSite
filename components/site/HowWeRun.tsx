"use client";

import { useState } from "react";

/**
 * "We run every load the same way" as a split-screen tab group (the
 * Machinify-style pattern Aaron pointed at): the four steps stack on the
 * left as glass rows over the section photo, the active one expands its
 * stat + description in place, and the frozen product snapshot for that
 * step cross-fades inside one fixed glass pane on the right — no dropdown,
 * no layout jump.
 */

type Step = {
  id: string;
  title: string;
  sub: string;
  statB: string;
  statS: string;
  desc: string;
  icon: React.ReactNode;
  mock: { src: string; width: number; height: number };
};

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const STEPS: Step[] = [
  {
    id: "quoting",
    title: "Transparent quoting",
    sub: "Market comps sent with every rate, so you see why the number is the number.",
    statB: "Real",
    statS: "market comps behind every rate",
    desc: "Every quote comes with the current spot and contract comps for your lane. If the market moves between quotes, you see the new data, and the invoice always matches the rate you approved.",
    icon: (
      <svg viewBox="0 0 24 24" {...STROKE}><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" /></svg>
    ),
    mock: { src: "/site/mock-comps@2x.png", width: 560, height: 257 },
  },
  {
    id: "screening",
    title: "Fraud screened coverage",
    sub: "Every carrier verified through Carrier411 and FMCSA before they touch your freight.",
    statB: "100%",
    statS: "of carriers verified before dispatch",
    desc: "We recheck identity, authority, insurance, and safety history on every load, not only once at signup, because that is where fraud slips in. If anything looks off, the load goes to a different truck.",
    icon: (
      <svg viewBox="0 0 24 24" {...STROKE}><path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
    ),
    mock: { src: "/site/mock-vetting@2x.png", width: 560, height: 229 },
  },
  {
    id: "tracking",
    title: "Proactive tracking",
    sub: "Updates at pickup, in transit, and at delivery, before you think to ask.",
    statB: "24/7",
    statS: "owner access on every load",
    desc: "We surface problems early, while there is still time to fix them. If something goes sideways at 2 a.m., you reach one of the owners on the phone, not a call center.",
    icon: (
      <svg viewBox="0 0 24 24" {...STROKE}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
    ),
    mock: { src: "/site/mock-updates@2x.png", width: 560, height: 210 },
  },
  {
    id: "close",
    title: "A clean close",
    sub: "A signed POD the same day it delivers, and an invoice that matches the quote.",
    statB: "Same day",
    statS: "signed proof of delivery",
    desc: "The signed proof of delivery lands in your inbox the day the load delivers, so your own billing never waits on us. Accessorials are spelled out in writing, with no surprise charges weeks later.",
    icon: (
      <svg viewBox="0 0 24 24" {...STROKE}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="m9 15 2 2 4-4" /></svg>
    ),
    mock: { src: "/site/mock-close@2x.png", width: 560, height: 171 },
  },
];

export function HowWeRun() {
  const [active, setActive] = useState(0);

  return (
    <div className="howrun" data-reveal>
      <div className="howrun__tabs" role="tablist" aria-label="How we run a load">
        {STEPS.map((s, i) => (
          <div key={s.id} className={`howtab${i === active ? " is-active" : ""}`}>
            <button
              type="button"
              className="howtab__btn"
              role="tab"
              id={`howtab-${s.id}`}
              aria-selected={i === active}
              aria-controls={`howpanel-${s.id}`}
              onClick={() => setActive(i)}
            >
              <span className="howtab__icon" aria-hidden="true">{s.icon}</span>
              <span className="howtab__titles">
                <span className="howtab__title">{s.title}</span>
                <span className="howtab__sub">{s.sub}</span>
              </span>
              <span className="howtab__arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </span>
            </button>
            <div
              className="howtab__body"
              role="tabpanel"
              id={`howpanel-${s.id}`}
              aria-labelledby={`howtab-${s.id}`}
              aria-hidden={i !== active}
            >
              <div className="howtab__clip">
                <div className="howtab__content">
                  <div className="howtab__stat"><b>{s.statB}</b><span>{s.statS}</span></div>
                  <p className="howtab__desc">{s.desc}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* One glass pane; the four frozen snapshots stack in the same grid
          cell and cross-fade, so the pane never changes size between steps. */}
      <div className="howrun__panel glass" aria-hidden="true">
        {STEPS.map((s, i) => (
          <img
            key={s.id}
            className={`mockshot howrun__mock${i === active ? " is-active" : ""}`}
            src={s.mock.src}
            alt=""
            width={s.mock.width}
            height={s.mock.height}
            loading="lazy"
          />
        ))}
      </div>
    </div>
  );
}
