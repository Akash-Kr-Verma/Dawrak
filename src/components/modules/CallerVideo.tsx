// src/components/modules/CallerVideo.tsx
//
// The person on the other end of the call.
//
// The connected screen used to be a grey box with the words "video_caller
// (looping)" in it, which is fine for checking a layout and fatal for the
// lesson: this module teaches that visual authority is the cheapest thing in
// the world to counterfeit, and it can only teach that if the learner is
// actually shown some. A caption where a face should be asks them to imagine
// being taken in.
//
// The brief said not to use an obviously fake or generic "AI person". So this
// isn't trying to pass as a photograph of a real human — it's built as a bad
// video call, which is what the scenario is. Low-bandwidth artefacts do the
// heavy lifting: heavy compression blocks, scanlines, a green-grey cast,
// periodic freezes, macroblocking around movement. Real vishing video looks
// like this, and the degradation is honest about what the asset is while still
// giving the learner a uniform, a lanyard and an emblem to evaluate.
//
// The props are exactly the ones the module's canonical reasoning calls out:
// badge, uniform, emblem, office noise. They exist to be recognized later as
// props, so they have to be present and reasonably convincing now.
"use client";

import React from "react";

export type CallerAvatar = "org_logo" | "silhouette";

/**
 * Head-and-shoulders of the caller, rendered as a degraded video feed.
 *
 * `speaking` drives a small amount of movement — a real listener is never
 * perfectly still, and perfect stillness is the thing that breaks the illusion
 * fastest. `frozen` is periodically toggled by the parent to simulate the feed
 * hanging, which is also what makes the badge hard to read: real ID cards never
 * scan clean on a video call, and a learner who tries to read it and can't has
 * learned something.
 */
