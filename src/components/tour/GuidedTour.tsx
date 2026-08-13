// src/components/tour/GuidedTour.tsx
//
// The first-run guided tour.
//
// User testing kept turning up the same gap: people could work a module but
// could not say what Dawrak was *for*, or how Learn, Mentor, Profile and the
// Daily Challenge were meant to connect. This walks them around the real
// screens once — the app stays visible underneath, dimmed, with the element
// being explained cut out of the dim.
//
// It is deliberately parasitic on the app rather than part of it. It reads
// `data-tour` attributes off elements the screens already render, navigates
// with the same router a nav tap uses, and touches no state that belongs to
// any feature. Removing the two lines that mount it in the dashboard layout
// removes the tour entirely; nothing else would notice.
//
// Two things worth knowing before editing:
//
//   * The dim is the spotlight's own 9999px box-shadow, not a separate sheet.
//     That is what makes the cut-out follow the element's rounded corners for
//     free. The element is `pointer-events-none`; a transparent sibling below
//     it is what actually swallows clicks.
//   * Nothing is scroll-locked. The spotlight recomputes on every scroll and
//     resize instead, so a page that reflows under it (a slow avatar, a late
//     leaderboard) corrects itself rather than pointing at empty space.
"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import {
  TOUR_STEPS,
  TOUR_HOME,
  TOUR_READY_SELECTOR,
  NUMBERED_STEPS,
} from "./steps";

/** Bumping this replays the tour once for everyone. */
const STORAGE_KEY = "dawrak.tour.v1";

/** Dispatch on window to replay the tour from anywhere (Profile does). */
export const TOUR_EVENT = "dawrak:start-tour";

/** Breathing room between the tooltip and the viewport edges. */
const MARGIN = 16;
/** Bottom nav (52px + padding) plus the iOS home indicator. */
const NAV_SAFE = 92;
/** Gap between the spotlight and the tooltip. */
const GAP = 14;
/** Padding baked into the cut-out so the element isn't touching the edge. */
const HALO = 8;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/* --------------------------------------------------------------- storage --- */

function hasSeenTour(): boolean {
  // A blocked or unavailable localStorage means we cannot tell whether this
  // person has already been shown the tour. Treat that as "seen": a tour that
  // silently fails to appear is a far smaller problem than one that appears on
  // every single visit.
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "done";
  } catch {
    return true;
  }
}

function markTourSeen(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "done");
  } catch {
    /* Private mode, storage disabled — the tour just runs again next time. */
  }
}

/** Fired by the replay entry point on Profile. */
export function startGuidedTour(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TOUR_EVENT));
}

/* ------------------------------------------------------------------ tour --- */

