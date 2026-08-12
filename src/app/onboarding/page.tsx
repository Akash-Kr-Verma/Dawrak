// src/app/onboarding/page.tsx
//
// Pick a handle and a face. Runs once, for accounts whose `profiles.username`
// is still null; ProtectedRoute is what sends people here.
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useAuth, needsOnboarding } from "@/hooks/useAuth";
import { AVATAR_FILES, avatarPath } from "@/lib/avatars";
import { Button, PageLoader } from "@/components/ui";
import { Check, ShieldCheck } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();

  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = username.trim();
  const isValidUsername =
    trimmed.length >= 3 && trimmed.length <= 20 && /^[a-zA-Z0-9_]+$/.test(trimmed);
  const canSubmit = isValidUsername && selectedAvatar !== null && !saving;

  // Not signed in — nothing to onboard.
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // Already onboarded (or arrived here by hand) — don't make them do it twice.
  // Must use the same test ProtectedRoute does, or an account holding the
  // "New Member" placeholder ping-pongs between the two.
  useEffect(() => {
    if (!authLoading && profile && !needsOnboarding(profile))
      router.replace("/learn");
  }, [authLoading, profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user) return;

    setSaving(true);
    setError(null);

    try {
      // Is the handle free? This and the write are two round trips, so it
      // narrows the window rather than closing it — see 0007_onboarding.sql.
      const { data: taken, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", trimmed)
        .neq("id", user.id)
        .maybeSingle();

      if (checkError && checkError.code !== "PGRST116") throw checkError;
      if (taken) {
        setError("That username is already taken. Try another one.");
        setSaving(false);
        return;
      }

      // `.select()` so a write that matches no row is visible instead of
      // looking like success — this codebase has shipped that bug before.
      const { data: updated, error: updateError } = await supabase
        .from("profiles")
        .update({
          username: trimmed,
          full_name: trimmed,
          avatar_url: avatarPath(selectedAvatar as string),
        })
        .eq("id", user.id)
        .select("id");

      if (updateError) throw updateError;
      if (!updated || updated.length === 0) {
        throw new Error(
          "Your profile row could not be found, so nothing was saved. Try signing out and back in."
        );
      }

      await refreshProfile();
      router.push("/learn");
    } catch (err: any) {
      setError(err?.message || "Could not save your profile. Please try again.");
      setSaving(false);
    }
  };

  if (authLoading) return <PageLoader label="Loading" />;

  return (
    <div className="relative min-h-screen bg-canvas overflow-hidden">
      <Doodles />

      <div className="relative max-w-lg mx-auto px-4 py-10 sm:py-16">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-[11px] font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            Step 1 of 1
          </span>
          <h1 className="text-2xl font-black text-ink mt-3">Set up your profile</h1>
          <p className="text-sm text-ink-muted mt-1.5">
            Pick a name and a face. This is how mentors and learners see you.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-line rounded-2xl shadow-lift p-5 sm:p-6 space-y-6 animate-fade-up"
        >
          <div className="space-y-2">
            <label
              htmlFor="username"
              className="text-sm font-extrabold text-ink block"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. changemaker_99"
              autoComplete="username"
              className="w-full px-4 py-3 border-2 border-line rounded-xl text-base text-ink bg-surface placeholder:text-ink-faint focus:border-brand-600 focus:outline-none transition-colors"
            />
            {trimmed.length > 0 && !isValidUsername && (
              <p className="text-xs text-danger-700 font-medium">
                3–20 characters. Letters, numbers and underscores only.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-extrabold text-ink">
                Choose an avatar
              </span>
              {!selectedAvatar && (
                <span className="text-[11px] text-ink-muted">Pick one</span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
              {AVATAR_FILES.map((file) => {
                const on = selectedAvatar === file;
                return (
                  <button
                    key={file}
                    type="button"
                    aria-pressed={on}
                    aria-label={`Avatar ${file.replace(/\D/g, "")}`}
                    onClick={() => setSelectedAvatar(file)}
                    className={`btn-press relative aspect-square rounded-2xl border-2 overflow-hidden bg-surface-sunken transition-colors ${
                      on
                        ? "border-brand-600 ring-4 ring-brand-100"
                        : "border-line hover:border-brand-300"
                    }`}
                  >
                    <Image
                      src={avatarPath(file)}
                      alt=""
                      fill
                      sizes="88px"
                      className="object-cover"
                    />
                    {on && (
                      <span className="absolute top-1 right-1 bg-brand-600 text-white rounded-full p-0.5 shadow-card">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-danger-50 border border-danger-100 rounded-xl text-xs text-danger-700 font-medium">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" full disabled={!canSubmit} loading={saving}>
            {saving ? "Saving" : "Start learning"}
          </Button>
        </form>
      </div>
    </div>
  );
}

/** Quiet background art. Decorative only — hidden from assistive tech. */
function Doodles() {
  const items = [
    { src: "magnifying-glass", cls: "top-[6%] -left-6 w-28 rotate-[-12deg]" },
    { src: "light-bulb", cls: "top-[22%] -right-4 w-24 rotate-[10deg]" },
    { src: "speech-bubble", cls: "bottom-[10%] -left-4 w-24 rotate-[8deg]" },
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
