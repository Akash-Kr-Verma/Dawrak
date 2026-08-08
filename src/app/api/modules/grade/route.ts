// src/app/api/modules/grade/route.ts
//
// Grades one module attempt.
//
// The AI touchpoint boundary is unchanged: module practice is still the only
// place in the app where an LLM evaluates a learner. What changed is that the
// model no longer decides anything. It extracts which of a fixed set of signals
// the learner named; the rubric is applied in code; canonical_reasoning is read
// from the DB and never generated.
//
// Auth: the caller's access token is used to build the Supabase client, so the
// insert runs as that user and RLS enforces ownership. No service-role key is
// needed or wanted here.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

import {
  extractSignalsHeuristically,
  gradeAttempt,
  type ExtractionResult,
} from "@/lib/modules/grade";
import { buildGraderPrompt, parseExtraction } from "@/lib/modules/graderPrompt";
import type {
  LearnerVerdict,
  ModuleDistractor,
  ModuleRubric,
  ModuleSignal,
} from "@/types/modules";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const AI_TIMEOUT_MS = 15_000;

function aiClient(): OpenAI | null {
  const key = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({
    apiKey: key,
    baseURL: process.env.GROQ_API_KEY
      ? "https://api.groq.com/openai/v1"
      : "https://api.openai.com/v1",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      moduleSlug,
      learnerVerdict,
      learnerReasoning,
      behaviouralLog,
      skipped,
    } = body as {
      moduleSlug?: string;
      learnerVerdict?: LearnerVerdict | null;
      learnerReasoning?: string;
      behaviouralLog?: Record<string, unknown>;
      skipped?: boolean;
    };

    if (!moduleSlug || typeof moduleSlug !== "string") {
      return NextResponse.json({ error: "Missing moduleSlug" }, { status: 400 });
    }

    // ---- Auth ------------------------------------------------------------
    const authHeader = req.headers.get("authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing Authorization bearer token" },
        { status: 401 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // ---- Load the module -------------------------------------------------
    const { data: mod, error: modError } = await supabase
      .from("learning_modules")
      .select(
        "id, slug, verdict, signals, rubric, distractors, canonical_reasoning, reveal, skippable_without_penalty"
      )
      .eq("slug", moduleSlug)
      .single();

    if (modError || !mod) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // ---- Penalty-free skip (Module 08) -----------------------------------
    // A skip is not an attempt. It records progress and nothing else, and it
    // must not reduce mentor eligibility.
    if (skipped) {
      if (!mod.skippable_without_penalty) {
        return NextResponse.json(
          { error: "This module cannot be skipped" },
          { status: 400 }
        );
      }
      await supabase.from("user_module_progress").upsert(
        {
          user_id: user.id,
          module_id: mod.id,
          status: "skipped",
          skipped_without_penalty: true,
        },
        { onConflict: "user_id,module_id" }
      );
      return NextResponse.json({ skipped: true }, { status: 200 });
    }

    const signals = (mod.signals ?? []) as ModuleSignal[];
    const rubric = (mod.rubric ?? { accept: [], partial: [] }) as ModuleRubric;
    const distractors = (mod.distractors ?? []) as ModuleDistractor[];
    const reasoning = (learnerReasoning ?? "").trim();
    const behaviour = behaviouralLog ?? {};

    // ---- Extraction ------------------------------------------------------
    let extraction: ExtractionResult;
    let gradedBy: "ai" | "deterministic" | "action_only" = "ai";

    const hasBehaviour = Object.keys(behaviour).length > 0;

    if (reasoning.length < 10) {
      // Interactive modules can be answered by action alone. That is a valid
      // attempt — the gap between "I knew it was a scam" and "I hung up" is
      // the most valuable thing this app can measure — but there is no text
      // to extract signals from.
      extraction = { signals_hit: [], distractors_hit: [], feedback: "" };
      gradedBy = hasBehaviour ? "action_only" : "deterministic";
    } else {
      const ai = aiClient();
      if (!ai) {
        extraction = extractSignalsHeuristically(reasoning, signals, distractors);
        gradedBy = "deterministic";
      } else {
        try {
          const prompt = buildGraderPrompt({
            moduleVerdict: mod.verdict,
            learnerVerdict: learnerVerdict ?? null,
            learnerText: reasoning,
            signals,
            distractors,
            rubric,
            behaviouralLog: behaviour,
          });

          const completion = (await Promise.race([
            ai.chat.completions.create({
              model: process.env.GROQ_API_KEY
                ? "llama-3.3-70b-versatile"
                : "gpt-4o-mini",
              response_format: { type: "json_object" },
              // Extraction, not creativity.
              temperature: 0,
              messages: [{ role: "system", content: prompt }],
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Grader timeout")), AI_TIMEOUT_MS)
            ),
          ])) as OpenAI.Chat.Completions.ChatCompletion;

          extraction = parseExtraction(
            completion.choices[0]?.message?.content || "{}"
          );
        } catch (err) {
          console.warn("[/api/modules/grade] AI extraction failed, falling back:", err);
          extraction = extractSignalsHeuristically(reasoning, signals, distractors);
          gradedBy = "deterministic";
        }
      }
    }

    // ---- Score, in code, from the rubric ---------------------------------
    const outcome = gradeAttempt({
      moduleVerdict: mod.verdict,
      learnerVerdict: learnerVerdict ?? null,
      signals,
      rubric,
      distractors,
      extraction,
    });

    // ---- Feedback --------------------------------------------------------
    const feedback =
      extraction.feedback.trim() || composeFallbackFeedback(outcome, gradedBy);

    // ---- Persist ---------------------------------------------------------
    const { error: insertError } = await supabase.from("module_attempts").insert({
      user_id: user.id,
      module_id: mod.id,
      learner_verdict: learnerVerdict ?? null,
      learner_reasoning: reasoning || null,
      score: outcome.score,
      signals_hit: outcome.signals_hit,
      feedback,
      advanced_reasoner: outcome.advanced_reasoner,
      over_flagged: outcome.over_flagged,
      dangerous_reasoning: outcome.dangerous_reasoning,
      behavioural_log: behaviour,
      graded_by: gradedBy,
    });

    if (insertError) {
      // Log it but still return the grade — a storage problem must not cost
      // the learner their feedback.
      console.error("[/api/modules/grade] attempt insert failed:", insertError);
    }

    const { data: existing } = await supabase
      .from("user_module_progress")
      .select("attempts_count, best_score")
      .eq("user_id", user.id)
      .eq("module_id", mod.id)
      .maybeSingle();

    await supabase.from("user_module_progress").upsert(
      {
        user_id: user.id,
        module_id: mod.id,
        status: "completed",
        attempts_count: (existing?.attempts_count ?? 0) + 1,
        best_score: bestOf(existing?.best_score ?? null, outcome.score),
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,module_id" }
    );

    return NextResponse.json(
      {
        score: outcome.score,
        signals_hit: outcome.signals_hit,
        advanced_reasoner: outcome.advanced_reasoner,
        over_flagged: outcome.over_flagged,
        dangerous_reasoning: outcome.dangerous_reasoning,
        feedback,
        graded_by: gradedBy,
        missed_signal: outcome.missed_signal,
        corrections: outcome.corrections,
        // Read from the DB, never generated. The learner sees this after the
        // grader's response.
        canonical_reasoning: mod.canonical_reasoning,
        reveal: mod.reveal,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[/api/modules/grade] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const RANK: Record<string, number> = { reject: 0, partial: 1, accept: 2 };

function bestOf(a: string | null, b: string): string {
  if (!a) return b;
  return (RANK[b] ?? 0) > (RANK[a] ?? 0) ? b : a;
}

/**
 * Used when the model produced no feedback text (fallback path). Deliberately
 * plain: it must never be the thing that shames a learner, and it must never
 * invent a red flag that isn't in the module's signal list.
 */
function composeFallbackFeedback(
  outcome: ReturnType<typeof gradeAttempt>,
  gradedBy: string
): string {
  if (gradedBy === "action_only") {
    return "Recorded what you did. Read the explanation below — it covers what was going on and the one habit worth keeping.";
  }
  const named = outcome.signals_hit.length;
  const missed = outcome.missed_signal;

  if (outcome.over_flagged) {
    return "Caution is a good instinct, and this one is genuinely hard. Have a look at the explanation below for the specific evidence that points the other way — being able to say 'this one is fine, and here's why' is the harder half of the skill.";
  }
  if (outcome.score === "accept") {
    return `You named ${named} of the things that actually settle this. That's the evidence-first habit working.`;
  }
  if (outcome.score === "partial" && missed) {
    return `You picked up on something real here. The sharper version of what you were already sensing: ${missed.signal}.`;
  }
  if (missed) {
    return `Have a look at the explanation below. The strongest piece of evidence in this one: ${missed.signal}.`;
  }
  return "Have a look at the explanation below — it covers the evidence that settles this one.";
}
