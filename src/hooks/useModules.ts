// src/hooks/useModules.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  LearningModule,
  RunnableModule,
  UserModuleProgress,
} from "@/types/modules";

/** Columns the module list needs. Deliberately excludes the heavy content
 *  columns (render_spec, content_blocks, call_script, canonical_reasoning) so
 *  the Learn page doesn't pull ~200KB to draw ten cards. */
const LIST_COLUMNS =
  "id, slug, title, verdict, difficulty, format, est_seconds, tags, " +
  "content_warning, skippable_without_penalty, sequence_order";

export type ModuleListItem = Pick<
  LearningModule,
  | "id"
  | "slug"
  | "title"
  | "verdict"
  | "difficulty"
  | "format"
  | "est_seconds"
  | "tags"
  | "content_warning"
  | "skippable_without_penalty"
  | "sequence_order"
>;

export function useModuleList(userId?: string) {
  const [modules, setModules] = useState<ModuleListItem[]>([]);
  const [progress, setProgress] = useState<Record<string, UserModuleProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: modError } = await supabase
        .from("learning_modules")
        .select(LIST_COLUMNS)
        .eq("is_published", true)
        .order("sequence_order", { ascending: true });

      if (modError) throw modError;
      setModules((data ?? []) as unknown as ModuleListItem[]);

      if (userId) {
        const { data: prog } = await supabase
          .from("user_module_progress")
          .select("*")
          .eq("user_id", userId);
        const byModule: Record<string, UserModuleProgress> = {};
        (prog ?? []).forEach((p: UserModuleProgress) => {
          byModule[p.module_id] = p;
        });
        setProgress(byModule);
      }
      setError(null);
    } catch (e: any) {
      // The Learn tab must not go blank if the migration hasn't been applied
      // to this environment yet — say so plainly instead.
      console.error("Failed to load modules:", e);
      setError(
        e?.message?.includes("learning_modules")
          ? "Module tables not found. Run supabase/migrations/0002_learning_modules.sql and supabase/seed_modules.sql."
          : e?.message || "Could not load modules."
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { modules, progress, loading, error, reload: load };
}

/** Columns safe to send to the browser before the learner has judged.
 *  See RunnableModule — verdict, signals, rubric, distractors,
 *  canonical_reasoning and reveal are all withheld on purpose. */
const RUNNER_COLUMNS =
  "id, slug, title, difficulty, format, est_seconds, tags, " +
  "prompt_text, question_variant, verdict_labels, render_spec, assets, " +
  "content_blocks, call_script, content_warning, content_warning_text, " +
  "skippable_without_penalty, sequence_order";

export function useModule(slug: string) {
  const [module, setModule] = useState<RunnableModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: e } = await supabase
        .from("learning_modules")
        .select(RUNNER_COLUMNS)
        .eq("slug", slug)
        .single();

      if (cancelled) return;
      if (e) {
        setError(e.message);
      } else {
        setModule(data as unknown as RunnableModule);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { module, loading, error };
}
