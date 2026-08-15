// src/app/page.tsx
//
// The welcome screen — what "/" now shows.
//
// It used to be a bare `redirect("/learn")`, which meant a first-time visitor's
// introduction to Dawrak was the login form. The app has a point of view and
// nothing said it before you were asked for a password.
//
// This is built as a sibling of src/app/login/page.tsx: same canvas, same
// doodle background, same centred max-w-md column, same card. Land here, tap
// Get Started, and the login screen that follows looks like the same place —
// which is the whole reason it is composed from the pieces already in use
// rather than from a layout invented for this one screen.
//
// Nothing downstream changed. "Get Started" goes to /login, which is exactly
// where "/" landed people before (via /learn → ProtectedRoute), so the
// login → onboarding → /learn flow is untouched. Anyone already signed in never
// sees this screen — they are sent straight to /learn, as before.
"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Users, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LinkButton } from "@/components/ui";
import { avatarPath } from "@/lib/avatars";

/**
 * The loop the product is actually about, in three beats.
 *
 * Each keeps its own meaning from the palette — brand for the learning half,
 * mentor teal for the teaching half, spark for what you get back — so this
 * reads as the same colour system the rest of the app uses, not as three
 * shades picked to look nice in a row.
 */
const LOOP = [
  {
    icon: BookOpen,
    title: "Learn",
    body: "Judge ten real situations, then find out what was really going on.",
    tile: "bg-brand-50 border-brand-100",
    ink: "text-brand-600",
  },
  {
    icon: Users,
    title: "Teach",
    body: "Share a module you've finished, and reply to whoever answers it.",
    tile: "bg-mentor-50 border-mentor-100",
    ink: "text-mentor-600",
  },
  {
    // Trophy, because that is the icon the profile screen's own "Your impact"
    // card carries — the row should point at something the learner will
    // recognise once they get there.
    icon: Trophy,
    title: "See your impact",
    body: "Watch how far the thing you taught someone actually travels.",
    tile: "bg-spark-50 border-spark-100",
    ink: "text-spark-600",
  },
] as const;

export default function WelcomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // A returning, signed-in visitor wants the app, not the pitch. ProtectedRoute
  // on /learn still decides whether they land on the dashboard or in onboarding.
  useEffect(() => {
    if (!loading && user) router.replace("/learn");
  }, [loading, user, router]);

  // Painting the pitch and then yanking it away a frame later is worse than a
  // beat of nothing, so hold the canvas until the session is known. Reading it
  // is a local-storage lookup, not a round trip.
  if (loading || user) return <div className="min-h-screen bg-canvas" />;

  return (
    <div className="relative min-h-screen bg-canvas overflow-hidden flex flex-col justify-center">
      <Doodles />

      <main className="relative w-full max-w-md mx-auto px-4 py-8 sm:py-10">
        {/* ---- Who this is ------------------------------------------- */}
        <div className="text-center mb-5">
          {/* The robot from the avatar set. It already carries the brand violet
              disc, so it needs a white ring to sit on the canvas, nothing more. */}
          <span className="inline-block rounded-full bg-surface ring-4 ring-brand-100 shadow-lift overflow-hidden">
            <Image
              src={avatarPath("profile-pic-5.png")}
              alt=""
              width={92}
              height={92}
              priority
              className="w-[92px] h-[92px] object-cover"
            />
          </span>

          <h1 className="text-4xl font-black text-ink tracking-tight mt-3">
            Dawrak
          </h1>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700 mt-2">
            Media &amp; Information Literacy
          </p>
        </div>

        {/* ---- What it does ------------------------------------------ */}
        <div className="bg-surface border border-line rounded-2xl shadow-lift p-5 sm:p-6 space-y-5 animate-fade-up">
          <div className="text-center">
            <h2 className="text-2xl font-black text-ink leading-snug tracking-tight">
              Learn by doing.
              <br />
              Teach by sharing.
            </h2>
            <p className="text-sm text-ink-muted mt-2 leading-relaxed">
              Build media literacy through real situations — then pass what you
              learn forward.
            </p>
          </div>

          <ul className="space-y-3 border-t border-line pt-5">
            {LOOP.map((step) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="flex items-start gap-3">
                  <span
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${step.tile}`}
                  >
                    <Icon className={`w-4 h-4 ${step.ink}`} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold text-ink leading-tight">
                      {step.title}
                    </span>
                    <span className="block text-xs text-ink-muted mt-1 leading-relaxed">
                      {step.body}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-line pt-5">
            <LinkButton href="/login" size="lg" iconRight={ArrowRight} full>
              Get Started
            </LinkButton>
            <p className="text-[11px] text-ink-muted text-center mt-3">
              It takes about a minute to get started.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Quiet background art. Decorative only — hidden from assistive tech.
 *  Same treatment as login and onboarding, so the three screens read as one. */
function Doodles() {
  const items = [
    { src: "magnifying-glass", cls: "top-[7%] -left-6 w-28 rotate-[-12deg]" },
    { src: "light-bulb", cls: "top-[20%] -right-5 w-24 rotate-[10deg]" },
    { src: "speech-bubble", cls: "bottom-[14%] -left-5 w-24 rotate-[8deg]" },
    { src: "paper-plane", cls: "bottom-[22%] -right-6 w-28 rotate-[-8deg]" },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.14]">
      {items.map((d) => (
        <div key={d.src} className={`absolute ${d.cls}`}>
          <Image
            src={`/assets/doodles/${d.src}.png`}
            alt=""
            width={140}
            height={140}
            className="w-full h-auto"
          />
        </div>
      ))}
    </div>
  );
}