export function CallerVideo({
  speaking,
  frozen,
  variant = "customs",
}: {
  speaking: boolean;
  frozen: boolean;
  variant?: "customs" | "police";
}) {
  const uniform = variant === "police" ? "#232c3d" : "#2f3f4d";
  const uniformLight = variant === "police" ? "#313d52" : "#3e5265";

  return (
    <svg
      viewBox="0 0 320 200"
      className="w-full h-full block"
      role="img"
      aria-label="Video feed of the caller: a person in a dark uniform with a lanyard ID card, sitting in an office."
      style={{ filter: frozen ? "saturate(0.75) contrast(1.08)" : undefined }}
    >
      <defs>
        <linearGradient id="cv-room" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#59666b" />
          <stop offset="100%" stopColor="#3c464a" />
        </linearGradient>
        <linearGradient id="cv-skin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b08260" />
          <stop offset="100%" stopColor="#8d6247" />
        </linearGradient>
        <linearGradient id="cv-uniform" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={uniformLight} />
          <stop offset="100%" stopColor={uniform} />
        </linearGradient>
        {/* Compression blocks. The scenario is a call over a free app on a bad
            connection; this is the single strongest cue that it's live video
            rather than a picture. */}
        <filter id="cv-macroblock" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="1" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={frozen ? 5 : 1.6} />
        </filter>
        <filter id="cv-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" result="n" />
          <feColorMatrix type="saturate" values="0" in="n" result="m" />
          <feComponentTransfer in="m" result="g">
            <feFuncA type="linear" slope="0.09" />
          </feComponentTransfer>
          <feComposite operator="over" in="g" in2="SourceGraphic" />
        </filter>
        <clipPath id="cv-clip">
          <rect x="0" y="0" width="320" height="200" />
        </clipPath>
      </defs>

      <g clipPath="url(#cv-clip)" filter="url(#cv-macroblock)">
        {/* Office wall, blinds, and an emblem behind the shoulder. */}
        <rect width="320" height="200" fill="url(#cv-room)" />
        <g opacity="0.35" stroke="#8fa0a6" strokeWidth="3">
          {Array.from({ length: 9 }, (_, i) => (
            <line key={i} x1="196" y1={8 + i * 15} x2="320" y2={6 + i * 15} />
          ))}
        </g>
        <rect x="188" y="0" width="6" height="200" fill="#2f383c" opacity="0.5" />

        {/* Fictional emblem — deliberately not any real agency's. */}
        <g opacity="0.5" transform="translate(36 26)">
          <path d="M0 6 L22 0 L44 6 L44 30 Q44 48 22 58 Q0 48 0 30 Z" fill="#7e8b90" />
          <path d="M6 12 L22 7 L38 12 L38 30 Q38 43 22 51 Q6 43 6 30 Z" fill="#5b686d" />
          <circle cx="22" cy="26" r="7" fill="#8fa0a6" />
        </g>

        {/* Subject. Slight sway while speaking, and off-centre framing — nobody
            props their phone up perfectly. */}
        <g
          transform={`translate(${speaking ? 2 : 0} ${speaking ? -1 : 0})`}
          style={{ transition: "transform 220ms ease-in-out" }}
        >
          {/* Shoulders / torso in uniform. */}
          <path d="M28 200 Q34 138 96 124 L164 124 Q226 138 232 200 Z" fill="url(#cv-uniform)" />
          {/* Collar and a shoulder seam. */}
          <path d="M104 126 L130 156 L156 126" fill="#1b2329" opacity="0.55" />
          <path d="M60 200 Q66 152 104 134" stroke="#1b2329" strokeWidth="2" fill="none"
            opacity="0.4" />
          {/* Epaulette-ish detail. */}
          <rect x="46" y="152" width="26" height="7" rx="3" fill="#8b9aa2" opacity="0.75" />
          <rect x="188" y="152" width="26" height="7" rx="3" fill="#8b9aa2" opacity="0.75" />

          {/* Neck and head. */}
          <rect x="118" y="100" width="28" height="30" fill="#8d6247" />
          <ellipse cx="132" cy="76" rx="35" ry="42" fill="url(#cv-skin)" />
          {/* Hair. */}
          <path d="M97 68 Q100 30 132 30 Q164 30 167 68 Q160 46 132 44 Q106 46 97 68 Z"
            fill="#20191a" />
          {/* Brow, eyes, nose, mouth. Mouth opens a little while speaking. */}
          <ellipse cx="118" cy="72" rx="5" ry={speaking ? 2.6 : 3.2} fill="#2b2422" />
          <ellipse cx="147" cy="72" rx="5" ry={speaking ? 2.6 : 3.2} fill="#2b2422" />
          <path d="M110 63 Q118 59 126 63" stroke="#2b2422" strokeWidth="2" fill="none" />
          <path d="M139 63 Q147 59 155 63" stroke="#2b2422" strokeWidth="2" fill="none" />
          <path d="M131 78 L128 92 Q133 95 138 92" stroke="#7a5238" strokeWidth="2"
            fill="none" />
          <ellipse
            cx="133"
            cy={102}
            rx={speaking ? 9 : 10}
            ry={speaking ? 5.5 : 1.8}
            fill="#5e3b2c"
            style={{ transition: "all 160ms ease-in-out" }}
          />
          {/* Shadow under the jaw. */}
          <path d="M104 92 Q132 116 161 92" stroke="#7a5238" strokeWidth="3" fill="none"
            opacity="0.35" />

          {/* Lanyard and ID card — the prop the module wants examined. Kept
              deliberately unreadable: real ones never scan clean on a call. */}
          <path d="M112 128 L128 170" stroke="#1f4f77" strokeWidth="4" />
          <path d="M152 128 L136 170" stroke="#1f4f77" strokeWidth="4" />
          <g transform="rotate(-4 132 186)">
            <rect x="112" y="168" width="42" height="30" rx="3" fill="#e8eaec" />
            <rect x="112" y="168" width="42" height="8" rx="3" fill="#2f6f9a" />
            <rect x="116" y="180" width="13" height="14" rx="1.5" fill="#9aa3a9" />
            <g fill="#9aa3a9">
              <rect x="132" y="181" width="18" height="2.6" rx="1" />
              <rect x="132" y="186" width="14" height="2.6" rx="1" />
              <rect x="132" y="191" width="16" height="2.6" rx="1" />
            </g>
          </g>
        </g>

        {/* Scanlines + a rolling bright band. */}
        <g opacity="0.16">
          {Array.from({ length: 50 }, (_, i) => (
            <rect key={i} x="0" y={i * 4} width="320" height="1.4" fill="#000" />
          ))}
        </g>
        <rect x="0" y="0" width="320" height="200" fill="#3f6b5a" opacity="0.07" />

        {/* Frozen frames get a torn block, the way a stalled feed does. */}
        {frozen && (
          <>
            <rect x="0" y="84" width="320" height="16" fill="#000" opacity="0.22" />
            <rect x="46" y="100" width="230" height="10" fill="#7d8f95" opacity="0.28" />
          </>
        )}
      </g>

      <rect width="320" height="200" filter="url(#cv-grain)" fill="transparent" />
    </svg>
  );
}

/** The circle shown on the ring screen, before the video starts. */
export function RingAvatar({ avatar }: { avatar: CallerAvatar }) {
  if (avatar === "org_logo") {
    return (
      <svg viewBox="0 0 96 96" className="w-full h-full" role="img" aria-label="Caller emblem">
        <circle cx="48" cy="48" r="48" fill="#1e2a33" />
        <path d="M48 20 L70 27 V50 Q70 68 48 78 Q26 68 26 50 V27 Z" fill="#425b6c" />
        <path d="M48 27 L63 32 V50 Q63 62 48 70 Q33 62 33 50 V32 Z" fill="#2c3f4d" />
        <circle cx="48" cy="46" r="8" fill="#7d97a8" />
        <rect x="44" y="52" width="8" height="12" rx="2" fill="#7d97a8" />
      </svg>
    );
  }
  // Unknown number, no saved contact, no picture — what your phone actually
  // shows you, which is part of what the learner should be reading.
  return (
    <svg viewBox="0 0 96 96" className="w-full h-full" role="img" aria-label="No caller photo">
      <circle cx="48" cy="48" r="48" fill="#2a3138" />
      <circle cx="48" cy="38" r="16" fill="#59636c" />
      <path d="M18 86 Q22 58 48 58 Q74 58 78 86 Z" fill="#59636c" />
    </svg>
  );
}
