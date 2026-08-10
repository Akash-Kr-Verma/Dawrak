// src/components/modules/BikePhotos.tsx
//
// The four photos in the used-bicycle listing, and the carousel that shows
// them.
//
// WHY THESE ARE DRAWN RATHER THAN PHOTOGRAPHED
//
// The module's whole argument rests on the learner being able to inspect the
// pictures: the seller says there's a scratch on the top tube and points at the
// fourth photo, and if that scratch isn't visible then the strongest green flag
// in the module is a claim the learner has to take on faith. It also needs four
// shots of ONE bike, from one session, with consistent light — because
// mismatched photos are themselves the thing this app teaches people to spot,
// and sourcing four stock images would have us shipping the exact tell we warn
// about.
//
// No stock library has four photos of the same used bike with a documented
// scratch. Drawing them solves the consistency problem outright and has two
// other properties worth having: every photo renders offline with no request to
// fail, and there is no licensing or likeness question anywhere near it.
//
// They are drawn AS phone photos — handheld tilt, off-centre framing, a bright
// spot where the sun catches the frame, vignette, film grain, depth-of-field
// blur on the close-ups. Not photoreal, and honest about being an illustration;
// what matters pedagogically is that the evidence is genuinely there to be
// looked at.
"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Shared palette — one bike, one lighting setup, across all four frames.
// ---------------------------------------------------------------------------

const C = {
  frame: "#2c6e8f",
  frameLit: "#4a94b8",
  frameDark: "#1d4c63",
  tyre: "#22252a",
  tread: "#15171a",
  rim: "#b9c0c7",
  hub: "#8b939b",
  metal: "#cfd6dc",
  metalDark: "#8c959d",
  saddle: "#191b1e",
  grip: "#2a2d31",
  chain: "#767e86",
  wall: "#cdc6bb",
  wallShade: "#b8b0a4",
  ground: "#9aa0a3",
  groundLight: "#adb2b4",
  grass: "#7d8a63",
  scratch: "#dfe6ea",
  scratchCore: "#f2f6f8",
};

/**
 * Grain, vignette and a soft blur, defined once per photo.
 *
 * `id` is suffixed per photo because SVG filter ids are document-global and all
 * four render into the same page.
 */
