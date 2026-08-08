// src/hooks/useMentor.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  MentorableModule,
  MentoringSession,
  PendingReview,
} from "@/types/mentor";

/** Set when the mentoring migration has not been applied to this environment,
 *  so the Hub can say so plainly instead of rendering an empty page. Mirrors
 *  the handling in useModules.ts. */
const MISSING_TABLES =
  "Mentoring tables not found. Run supabase/migrations/0003_mentoring.sql.";

function isMissingTable(message?: string): boolean {
  if (!message) return false;
  return (
    message.includes("mentoring_sessions") ||
    message.includes("mentor_share_links") ||
    message.includes("mentor_share_responses") ||
    message.includes("mentorable_modules") ||
    message.includes("create_share_link")
  );
}

export function useMentorHub(userId?: string) {
  const [mentorable, setMentorable] = useState<MentorableModule[]>([]);
  const [sessions, setSessions] = useState<MentoringSession[]>([]);
  const [pending, setPending] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Modules this learner has completed. This is the whole eligibility rule
      // now — no aggregate threshold, no "completed_lessons".
      const { data: mods, error: modErr } = await supabase
        .from("mentorable_modules")
        .select("*")
        .eq("user_id", userId)
        .order("sequence_order", { ascending: true });
      if (modErr) throw modErr;
      setMentorable((mods ?? []) as MentorableModule[]);

      const { data: sess, error: sessErr } = await supabase
        .from("mentoring_sessions")
        .select("*")
        .eq("mentor_id", userId)
        .order("created_at", { ascending: false });
      if (sessErr) throw sessErr;
      setSessions((sess ?? []) as MentoringSession[]);

      // Answers from people outside the app. RLS scopes this to links the
      // caller owns, so no mentor filter is needed here — but the embed still
      // walks the link to get the module title.
      const { data: resp, error: respErr } = await supabase
        .from("mentor_share_responses")
        .select(
          "*, mentor_share_links!inner(token, mentor_id, learning_modules!inner(slug, title))"
        )
        .eq("mentor_share_links.mentor_id", userId)
        .order("created_at", { ascending: false });
      if (respErr) throw respErr;

      setPending(
        (resp ?? []).map((r: any) => ({
          ...r,
          share_token: r.mentor_share_links?.token ?? "",
          module_title: r.mentor_share_links?.learning_modules?.title ?? "A module",
          module_slug: r.mentor_share_links?.learning_modules?.slug ?? "",
        })) as PendingReview[]
      );

      setError(null);
    } catch (e: any) {
      console.error("Failed to load mentor hub:", e);
      setError(isMissingTable(e?.message) ? MISSING_TABLES : e?.message ?? "Could not load mentoring data.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Mint (or reuse) the share link for a completed module. The completed check
   *  lives in the database, not here — this call fails cleanly if the module
   *  is not actually finished. */
  const createShareLink = useCallback(
    async (moduleId: string): Promise<string> => {
      const { data, error: e } = await supabase.rpc("create_share_link", {
        p_module_id: moduleId,
      });
      if (e) throw new Error(e.message);
      await load();
      return data as string;
    },
    [load]
  );

  const revokeShareLink = useCallback(
    async (token: string) => {
      const { error: e } = await supabase
        .from("mentor_share_links")
        .update({ revoked_at: new Date().toISOString() })
        .eq("token", token);
      if (e) throw new Error(e.message);
      await load();
    },
    [load]
  );

  /** Reply to someone who answered a shared module. Text and timestamp are
   *  written together — the DB rejects one without the other. */
  const replyToResponse = useCallback(
    async (responseId: string, reply: string) => {
      const body = reply.trim();
      if (!body) return;
      const { error: e } = await supabase
        .from("mentor_share_responses")
        .update({ mentor_reply: body, replied_at: new Date().toISOString() })
        .eq("id", responseId);
      if (e) throw new Error(e.message);
      await load();
    },
    [load]
  );

  return {
    mentorable,
    sessions,
    pending: pending.filter((p) => !p.mentor_reply),
    answered: pending.filter((p) => !!p.mentor_reply),
    loading,
    error,
    reload: load,
    createShareLink,
    revokeShareLink,
    replyToResponse,
  };
}
