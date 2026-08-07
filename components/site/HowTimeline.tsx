"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The four "Covering a load" steps as a horizontal timeline under the split:
 * a hairline track fills and the steps check off as the row scrolls up the
 * viewport. Scroll-linked only — it never grabs or retimes the scroll itself.
 */

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const STEPS = [
  {
    label: "Send us the load",
    icon: <svg viewBox="0 0 24 24" {...STROKE}><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>,
  },
  {
    label: "Get your rate",
    icon: <svg viewBox="0 0 24 24" {...STROKE}><path d="M12 2v20" /><path d="M17 6.5c0-2-2.2-3-5-3s-5 1-5 3.2c0 4.8 10 2.8 10 7.6 0 2.2-2.2 3.2-5 3.2s-5-1.2-5-3.2" /></svg>,
  },
  {
    label: "We cover and track it",
    icon: <svg viewBox="0 0 24 24" {...STROKE}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>,
  },
  {
    label: "We close it out clean",
    icon: <svg viewBox="0 0 24 24" {...STROKE}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="m9 15 2 2 4-4" /></svg>,
  },
];

export function HowTimeline() {
  const ref = useRef<HTMLOListElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Fill while the row climbs from 92% of the viewport up to 40%: about
      // half a screen of travel, so the checks pace with a calm scroll.
      const p = (vh * 0.92 - rect.top) / (vh * 0.52);
      setProgress(Math.min(1, Math.max(0, p)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <ol
      className="timeline"
      ref={ref}
      style={{ "--p": progress } as React.CSSProperties}
      aria-label="How covering a load works"
    >
      {STEPS.map((s, i) => {
        const done = progress >= (i + 0.6) / STEPS.length;
        return (
          <li key={s.label} className={`timeline__step${done ? " is-done" : ""}`}>
            <span className="timeline__dot" aria-hidden="true">{s.icon}</span>
            <span className="timeline__label">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
