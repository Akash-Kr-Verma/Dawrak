// src/hooks/useAuth.ts
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  full_name: string;
  /** Chosen at onboarding. Null/absent means this account still needs it. */
  username?: string | null;
  /** A path under /assets/avatars/, written by onboarding. */
  avatar_url?: string | null;
  total_points: number;
  level: number;
  email?: string;
}

// `handle_new_user` stamps every signup's full_name as "New Member" (signup
// collects no name), and 0007_onboarding.sql copied full_name into username for
// pre-onboarding accounts — so several live rows carry the placeholder in BOTH
// columns. It is not a name, and must never be shown as one.
//
// Both entries contain a space, so no valid handle can ever match one (the
// onboarding validator allows letters, numbers and underscores only) — nobody
// gets bounced back into onboarding over a handle they legitimately chose.
const PLACEHOLDER_NAMES = ["new member", "mil changemaker"];

/** True for the seeded stand-ins, so callers can treat them as "no name yet". */
export function isPlaceholderName(value: string | null | undefined): boolean {
  const v = value?.trim().toLowerCase();
  return !v || PLACEHOLDER_NAMES.includes(v);
}

/** A real name, or null when all we have is a placeholder. */
function realName(value: string | null | undefined): string | null {
  return isPlaceholderName(value) ? null : (value as string).trim();
}

/**
 * What to call someone: their chosen handle, else their name, else their inbox.
 *
 * Placeholders are skipped rather than rendered — an account still carrying one
 * is sent through onboarding by ProtectedRoute to pick a real handle, and the
 * email local-part covers the moment before that happens.
 */
export function displayName(
  profile: Pick<UserProfile, "username" | "full_name"> | null | undefined,
  email?: string | null
): string {
  return (
    realName(profile?.username) ||
    realName(profile?.full_name) ||
    email?.split("@")[0] ||
    "there"
  );
}

/** Has this account picked a real handle, or does it still need onboarding? */
export function needsOnboarding(
  profile: Pick<UserProfile, "username"> | null | undefined
): boolean {
  return !!profile && isPlaceholderName(profile.username);
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch user's Postgres profile row
  const fetchProfile = async (userId: string, email?: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data) {
        setProfile({ ...data, email });
      } else {
        // Fallback profile if RLS or row missing
        setProfile({
          id: userId,
          full_name: email?.split("@")[0] || "",
          total_points: 0,
          level: 1,
          email,
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  useEffect(() => {
    // 2. Check active session on mount
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id, session.user.email);
      }
      setLoading(false);
    };

    checkSession();

    // 3. Subscribe to real-time login/logout state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 4. Instant Logout Helper
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return { user, profile, loading, logout, refreshProfile: () => user && fetchProfile(user.id, user.email) };
}
