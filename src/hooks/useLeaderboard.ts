// src/hooks/useLeaderboard.ts
//
// The mentoring leaderboard: who has actually passed what they learned on to
// another person.
//
// Both calls are RPCs rather than table reads, and that is the whole design.
// RLS scopes `mentor_share_responses` and `mentoring_sessions` to the mentor who
// owns them, so a client cannot total up anybody else's teaching — nor should
// it be able to. The two security-definer functions in
// supabase/migrations/0008_mentor_leaderboard.sql return counts and public
// profile fields, and nothing a mentor was sent in confidence.
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { LeaderboardEntry, MyMentorImpact } from "@/types/mentor";

/** A database still on 0007 has neither function. PostgREST answers PGRST202
 *  with "Could not find the function public.mentor_leaderboard...". That is a
 *  missing migration, not a broken screen: the Profile card hides itself and the
 *  rest of the page carries on. */
function isMissingFunction(err: any): boolean {
  const msg = String(err?.message ?? "");
  return (
    err?.code === "PGRST202" ||
    msg.includes("mentor_leaderboard") ||
    msg.includes("my_mentor_impact")
  );
}

const MISSING =
  "Leaderboard functions not found. Run supabase/migrations/0008_mentor_leaderboard.sql.";

export function useLeaderboard(userId?: string, limit = 10) {
  const [top, setTop] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<MyMentorImpact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** True when the migration has not been applied here. Distinct from `error`
   *  so callers can hide rather than shout about someone else's environment. */
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Errors are asserted on, not shrugged off. This codebase has shipped
      // features that never wrote a row because `const { data } = await ...`
      // discarded the reason.
      const [board, mine] = await Promise.all([
        supabase.rpc("mentor_leaderboard", { p_limit: limit }),
        supabase.rpc("my_mentor_impact"),
      ]);
      if (board.error) throw board.error;
      if (mine.error) throw mine.error;

      setTop((board.data ?? []) as LeaderboardEntry[]);
      // The function returns exactly one row, always.
      setMe(((mine.data ?? [])[0] ?? null) as MyMentorImpact | null);
      setUnavailable(false);
      setError(null);
    } catch (e: any) {
      const missing = isMissingFunction(e);
      setUnavailable(missing);
      setError(missing ? MISSING : e?.message ?? "Could not load the leaderboard.");
      setTop([]);
      setMe(null);
      console.error("Failed to load the mentoring leaderboard:", e);
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { top, me, loading, error, unavailable, reload: load };
}
