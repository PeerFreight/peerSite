"use client";

import { useState } from "react";

/**
 * "We run every load the same way" as a photo-backed split: the four steps
 * sit on the left as a quiet 2x2 grid — gold disc, uppercase title, one line
 * of copy, no glass chrome on the cells themselves — and the active step's
 * frozen product snapshot cross-fades inside the one glass pane on the
 * right. All four steps stay visible at once, so neither column towers over
 * the other; the glass outline lives only on the generated asset.
 */

type Step = {
  id: string;
  title: string;
  sub: string;
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
    icon: (
      <svg viewBox="0 0 24 24" {...STROKE}><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" /></svg>
    ),
    mock: { src: "/site/mock-comps@2x.png", width: 560, height: 286 },
  },
  {
    id: "screening",
    title: "Fraud screened coverage",
    sub: "Every carrier verified through Carrier411 and FMCSA before they touch your freight.",
    icon: (
      <svg viewBox="0 0 24 24" {...STROKE}><path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
    ),
    mock: { src: "/site/mock-vetting@2x.png", width: 560, height: 275 },
  },
  {
    id: "tracking",
    title: "Proactive tracking",
    sub: "Updates at pickup, in transit, and at delivery, before you think to ask.",
    icon: (
      <svg viewBox="0 0 24 24" {...STROKE}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
    ),
    mock: { src: "/site/mock-updates@2x.png", width: 560, height: 239 },
  },
  {
    id: "close",
    title: "A clean close",
    sub: "A signed POD the same day it delivers, and an invoice that matches the quote.",
    icon: (
      <svg viewBox="0 0 24 24" {...STROKE}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="m9 15 2 2 4-4" /></svg>
    ),
    mock: { src: "/site/mock-close@2x.png", width: 560, height: 275 },
  },
];

export function HowWeRun() {
  const [active, setActive] = useState(0);

  return (
    <div className="howrun" data-reveal>
      <div className="howrun__grid" role="group" aria-label="How we run a load">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`howcell${i === active ? " is-active" : ""}`}
            aria-pressed={i === active}
            onClick={() => setActive(i)}
          >
            <span className="howcell__icon" aria-hidden="true">{s.icon}</span>
            <span className="howcell__title">{s.title}</span>
            <span className="howcell__sub">{s.sub}</span>
          </button>
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