export default function GuidedTour() {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [spot, setSpot] = useState<Box | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const targetRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  /** Guards the auto-start so it can only ever fire once per mount. */
  const autoStarted = useRef(false);

  const step = TOUR_STEPS[index];
  const isLast = index === TOUR_STEPS.length - 1;

  /* -- where the hole goes ------------------------------------------------ */

  const measureTarget = useCallback(() => {
    const el = targetRef.current;
    if (!el || !document.contains(el)) {
      setSpot(null);
      return;
    }

    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // An element taller than half the screen leaves nowhere to put the
    // tooltip, so the cut-out shows its top half. The ring then reads as
    // "this area" rather than "this exact box", which is close enough for a
    // card that is mostly its own heading anyway.
    const maxH = vh * 0.55;

    let top = r.top - HALO;
    let height = Math.min(r.height + HALO * 2, maxH);
    let left = r.left - HALO;
    let width = r.width + HALO * 2;

    // Keep the ring on screen while a smooth scroll is still settling.
    if (top < MARGIN) {
      height -= MARGIN - top;
      top = MARGIN;
    }
    if (top + height > vh - MARGIN) height = vh - MARGIN - top;
    if (left < 4) {
      width += left - 4;
      left = 4;
    }
    if (left + width > vw - 4) width = vw - 4 - left;

    if (height <= 0 || width <= 0) {
      setSpot(null);
      return;
    }
    setSpot({ top, left, width, height });
  }, []);

  /* -- where the tooltip goes --------------------------------------------- */
  //
  // Runs after the card has rendered, because it needs the card's real height:
  // the copy is different on every step and a guessed height is what puts a
  // tooltip half off the bottom of a phone.

  useLayoutEffect(() => {
    if (!open) return;
    const card = cardRef.current;
    if (!card) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;

    if (!spot) {
      setPos({
        top: Math.max(MARGIN, (vh - ch) / 2),
        left: Math.max(MARGIN, (vw - cw) / 2),
      });
      return;
    }

    const below = vh - (spot.top + spot.height) - NAV_SAFE;
    const above = spot.top - MARGIN;

    let top: number;
    if (below >= ch + GAP) top = spot.top + spot.height + GAP;
    else if (above >= ch + GAP) top = spot.top - ch - GAP;
    // Neither side fits outright. Take the roomier one and sit flush against
    // the edge — the cut-out is capped at 55vh precisely so this stays rare.
    else if (below >= above) top = vh - NAV_SAFE - ch;
    else top = MARGIN;

    let left = spot.left + spot.width / 2 - cw / 2;
    left = Math.min(Math.max(MARGIN, left), Math.max(MARGIN, vw - cw - MARGIN));
    top = Math.min(Math.max(MARGIN, top), Math.max(MARGIN, vh - ch - MARGIN));

    setPos({ top, left });
  }, [open, index, spot]);

  /* -- find the anchor for the current step -------------------------------- */

  useEffect(() => {
    if (!open) return;

    setSpot(null);
    targetRef.current = null;

    if (pathname !== step.path) {
      router.push(step.path);
      return; // The effect re-runs once the new pathname lands.
    }

    if (!step.targets) return; // Welcome card: centred, no spotlight.

    let cancelled = false;
    let tries = 0;
    let timer = 0;

    const look = () => {
      if (cancelled) return;
      const el = step.targets!.reduce<HTMLElement | null>(
        (found, sel) => found ?? document.querySelector<HTMLElement>(sel),
        null
      );

      if (el) {
        targetRef.current = el;
        scrollAnchorIntoView(el);
        measureTarget();
        // Smooth scrolling is still in flight; the scroll listener tracks it,
        // and this catches the case where nothing had to move at all.
        window.setTimeout(() => !cancelled && measureTarget(), 420);
        return;
      }

      // The screen is probably still loading its data. Give it a while, then
      // fall back to a centred tooltip rather than stalling the tour.
      if (++tries > 45) return;
      timer = window.setTimeout(look, 200);
    };

    timer = window.setTimeout(look, 60);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, index, pathname, step, router, measureTarget]);

  /* -- keep it pinned ------------------------------------------------------ */

  useEffect(() => {
    if (!open) return;
    // Measured straight off the event rather than through requestAnimationFrame:
    // it is one getBoundingClientRect on one element, and a frame of lag is
    // visible as the ring sliding behind the thing it is pointing at.
    // Capture, because some steps sit inside their own scrolling container.
    window.addEventListener("scroll", measureTarget, true);
    window.addEventListener("resize", measureTarget);
    return () => {
      window.removeEventListener("scroll", measureTarget, true);
      window.removeEventListener("resize", measureTarget);
    };
  }, [open, measureTarget]);

  /* -- opening and closing -------------------------------------------------- */

  const startTour = useCallback(() => {
    autoStarted.current = true;
    setIndex(0);
    setSpot(null);
    setPos(null);
    setOpen(true);
  }, []);

  const endTour = useCallback(() => {
    markTourSeen();
    setOpen(false);
    setSpot(null);
    setPos(null);
    targetRef.current = null;
    // The tour dragged them across four tabs; put them back where it started.
    if (window.location.pathname !== TOUR_HOME) router.push(TOUR_HOME);
  }, [router]);

  // Replay, from Profile.
  useEffect(() => {
    window.addEventListener(TOUR_EVENT, startTour);
    return () => window.removeEventListener(TOUR_EVENT, startTour);
  }, [startTour]);

  // First run. Waits for Learn to actually paint: that element only exists
  // once ProtectedRoute has let a signed-in, onboarded account through, which
  // saves this component from having to know anything about auth.
  useEffect(() => {
    if (autoStarted.current) return;
    if (pathname !== TOUR_HOME) return;
    if (hasSeenTour()) {
      autoStarted.current = true;
      return;
    }

    let cancelled = false;
    let tries = 0;
    let timer = 0;

    const look = () => {
      if (cancelled) return;
      if (document.querySelector(TOUR_READY_SELECTOR)) {
        startTour();
        return;
      }
      if (++tries > 50) return; // Never loaded — stay out of the way.
      timer = window.setTimeout(look, 200);
    };

    timer = window.setTimeout(look, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname, startTour]);

  // Escape leaves. Nobody should be trapped in an explanation.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        endTour();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, endTour]);

  if (!open) return null;

  const counter =
    index === 0 ? "A quick tour" : `Step ${index} of ${NUMBERED_STEPS}`;

  return (
    <>
      {/* Swallows every click and tap. The spotlight above is
          pointer-events-none, so this is the only thing the app sees. */}
      <div
        aria-hidden
        className="fixed inset-0 z-[60]"
        style={{ background: spot ? "transparent" : "rgba(28, 23, 52, 0.55)" }}
      />

      {/* The cut-out. Its box-shadow *is* the dim. */}
      {spot && (
        <div
          aria-hidden
          className="fixed z-[61] rounded-2xl pointer-events-none"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: "0 0 0 9999px rgba(28, 23, 52, 0.55)",
            outline: "2px solid #5A3FD6",
          }}
        />
      )}

      <div
        key={step.id}
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dawrak-tour-title"
        aria-describedby="dawrak-tour-body"
        className="fixed z-[62] animate-fade-up"
        style={{
          top: pos?.top ?? -9999,
          left: pos?.left ?? 0,
          width: "min(340px, calc(100vw - 32px))",
          opacity: pos ? 1 : 0,
        }}
      >
        <div className="bg-surface border border-line rounded-2xl shadow-lift p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-700">
              {counter}
            </span>
            <button
              type="button"
              onClick={endTour}
              className="text-[11px] font-bold text-ink-muted hover:text-ink rounded-lg px-1 py-0.5"
            >
              Skip
            </button>
          </div>

          <h2
            id="dawrak-tour-title"
            className="text-base font-extrabold text-ink leading-snug mt-2.5"
          >
            {step.title}
          </h2>
          <p
            id="dawrak-tour-body"
            className="text-sm text-ink-muted mt-1.5 leading-relaxed"
          >
            {step.body}
          </p>

          <div className="flex items-center justify-end gap-2 mt-4">
            {index > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
              >
                Back
              </Button>
            )}
            {/* No autoFocus: the card is positioned off-screen for one frame
                while it is measured, and focusing it there makes the browser
                try to scroll to it, fighting the scroll into the anchor. */}
            <Button
              size="sm"
              onClick={() => (isLast ? endTour() : setIndex((i) => i + 1))}
            >
              {index === 0 ? "Start tour" : isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- scroll --- */

/**
 * Bring an anchor into view with room left underneath for the tooltip.
 *
 * `scrollIntoView({ block: "center" })` is the obvious call and the wrong one:
 * centring a 300px card on a 667px phone leaves 180px above and below, and the
 * tooltip needs about 190px. This biases the element upward instead.
 */
function scrollAnchorIntoView(el: HTMLElement): void {
  const vh = window.innerHeight;
  const r = el.getBoundingClientRect();
  const h = Math.min(r.height, vh * 0.55);

  const wanted = Math.min(Math.max((vh - h - 200) / 2, 24), 140);
  const top = Math.max(0, r.top + window.scrollY - wanted);

  window.scrollTo({
    top,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}