function PhotoDefs({ id }: { id: string }) {
  return (
    <defs>
      <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" result="noise" />
        <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
        <feComponentTransfer in="mono" result="grain">
          <feFuncA type="linear" slope="0.055" />
        </feComponentTransfer>
        <feComposite operator="over" in="grain" in2="SourceGraphic" />
      </filter>

      <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="1.6" />
      </filter>

      <filter id={`${id}-verysoft`} x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="3.2" />
      </filter>

      <radialGradient id={`${id}-vignette`} cx="50%" cy="45%" r="72%">
        <stop offset="55%" stopColor="#000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.28" />
      </radialGradient>

      {/* Sun coming from the upper left, in every frame. */}
      <linearGradient id={`${id}-sun`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.18" />
        <stop offset="45%" stopColor="#fff" stopOpacity="0" />
      </linearGradient>

      <linearGradient id={`${id}-tube`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={C.frameLit} />
        <stop offset="45%" stopColor={C.frame} />
        <stop offset="100%" stopColor={C.frameDark} />
      </linearGradient>

      <linearGradient id={`${id}-ground`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={C.groundLight} />
        <stop offset="100%" stopColor={C.ground} />
      </linearGradient>

      <linearGradient id={`${id}-wall`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#d8d2c8" />
        <stop offset="70%" stopColor={C.wall} />
        <stop offset="100%" stopColor={C.wallShade} />
      </linearGradient>
    </defs>
  );
}

/** Vignette + grain, laid over the finished scene. */
function PhotoFinish({ id }: { id: string }) {
  return (
    <>
      <rect x="0" y="0" width="400" height="300" fill={`url(#${id}-sun)`} />
      <rect x="0" y="0" width="400" height="300" fill={`url(#${id}-vignette)`} />
      <rect
        x="0"
        y="0"
        width="400"
        height="300"
        filter={`url(#${id}-grain)`}
        fill="transparent"
        opacity="0.9"
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// A wheel, drawn once and reused so the bike is the same bike each time.
// ---------------------------------------------------------------------------

function Wheel({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const spokes = Array.from({ length: 12 }, (_, i) => (i * 180) / 12);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.tyre} strokeWidth={r * 0.15} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={C.tread}
        strokeWidth={r * 0.15}
        strokeDasharray={`${r * 0.16} ${r * 0.12}`}
        opacity="0.55"
      />
      <circle cx={cx} cy={cy} r={r * 0.86} fill="none" stroke={C.rim} strokeWidth={r * 0.06} />
      {spokes.map((a) => {
        const rad = (a * Math.PI) / 180;
        return (
          <line
            key={a}
            x1={cx + Math.cos(rad) * r * 0.83}
            y1={cy + Math.sin(rad) * r * 0.83}
            x2={cx - Math.cos(rad) * r * 0.83}
            y2={cy - Math.sin(rad) * r * 0.83}
            stroke={C.metalDark}
            strokeWidth="0.7"
            opacity="0.75"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r * 0.12} fill={C.hub} />
      <circle cx={cx} cy={cy} r={r * 0.05} fill={C.metalDark} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Photo 1 — the whole bike, side on, leaning against a wall.
// ---------------------------------------------------------------------------

function PhotoFullBike() {
  const id = "bp1";
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full block" role="img"
      aria-label="The whole bicycle, side on, leaning against a garden wall on paving stones. Blue frame, black saddle, straight handlebars.">
      <PhotoDefs id={id} />
      <rect width="400" height="300" fill="#c9c3b8" />

      {/* Wall behind, with a couple of block joints. */}
      <rect x="0" y="0" width="400" height="196" fill={`url(#${id}-wall)`} />
      <g stroke={C.wallShade} strokeWidth="1" opacity="0.5">
        <line x1="0" y1="62" x2="400" y2="59" />
        <line x1="0" y1="128" x2="400" y2="126" />
        <line x1="96" y1="0" x2="98" y2="62" />
        <line x1="248" y1="62" x2="250" y2="128" />
        <line x1="150" y1="128" x2="152" y2="196" />
      </g>
      <rect x="0" y="188" width="400" height="10" fill={C.wallShade} opacity="0.7" />

      {/* Grass strip and paving. */}
      <rect x="0" y="196" width="400" height="104" fill={`url(#${id}-ground)`} />
      <rect x="0" y="196" width="400" height="7" fill={C.grass} opacity="0.75" />
      <g stroke="#8f9598" strokeWidth="1" opacity="0.5">
        <line x1="0" y1="238" x2="400" y2="234" />
        <line x1="118" y1="203" x2="112" y2="300" />
        <line x1="286" y1="203" x2="296" y2="300" />
      </g>

      {/* Whole bike, tilted a couple of degrees — handheld, leaning. */}
      <g transform="rotate(-2.5 200 190)">
        {/* Contact shadow. */}
        <ellipse cx="200" cy="252" rx="118" ry="9" fill="#000" opacity="0.17"
          filter={`url(#${id}-soft)`} />

        <Wheel cx={116} cy={218} r={44} />
        <Wheel cx={288} cy={218} r={44} />

        {/* Diamond frame. */}
        <g stroke={`url(#${id}-tube)`} strokeLinecap="round" fill="none">
          <line x1="288" y1="218" x2="222" y2="163" strokeWidth="8" />
          <line x1="222" y1="163" x2="188" y2="218" strokeWidth="8" />
          <line x1="188" y1="218" x2="288" y2="218" strokeWidth="7" />
          <line x1="222" y1="163" x2="163" y2="158" strokeWidth="9" />
          <line x1="188" y1="218" x2="158" y2="160" strokeWidth="8" />
        </g>
        {/* Fork + head tube. */}
        <line x1="163" y1="158" x2="116" y2="218" stroke={C.metal} strokeWidth="6"
          strokeLinecap="round" />
        <line x1="158" y1="160" x2="163" y2="150" stroke={C.frameDark} strokeWidth="9"
          strokeLinecap="round" />

        {/* THE SCRATCH — on the top tube, visible here, unmistakable in photo 4. */}
        <line x1="182" y1="160" x2="204" y2="161.5" stroke={C.scratch} strokeWidth="1.6"
          opacity="0.85" strokeLinecap="round" />

        {/* Faded paint near the seat post, as the description says. */}
        <line x1="222" y1="163" x2="218" y2="150" stroke="#7ea9bd" strokeWidth="7"
          strokeLinecap="round" opacity="0.85" />
        <circle cx="221" cy="158" r="7" fill="#8fb4c5" opacity="0.4" />

        {/* Seat post + saddle. */}
        <line x1="219" y1="152" x2="216" y2="126" stroke={C.metal} strokeWidth="4" />
        <path d="M198 124 q18 -8 36 -1 q-4 8 -18 8 q-14 0 -18 -7 z" fill={C.saddle} />

        {/* Bars, stem, grips. */}
        <line x1="163" y1="150" x2="163" y2="132" stroke={C.metal} strokeWidth="4" />
        <line x1="140" y1="130" x2="188" y2="134" stroke={C.grip} strokeWidth="5"
          strokeLinecap="round" />
        <line x1="140" y1="130" x2="150" y2="131" stroke="#3c4045" strokeWidth="7"
          strokeLinecap="round" />
        <line x1="178" y1="133" x2="188" y2="134" stroke="#3c4045" strokeWidth="7"
          strokeLinecap="round" />

        {/* Drivetrain. */}
        <circle cx="188" cy="218" r="13" fill="none" stroke={C.metalDark} strokeWidth="2.5" />
        <circle cx="188" cy="218" r="7" fill="none" stroke={C.metalDark} strokeWidth="1.5" />
        <circle cx="288" cy="218" r="8" fill="none" stroke={C.metalDark} strokeWidth="2" />
        <path d="M188 205 L288 210 M188 231 L288 226" stroke={C.chain} strokeWidth="2.2" />
        <line x1="188" y1="218" x2="176" y2="232" stroke={C.metalDark} strokeWidth="3.5"
          strokeLinecap="round" />
        <line x1="188" y1="218" x2="200" y2="204" stroke={C.metalDark} strokeWidth="3.5"
          strokeLinecap="round" />
        <path d="M281 224 q6 8 2 14" stroke={C.metalDark} strokeWidth="2.5" fill="none" />
      </g>

      <PhotoFinish id={id} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Photo 2 — three-quarter view from the front, taken standing over it.
// ---------------------------------------------------------------------------

function PhotoAngle() {
  const id = "bp2";
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full block" role="img"
      aria-label="The same bicycle photographed from the front and slightly above, showing the handlebars, front wheel and head tube.">
      <PhotoDefs id={id} />
      <rect width="400" height="300" fill="#b7bcbe" />
      <rect x="0" y="0" width="400" height="120" fill={`url(#${id}-wall)`} opacity="0.85" />
      <rect x="0" y="112" width="400" height="188" fill={`url(#${id}-ground)`} />
      <g stroke="#8f9598" strokeWidth="1" opacity="0.45">
        <line x1="0" y1="176" x2="400" y2="168" />
        <line x1="0" y1="252" x2="400" y2="246" />
        <line x1="150" y1="118" x2="128" y2="300" />
        <line x1="268" y1="118" x2="300" y2="300" />
      </g>

      <g transform="rotate(3 200 170)">
        <ellipse cx="196" cy="266" rx="66" ry="12" fill="#000" opacity="0.2"
          filter={`url(#${id}-soft)`} />

        {/* Front wheel, foreshortened — narrow ellipse rather than a circle. */}
        <ellipse cx="196" cy="222" rx="20" ry="50" fill="none" stroke={C.tyre} strokeWidth="9" />
        <ellipse cx="196" cy="222" rx="15" ry="43" fill="none" stroke={C.rim} strokeWidth="3" />
        <ellipse cx="196" cy="222" rx="6" ry="18" fill="none" stroke={C.metalDark}
          strokeWidth="0.8" opacity="0.7" />
        <circle cx="196" cy="222" r="5" fill={C.hub} />

        {/* Fork legs splaying toward the camera. */}
        <line x1="196" y1="222" x2="176" y2="140" stroke={C.metal} strokeWidth="6"
          strokeLinecap="round" />
        <line x1="196" y1="222" x2="214" y2="140" stroke={C.metalDark} strokeWidth="6"
          strokeLinecap="round" />

        {/* Head tube and the top tube running away from the lens. */}
        <line x1="195" y1="140" x2="195" y2="112" stroke={`url(#${id}-tube)`} strokeWidth="12"
          strokeLinecap="round" />
        <line x1="195" y1="120" x2="238" y2="168" stroke={`url(#${id}-tube)`} strokeWidth="10"
          strokeLinecap="round" />
        <line x1="195" y1="132" x2="232" y2="196" stroke={C.frameDark} strokeWidth="8"
          strokeLinecap="round" opacity="0.85" />

        {/* Scratch again, same tube, seen at this angle. */}
        <line x1="205" y1="132" x2="221" y2="150" stroke={C.scratch} strokeWidth="1.5"
          opacity="0.75" strokeLinecap="round" />

        {/* Bars across the frame, grips nearest the camera. */}
        <line x1="128" y1="106" x2="262" y2="98" stroke={C.grip} strokeWidth="7"
          strokeLinecap="round" />
        <line x1="128" y1="106" x2="156" y2="104" stroke="#3c4045" strokeWidth="10"
          strokeLinecap="round" />
        <line x1="234" y1="100" x2="262" y2="98" stroke="#3c4045" strokeWidth="10"
          strokeLinecap="round" />
        <line x1="195" y1="112" x2="195" y2="102" stroke={C.metal} strokeWidth="6" />
        {/* Brake levers. */}
        <path d="M158 108 q14 6 20 14" stroke={C.metalDark} strokeWidth="3" fill="none"
          strokeLinecap="round" />
        <path d="M232 102 q-14 6 -19 14" stroke={C.metalDark} strokeWidth="3" fill="none"
          strokeLinecap="round" />

        {/* Saddle, small and far away. */}
        <path d="M250 176 q14 -6 27 -1 q-3 6 -13 6 q-11 0 -14 -5 z" fill={C.saddle}
          opacity="0.9" filter={`url(#${id}-soft)`} />
      </g>

      <PhotoFinish id={id} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Photo 3 — drivetrain close-up. Gears, chain, derailleur.
// ---------------------------------------------------------------------------

function PhotoDrivetrain() {
  const id = "bp3";
  const teeth = Array.from({ length: 34 }, (_, i) => (i * 360) / 34);
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full block" role="img"
      aria-label="Close-up of the bicycle's gears: front chainring, chain and rear derailleur, with the paving out of focus behind.">
      <PhotoDefs id={id} />
      <rect width="400" height="300" fill="#9fa5a8" />

      {/* Background thrown out of focus — close-ups have shallow depth of field. */}
      <g filter={`url(#${id}-verysoft)`}>
        <rect x="0" y="0" width="400" height="300" fill={`url(#${id}-ground)`} />
        <line x1="0" y1="96" x2="400" y2="78" stroke="#8b9194" strokeWidth="8" />
        <line x1="0" y1="246" x2="400" y2="236" stroke="#8b9194" strokeWidth="7" />
        <rect x="0" y="0" width="400" height="46" fill={C.grass} opacity="0.5" />
      </g>

      <g transform="rotate(-4 200 160)">
        {/* Chainring. */}
        <circle cx="150" cy="168" r="66" fill="none" stroke={C.metalDark} strokeWidth="7" />
        <circle cx="150" cy="168" r="66" fill="none" stroke={C.metal} strokeWidth="2.5" />
        {teeth.map((a) => {
          const rad = (a * Math.PI) / 180;
          return (
            <line key={a}
              x1={150 + Math.cos(rad) * 66} y1={168 + Math.sin(rad) * 66}
              x2={150 + Math.cos(rad) * 72} y2={168 + Math.sin(rad) * 72}
              stroke={C.metalDark} strokeWidth="3" strokeLinecap="round" />
          );
        })}
        {/* Crank arm and spider. */}
        {[0, 72, 144, 216, 288].map((a) => {
          const rad = (a * Math.PI) / 180;
          return (
            <line key={a} x1="150" y1="168"
              x2={150 + Math.cos(rad) * 58} y2={168 + Math.sin(rad) * 58}
              stroke={C.metalDark} strokeWidth="8" strokeLinecap="round" opacity="0.9" />
          );
        })}
        <circle cx="150" cy="168" r="17" fill={C.metal} />
        <circle cx="150" cy="168" r="8" fill={C.metalDark} />
        <rect x="140" y="164" width="96" height="9" rx="4" fill="#3f454a"
          transform="rotate(28 150 168)" />

        {/* Chain, top and bottom runs. */}
        <path d="M150 100 L322 122" stroke={C.chain} strokeWidth="7" strokeLinecap="round" />
        <path d="M150 100 L322 122" stroke="#5c646c" strokeWidth="7" strokeLinecap="round"
          strokeDasharray="4 5" />
        <path d="M150 236 L318 206" stroke={C.chain} strokeWidth="7" strokeLinecap="round" />
        <path d="M150 236 L318 206" stroke="#5c646c" strokeWidth="7" strokeLinecap="round"
          strokeDasharray="4 5" />

        {/* Rear cassette. */}
        {[34, 28, 22, 16].map((r, i) => (
          <circle key={r} cx="326" cy="150" r={r} fill="none"
            stroke={i % 2 ? C.metal : C.metalDark} strokeWidth="4" />
        ))}
        <circle cx="326" cy="150" r="7" fill={C.hub} />

        {/* Derailleur cage hanging below. */}
        <path d="M326 184 l-6 26 l16 6 l6 -26 z" fill="#7d858c" stroke="#5c646c"
          strokeWidth="1.5" />
        <circle cx="322" cy="208" r="9" fill="none" stroke={C.metalDark} strokeWidth="3" />
        <circle cx="336" cy="230" r="9" fill="none" stroke={C.metalDark} strokeWidth="3" />
        <line x1="326" y1="150" x2="326" y2="184" stroke="#5c646c" strokeWidth="4" />

        {/* Chainstay running back to the drop-out. */}
        <line x1="150" y1="168" x2="326" y2="150" stroke={`url(#${id}-tube)`} strokeWidth="11"
          strokeLinecap="round" opacity="0.95" />

        {/* A little chain oil and road dirt — it's a used bike. */}
        <ellipse cx="238" cy="160" rx="40" ry="9" fill="#4a5157" opacity="0.16" />
        <circle cx="286" cy="176" r="3" fill="#6b5f4e" opacity="0.35" />
        <circle cx="204" cy="122" r="2" fill="#6b5f4e" opacity="0.3" />
      </g>

      <PhotoFinish id={id} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Photo 4 — THE SCRATCH. The photo the description points at.
// ---------------------------------------------------------------------------

function PhotoScratch() {
  const id = "bp4";
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full block" role="img"
      aria-label="Close-up of the top tube showing a long pale scratch through the blue paint, roughly ten centimetres, with the paint faded near the seat post.">
      <PhotoDefs id={id} />
      <rect width="400" height="300" fill="#a8aeb0" />

      <g filter={`url(#${id}-verysoft)`}>
        <rect x="0" y="0" width="400" height="300" fill={`url(#${id}-ground)`} />
        <rect x="0" y="0" width="400" height="70" fill="#c2bcb2" />
        <line x1="0" y1="230" x2="400" y2="220" stroke="#8b9194" strokeWidth="9" />
      </g>

      {/* The top tube fills the frame, running corner to corner. */}
      <g transform="rotate(-7 200 150)">
        <rect x="-20" y="112" width="440" height="76" rx="38" fill={`url(#${id}-tube)`} />
        {/* Specular highlight along the top of the tube. */}
        <rect x="-20" y="122" width="440" height="13" rx="7" fill="#8fc4dd" opacity="0.55" />
        <rect x="-20" y="170" width="440" height="14" rx="7" fill={C.frameDark} opacity="0.5" />

        {/* THE SCRATCH. Deep enough to show primer, with a scuffed halo around
            it and a couple of small chips — the thing the listing discloses. */}
        <path d="M96 168 Q168 150 246 142 T352 136" stroke={C.scratch} strokeWidth="7"
          fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M100 167 Q170 149 248 141 T350 135" stroke={C.scratchCore} strokeWidth="3.2"
          fill="none" strokeLinecap="round" />
        <path d="M112 164 Q176 148 240 141" stroke="#b9a89a" strokeWidth="1.4" fill="none"
          strokeLinecap="round" opacity="0.85" />
        <circle cx="150" cy="158" r="3.4" fill={C.scratchCore} opacity="0.9" />
        <circle cx="286" cy="139" r="2.6" fill={C.scratchCore} opacity="0.85" />
        <circle cx="212" cy="149" r="2" fill="#c9bcae" opacity="0.7" />
        {/* Scuffing that fans off the main line. */}
        <g stroke={C.scratch} strokeWidth="1" opacity="0.4" strokeLinecap="round">
          <line x1="140" y1="162" x2="152" y2="169" />
          <line x1="188" y1="153" x2="197" y2="160" />
          <line x1="262" y1="141" x2="272" y2="147" />
          <line x1="308" y1="138" x2="318" y2="143" />
        </g>

        {/* Faded, chalky paint toward the seat post end. */}
        <rect x="300" y="112" width="120" height="76" rx="24" fill="#9dc3d4" opacity="0.35" />
        <circle cx="358" cy="152" r="26" fill="#a9cad9" opacity="0.3" />
      </g>

      {/* A finger at the edge of the frame — someone is holding the bike still
          while they photograph it. */}
      <g opacity="0.95">
        <path d="M-4 246 q40 -20 74 -6 q16 7 10 22 q-8 20 -40 20 q-30 0 -44 -12 z"
          fill="#c99f7f" />
        <path d="M22 244 q22 -8 40 2" stroke="#b58a6c" strokeWidth="2" fill="none" />
      </g>

      <PhotoFinish id={id} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// The carousel
// ---------------------------------------------------------------------------

const PHOTOS: Array<{ key: string; caption: string; render: () => JSX.Element }> = [
  { key: "photo_1", caption: "Whole bike", render: () => <PhotoFullBike /> },
  { key: "photo_2", caption: "Front three-quarter", render: () => <PhotoAngle /> },
  { key: "photo_3", caption: "Gears and chain", render: () => <PhotoDrivetrain /> },
  { key: "photo_4", caption: "Scratch on the top tube", render: () => <PhotoScratch /> },
];

/**
 * Scroll-snap rather than a transform-based slider: swipe works natively on
 * touch, which is where this module is mostly used, and the browser keeps the
 * momentum and rubber-banding it already knows how to do.
 */
export function BikePhotoCarousel() {
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = React.useState(0);

  const goTo = React.useCallback((i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(PHOTOS.length - 1, i));
    const left = clamped * track.clientWidth;

    // Honour reduced motion, and never let the animation be the only thing
    // that moves the track: `scrollTo` is asked to animate, and `scrollLeft` is
    // assigned as well so the photo has definitely changed even where a smooth
    // scroll never runs to completion. Assigning after the call is harmless in
    // a normal browser — the animation is already targeting the same offset.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    track.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
    if (reduced) track.scrollLeft = left;

    // The dots follow state directly rather than waiting for a scroll event,
    // so the control always reflects the tap even if the scroll is interrupted.
    setIndex(clamped);
  }, []);

  // Keep the dots honest when the learner swipes instead of tapping.
  const onScroll = React.useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    setIndex((prev) => (prev === i ? prev : i));
  }, []);

  return (
    <div className="relative bg-slate-100 select-none">
      <div
        ref={trackRef}
        onScroll={onScroll}
        tabIndex={0}
        role="group"
        aria-label={`Listing photos, ${index + 1} of ${PHOTOS.length}`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); goTo(index + 1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); goTo(index - 1); }
        }}
        // No `scroll-smooth` class: the smoothness is decided in goTo, where
        // reduced-motion is checked. A CSS rule here would animate scrolls the
        // browser initiates too, including the one that happens when a dot
        // takes focus, which fights the control rather than helping it.
        className="flex overflow-x-auto snap-x snap-mandatory focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-900/40"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {PHOTOS.map((p) => (
          <div key={p.key} className="snap-start shrink-0 w-full aspect-[4/3]">
            {p.render()}
          </div>
        ))}
      </div>

      {/* Arrows. Hidden from assistive tech — the track itself is keyboard
          operable and announces position. */}
      {index > 0 && (
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label="Previous photo"
          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 shadow flex items-center justify-center"
        >
          <ChevronLeft className="w-4 h-4 text-slate-800" />
        </button>
      )}
      {index < PHOTOS.length - 1 && (
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label="Next photo"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 shadow flex items-center justify-center"
        >
          <ChevronRight className="w-4 h-4 text-slate-800" />
        </button>
      )}

      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-[11px] font-semibold tabular-nums">
        {index + 1}/{PHOTOS.length}
      </div>

      {/* The visible dot is 6px, which is right. The BUTTON is 24px square,
          which is also right — a 6px tap target on a phone is a control you
          can see and can't use. The padding is transparent, so nothing about
          the look changes. */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center">
        {PHOTOS.map((p, i) => (
          <button
            key={p.key}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Photo ${i + 1}: ${p.caption}`}
            aria-current={i === index}
            className="w-6 h-8 flex items-center justify-center"
          >
            <span
              className={`h-1.5 rounded-full transition-all block ${
                i === index ? "w-4 bg-white" : "w-1.5 bg-white/60"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export const BIKE_PHOTO_COUNT = PHOTOS.length;
