// src/app/login/page.tsx
//
// Sign in / create an account.
//
// The "1-Click Demo Sign-In" button that used to sit at the top of this screen
// is gone. It signed a visitor into a shared throwaway account (and, in a later
// revision, minted a brand-new empty one per device), which meant the person
// clicking it landed in an app with no progress, no modules completed and
// nothing to mentor — while the button promised a "pre-loaded user". For the
// submission the demo runs on a real account with real progress, signed in
// through this form like anybody else.
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogIn, UserPlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        // With email confirmation on, signUp returns no session — sending them
        // into the app here would just bounce off ProtectedRoute.
        if (!data.session) {
          setNotice(
            "Check your inbox to confirm your email, then come back and log in."
          );
          setLoading(false);
          return;
        }
        // New account: no username yet, so onboarding is the next stop.
        router.push("/onboarding");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      // ProtectedRoute redirects to /onboarding if this account never picked a
      // username, so /learn is always a safe landing.
      router.push("/learn");
    } catch (err: any) {
      setError(err?.message || "Authentication failed. Check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-canvas overflow-hidden flex flex-col justify-center">
      <Doodles />

      <div className="relative w-full max-w-md mx-auto px-4 py-10">
        {/* Wordmark */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center mx-auto shadow-pop">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black text-ink tracking-tight mt-3">
            Dawrak
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Spot it. Understand it. Teach someone else.
          </p>
        </div>

        <div className="bg-surface border border-line rounded-2xl shadow-lift p-5 sm:p-6 space-y-5 animate-fade-up">
          <div>
            <h2 className="text-lg font-black text-ink">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              {isSignUp
                ? "It takes about a minute to get started."
                : "Log in to pick up where you left off."}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-extrabold text-ink block"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border-2 border-line rounded-xl text-sm text-ink bg-surface placeholder:text-ink-faint focus:border-brand-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-extrabold text-ink block"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border-2 border-line rounded-xl text-sm text-ink bg-surface placeholder:text-ink-faint focus:border-brand-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-danger-50 border border-danger-100 rounded-xl text-xs text-danger-700 font-medium">
                {error}
              </div>
            )}

            {notice && (
              <div className="p-3 bg-info-50 border border-info-100 rounded-xl text-xs text-info-700 font-medium">
                {notice}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              full
              loading={loading}
              icon={isSignUp ? UserPlus : LogIn}
            >
              {isSignUp ? "Create account" : "Log in"}
            </Button>
          </form>

          <div className="pt-1 text-center border-t border-line">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setNotice(null);
              }}
              className="text-xs text-ink-muted hover:text-brand-700 font-semibold pt-4 transition-colors"
            >
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <span className="text-brand-700 font-bold underline">Log in</span>
                </>
              ) : (
                <>
                  New here?{" "}
                  <span className="text-brand-700 font-bold underline">
                    Create an account
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Quiet background art. Decorative only — hidden from assistive tech. */
function Doodles() {
  const items = [
    { src: "magnifying-glass", cls: "top-[8%] -left-6 w-28 rotate-[-12deg]" },
    { src: "light-bulb", cls: "top-[18%] -right-5 w-24 rotate-[10deg]" },
    { src: "heart-chat", cls: "bottom-[12%] -left-5 w-24 rotate-[8deg]" },
    { src: "paper-plane", cls: "bottom-[20%] -right-6 w-28 rotate-[-8deg]" },
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
