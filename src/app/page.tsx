// src/app/page.tsx
//
// The welcome screen — what "/" now shows.
//
// It used to be a bare `redirect("/learn")`, which meant a first-time visitor's
// introduction to Dawrak was the login form. The app has a point of view and
// nothing said it before you were asked for a password. This screen says it:
// wordmark, what the product does, a still of the actual Learn tab, one way in.
//
// Nothing downstream changed. "Get Started" goes to /login, which is exactly
// where "/" landed people before (via /learn → ProtectedRoute), so the
// login → onboarding → /learn flow is untouched. Anyone already signed in never
// sees this screen at all — they are sent straight to /learn, as before.
"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LinkButton } from "@/components/ui";
import { AppPreview } from "@/components/welcome/AppPreview";

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
    <main className="min-h-screen bg-canvas">
      <div className="lg:grid lg:grid-cols-2 lg:min-h-screen">
        {/* ---- The pitch -------------------------------------------- */}
        {/* Second on desktop, first on a phone: on a small screen the words
            and the button have to be above the fold, and the mock-up is what
            you scroll to. */}
        <section className="order-1 lg:order-2 flex items-center px-6 sm:px-10 lg:px-14 xl:px-20 py-14 sm:py-20 lg:py-0">
          <div className="w-full max-w-md mx-auto lg:mx-0 animate-fade-up">
            {/* Wordmark — the same lockup as the login screen. */}
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-pop shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <span>
                <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-brand-700">
                  Dawrak
                </span>
                <span className="block text-[11px] font-semibold text-ink-muted mt-0.5">
                  Media &amp; Information Literacy
                </span>
              </span>
            </div>

            <h1 className="text-[34px] sm:text-[42px] lg:text-[40px] xl:text-[46px] font-black text-ink tracking-tight leading-[1.08] mt-9">
              Learn by doing.
              <br />
              Teach by sharing.
            </h1>

            <p className="text-base sm:text-lg text-ink-soft leading-relaxed mt-5">
              Build media literacy through real situations — then pass what you
              learn forward.
            </p>

            <LinkButton
              href="/login"
              size="lg"
              iconRight={ArrowRight}
              className="mt-9 w-full sm:w-auto sm:px-10"
            >
              Get Started
            </LinkButton>

            {/* The whole loop in one line. Three cards here would say the same
                thing and cost a third of the screen. */}
            <p className="text-xs font-semibold text-ink-muted mt-7 tracking-wide">
              Ten real modules · Mentor someone · Watch your reach grow
            </p>
          </div>
        </section>

        {/* ---- The app ---------------------------------------------- */}
        <section className="order-2 lg:order-1 relative bg-brand-700 overflow-hidden flex items-center justify-center px-6 py-16 lg:py-20 lg:[clip-path:polygon(0_0,100%_0,93%_100%,0_100%)]">
          {/* Two shapes, both from the palette, both behind the phone. They
              frame it; they are not the composition. The square is desktop-only
              — on a phone-width screen the panel is already narrow enough that a
              second shape just crowds the handset. */}
          <span
            aria-hidden
            className="absolute w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] rounded-full bg-brand-800 -translate-y-6 lg:-translate-x-6"
          />
          <span
            aria-hidden
            className="hidden lg:block absolute left-[6%] top-[6%] w-20 h-20 rounded-2xl border-2 border-brand-500 rotate-12"
          />

          <div className="relative animate-fade-up">
            <AppPreview />
          </div>
        </section>
      </div>
    </main>
  );
}
