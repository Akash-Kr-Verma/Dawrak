// src/app/(dashboard)/learn/preview/[slug]/page.tsx
//
// DEV-ONLY module preview.
//
// Renders a module straight from the authored content in src/content/modules/,
// with no database and no auth. Two reasons it exists:
//
//   1. It lets you iterate on module visuals without a Supabase round-trip,
//      which is what the UI-finalization pass needs.
//   2. It makes the renderers verifiable on a machine that can't apply the
//      migration (no service-role key).
//
// It 404s outside development, so the content files never reach a production
// bundle. Grading is not wired here — submitting hits the real API, which
// needs a real session; use /learn/[slug] for the full loop.
"use client";

import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ALL_MODULES, SEQUENCED } from "@/content/modules";
import { ModuleRunner, type GradeRequest } from "@/components/modules/ModuleRunner";
import {
  decisiveSignalIds,
  extractSignalsHeuristically,
  gradeAttempt,
  verdictMatches,
} from "@/lib/modules/grade";
import { assessReasoning } from "@/lib/modules/matchReasoning";
import { composeFeedback } from "@/lib/modules/composeFeedback";
import type { AuthoredModule, RunnableModule } from "@/types/modules";

export default function ModulePreviewPage({
  params,
}: {
  params: { slug: string };
}) {
  if (process.env.NODE_ENV !== "development") notFound();

  const authored = ALL_MODULES.find((m) => m.slug === params.slug);
  if (!authored) {
    return (
      <div className="max-w-xl mx-auto py-10 space-y-4">
        <p className="text-sm text-slate-700">
          No module with slug <code className="font-mono">{params.slug}</code>.
        </p>
        <ul className="text-sm space-y-1">
          {SEQUENCED.map((m) => (
            <li key={m.slug}>
              <Link
                href={`/learn/preview/${m.slug}`}
                className="text-emerald-700 underline"
              >
                {m.sequence_order}. {m.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Same shape the DB hands the runner, minus the answer columns.
  const mod: RunnableModule = {
    id: `preview-${authored.slug}`,
    slug: authored.slug,
    title: authored.title,
    difficulty: authored.difficulty,
    format: authored.format,
    est_seconds: authored.est_seconds,
    tags: authored.tags,
    prompt_text: authored.prompt_text,
    question_variant: authored.question_variant,
    verdict_labels: authored.verdict_labels,
    render_spec: authored.render_spec,
    assets: authored.assets,
    content_blocks: authored.content_blocks,
    call_script: authored.call_script,
    content_warning: authored.content_warning,
    content_warning_text: authored.content_warning_text,
    skippable_without_penalty: authored.skippable_without_penalty,
    sequence_order: authored.sequence_order,
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-900 font-black uppercase tracking-wider">
          Dev preview
        </span>
        <span className="text-slate-500">
          {mod.format} · seq {mod.sequence_order} · difficulty {mod.difficulty}/5
        </span>
      </div>

      <nav className="flex flex-wrap gap-1.5">
        {SEQUENCED.map((m) => (
          <Link
            key={m.slug}
            href={`/learn/preview/${m.slug}`}
            className={`px-2 py-1 rounded text-[11px] font-bold ${
              m.slug === mod.slug
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {m.sequence_order}
          </Link>
        ))}
      </nav>

      <ModuleRunner
        key={mod.slug}
        module={mod}
        learnerFirstName="Aisha"
        gradeLocally={(req) => gradePreview(authored, req)}
      />
    </div>
  );
}

/**
 * The grading pipeline from /api/modules/grade, minus auth, the database, and
 * the AI extraction step.
 *
 * The AI step only ever ADDS signal ids on top of the deterministic cue match,
 * so what this shows is the floor — what a learner sees when no model is
 * available, which is also what this deployment currently does, since no API
 * key is configured. Nothing is persisted: this route has no user to attribute
 * an attempt to.
 */
async function gradePreview(mod: AuthoredModule, req: GradeRequest) {
  const reasoning = (req.learnerReasoning ?? "").trim();
  const shape = assessReasoning(reasoning);
  const behaviour = req.behaviouralLog ?? {};

  const extraction =
    shape.empty || shape.minimal
      ? { signals_hit: [], distractors_hit: [], feedback: "", matches: [] }
      : extractSignalsHeuristically(reasoning, mod.signals, mod.distractors);

  const outcome = gradeAttempt({
    moduleVerdict: mod.verdict,
    learnerVerdict: req.learnerVerdict,
    signals: mod.signals,
    rubric: mod.rubric,
    distractors: mod.distractors,
    extraction,
  });

  const fired = (mod.call_script?.behaviouralOutcomes ?? []).filter(
    (o) => (behaviour as Record<string, unknown>)[o.key]
  );

  const blocks = composeFeedback({
    score: outcome.score,
    verdictCorrect: verdictMatches(mod.verdict, req.learnerVerdict),
    overFlagged: outcome.over_flagged,
    signalsHit: outcome.signals_hit,
    matches: extraction.matches,
    signals: mod.signals,
    missedSignal: outcome.missed_signal,
    distractorsHit: outcome.corrections,
    decisiveIds: decisiveSignalIds(mod.rubric),
    frame: mod.rubric.feedback,
    shape,
    behaviour: fired,
    hasBehaviour: Object.keys(behaviour).length > 0,
  });

  return {
    score: outcome.score,
    signals_hit: outcome.signals_hit,
    advanced_reasoner: outcome.advanced_reasoner,
    over_flagged: outcome.over_flagged,
    dangerous_reasoning: outcome.dangerous_reasoning,
    feedback: blocks.noticed,
    blocks,
    graded_by: "deterministic" as const,
    missed_signal: outcome.missed_signal,
    corrections: outcome.corrections,
    canonical_reasoning: mod.canonical_reasoning,
    reveal: mod.reveal,
  };
}
