// src/app/(dashboard)/profile/leaderboard/page.tsx
//
// The full mentoring leaderboard.
//
// The Profile already shows this board inline — that is where people meet it.
// This page exists for the case the inline one cannot serve: every ranked
// mentor rather than the first handful, on its own screen, at a URL that can be
// linked to. The board itself is the same component, so the two can never
// disagree about who is where.
//
// It lives under /profile rather than in the Mentor Hub — the Hub is already
// carrying the whole share-and-reply loop — and being a child route keeps the
// Profile tab lit in the bottom nav.
"use client";

import React from "react";
import { useAuth, displayName } from "@/hooks/useAuth";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MentorLeaderboard, ChainStrip } from "@/components/MentorLeaderboard";
import {
  Card,
  Badge,
  LinkButton,
  EmptyState,
  PageLoader,
  PageHeader,
} from "@/components/ui";
import { Trophy, ArrowLeft } from "lucide-react";

export default function LeaderboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { top, me, loading, error, unavailable } = useLeaderboard(user?.id, 100);

  if (authLoading || loading) return <PageLoader label="Loading the leaderboard" />;

  return (
    <ProtectedRoute>
      <div className="space-y-5 animate-fade-up">
        <PageHeader
          title="Mentor leaderboard"
          subtitle="Ranked by the people you've taught — not the modules you've finished."
          right={
            me?.rank ? (
              <Badge tone="mentor" solid className="px-3 py-1.5">
                You&apos;re #{me.rank}
              </Badge>
            ) : undefined
          }
        />

        <div className="bg-surface border border-line rounded-2xl p-4 shadow-card">
          <ChainStrip />
        </div>

        {error && !unavailable && (
          <div className="bg-spark-50 border border-spark-100 rounded-2xl p-4 text-sm text-spark-700 font-medium">
            {error}
          </div>
        )}

        <Card accent="mentor">
          {unavailable ? (
            <EmptyState icon={Trophy} tone="mentor" title="Leaderboard not set up here">
              This environment is missing{" "}
              <code className="font-mono">0008_mentor_leaderboard.sql</code>. Apply
              it and the ranking appears — no other change is needed.
            </EmptyState>
          ) : (
            <MentorLeaderboard
              rows={top}
              me={me}
              currentUserId={user?.id}
              myRow={{
                rank: me?.rank ?? 0,
                user_id: user?.id ?? "",
                display_name: displayName(profile, user?.email),
                avatar_url: profile?.avatar_url ?? null,
                people_taught: me?.people_taught ?? 0,
              }}
            />
          )}
        </Card>

        <LinkButton href="/profile" variant="ghost" size="sm" icon={ArrowLeft}>
          Back to profile
        </LinkButton>
      </div>
    </ProtectedRoute>
  );
}
