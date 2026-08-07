"use client";

import { useEffect } from "react";

/**
 * Scroll-reveal for [data-reveal] elements: a calm fade-and-rise as each
 * one enters the viewport. The hidden state is only ever applied from JS
 * (after hydration, and only to elements still below the fold), so no-JS
 * visitors and above-the-fold content never see hidden markup. A numeric
 * attribute value becomes a transition delay in ms for simple staggers.
 */
export function RevealScript() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    const vh = window.innerHeight;
    for (const el of els) {
      // Anything already on screen stays static; only what the visitor
      // scrolls to gets the entrance.
      if (el.getBoundingClientRect().top < vh * 0.92) continue;
      const delay = Number(el.dataset.reveal);
      if (delay) el.style.transitionDelay = `${delay}ms`;
      el.classList.add("will-reveal");
      io.observe(el);
    }

    return () => io.disconnect();
  }, []);

  return null;
}
