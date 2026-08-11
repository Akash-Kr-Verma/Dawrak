// src/components/ProtectedRoute.tsx
"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, needsOnboarding } from "@/hooks/useAuth";
import { ShieldAlert } from "lucide-react";
import { PageLoader } from "@/components/ui";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (needsOnboarding(profile)) {
      // Signed in but never picked a handle — or still carrying the "New
      // Member" placeholder 0007_onboarding.sql backfilled into `username`,
      // which is the same thing: no real name has ever been saved for them.
      router.replace("/onboarding");
    }
  }, [user, profile, loading, router]);

  if (loading) return <PageLoader label="Checking your session" />;

  // Don't paint a dashboard that would greet them by a placeholder — the
  // redirect above is already on its way to onboarding.
  if (user && needsOnboarding(profile))
    return <PageLoader label="Setting up your profile" />;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <ShieldAlert className="w-9 h-9 text-danger-600" />
        <p className="text-sm font-bold text-ink">
          You need to be signed in. Taking you to the login page…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
