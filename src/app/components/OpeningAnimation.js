"use client";

import { useLayoutEffect, useRef, useState } from "react";

const INTRO_KEY = "ikikae_intro_seen";
const INTRO_DURATION_MS = 1800;
const OUTRO_DURATION_MS = 650;

export default function OpeningAnimation({ enabled }) {
  const [phase, setPhase] = useState(enabled ? "enter" : "done");
  const seenOnMount = useRef(null);

  useLayoutEffect(() => {
    if (!enabled) {
      setPhase("done");
      return;
    }

    // Root layouts persist across client navigation. Recheck the live cookie
    // when this component remounts after /concept, before painting the overlay.
    // Keep the first result through Strict Mode's effect replay so writing the
    // cookie below does not immediately cancel a genuine first visit.
    if (seenOnMount.current === null) {
      seenOnMount.current = document.cookie.split(";").some((cookie) => cookie.trim() === `${INTRO_KEY}=1`);
    }
    if (seenOnMount.current) {
      setPhase("done");
      return;
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const introDuration = prefersReducedMotion ? 200 : INTRO_DURATION_MS;
    const outroDuration = prefersReducedMotion ? 120 : OUTRO_DURATION_MS;

    document.cookie = `${INTRO_KEY}=1; path=/; max-age=31536000; samesite=lax`;

    const outroTimer = window.setTimeout(() => setPhase("out"), introDuration);
    const doneTimer = window.setTimeout(
      () => setPhase("done"),
      introDuration + outroDuration
    );

    return () => {
      window.clearTimeout(outroTimer);
      window.clearTimeout(doneTimer);
    };
  }, [enabled]);

  if (phase === "done") return null;

  return (
    <div
      className={`intro-overlay ${phase === "out" ? "is-leaving" : ""}`}
      aria-hidden="true"
    >
      <div className="intro-stage">
        <div className="intro-circle" />
        <div className="intro-mark">IKIKAE</div>
        <div className="intro-tagline">Dream. Change. Achieve.</div>
        <div className="intro-bar" />
      </div>
    </div>
  );
}
