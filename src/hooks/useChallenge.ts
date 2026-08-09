// src/hooks/useChallenge.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  ChallengeScenario,
  ChallengeFeedback,
  BankScenario,
} from "@/types/challenge";

const MISSING_TABLES =
  "Challenge tables not found. Run supabase/migrations/0004_challenge.sql.";

function isMissing(message?: string): boolean {
  if (!message) return false;
  return (
    message.includes("challenge_feed") ||
    message.includes("scenario_stats") ||
    message.includes("next_challenge_for") ||
    message.includes("user_challenge_streak") ||
    message.includes("submit_bank_scenario")
  );
}

/** Bearer token for the API routes. They authenticate the learner from this and
 *  never accept a user id from the body. */
async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useChallenge(userId?: string) {
  const [scenario, setScenario] = useState<ChallengeScenario | null>(null);
  const [feedback, setFeedback] = useState<ChallengeFeedback | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [bank, setBank] = useState<BankScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Past situations from the Questions Bank, with how many learners spotted
   *  them. Attempted separately from the main card so a failure here never
   *  costs the learner today's challenge. */
  const loadBank = useCallback(async () => {
    try {
      const { data, error: e } = await supabase
        .from("challenge_feed")
        .select("id, title, category, origin, submitted_by_name, created_at")
        .eq("origin", "questions_bank")
        .order("created_at", { ascending: false })
        .limit(8);
      if (e) throw e;

      const rows = (data ?? []) as any[];
      if (rows.length === 0) {
        setBank([]);
        return;
      }

      const { data: stats } = await supabase
        .from("scenario_stats")
        .select("scenario_id, attempts_total, spotted_pct")
        .in(
          "scenario_id",
          rows.map((r) => r.id)
        );

      const byId = new Map(
        (stats ?? []).map((s: any) => [s.scenario_id, s])
      );
      setBank(
        rows.map((r) => ({
          ...r,
          attempts_total: byId.get(r.id)?.attempts_total ?? 0,
          spotted_pct: byId.get(r.id)?.spotted_pct ?? null,
        })) as BankScenario[]
      );
    } catch (e: any) {
      console.warn("Could not load the Questions Bank:", e?.message);
      setBank([]);
    }
  }, []);

  const loadStreak = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.rpc("user_challenge_streak", {
      p_user_id: userId,
    });
    if (typeof data === "number") setStreak(data);
  }, [userId]);

  const loadScenario = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setFeedback(null);
    setError(null);
    try {
      const res = await fetch("/api/challenge/next", {
        cache: "no-store",
        headers: await authHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load a challenge.");
      setScenario(data as ChallengeScenario);
    } catch (e: any) {
      console.error("Error loading challenge:", e);
      setScenario(null);
      setError(isMissing(e?.message) ? MISSING_TABLES : e?.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    loadScenario();
    loadStreak();
    loadBank();
  }, [userId, loadScenario, loadStreak, loadBank]);

  const submit = useCallback(
    async (input: {
      assessment: "real" | "fake" | "evidence";
      userReasoning: string;
      sourceUrl: string;
      noSourceFound: boolean;
    }) => {
      if (!scenario) return;
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await authHeader()),
          },
          body: JSON.stringify({ scenarioId: scenario.id, ...input }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Evaluation failed");
        setFeedback(data as ChallengeFeedback);
        if (typeof data.streak === "number") setStreak(data.streak);
        loadBank();
      } catch (e: any) {
        setError(e?.message ?? "Failed to evaluate your response.");
      } finally {
        setSubmitting(false);
      }
    },
    [scenario, loadBank]
  );

  /** Add a situation to the shared pool. Requires at least one completed
   *  module — the same bar that unlocks mentoring. Enforced in the database. */
  const submitToBank = useCallback(
    async (input: {
      title: string;
      body: string;
      verdict: "real" | "fake";
      category: string;
    }) => {
      const { data, error: e } = await supabase.rpc("submit_bank_scenario", {
        p_title: input.title,
        p_body: input.body,
        p_verdict: input.verdict,
        p_category: input.category,
      });
      if (e) throw new Error(e.message);
      await loadBank();
      return data as string;
    },
    [loadBank]
  );

  return {
    scenario,
    feedback,
    streak,
    bank,
    loading,
    submitting,
    error,
    nextChallenge: loadScenario,
    submit,
    submitToBank,
  };
}
