// src/lib/modules/grade.ts
//
// Grading, split so the model cannot drift.
//
// The problem this solves: if you feed module text to an LLM and say "grade
// this", it invents its own red flags and sometimes accepts a *wrong* reason
// because it sounds fluent. Swap models six months from now and the reasoning
// changes underneath you.
//
// The fix is structural, not a prompt tweak:
//   1. canonical_reasoning is a fixed string in the DB, never regenerated.
//   2. signals[] is the machine-readable form of it. Grading asks "which
//      signals did the learner name?", never "does this sound good?".
//   3. The model's ONLY job is extraction — which of a fixed list of signal
//      ids appear in the learner's text. It does not decide the score.
//   4. THIS FILE decides the score, in code, by applying the rubric literally.
//
// Run it a thousand times, swap the model, regenerate next year: the set of
// creditable reasons cannot drift, because it isn't the model's to change.

import type {
  LearnerVerdict,
  ModuleDistractor,
  ModuleGrade,
  ModuleRubric,
  ModuleSignal,
  RubricClause,
} from "@/types/modules";
import {
  matchDistractors,
  matchSignals,
  type CueMatch,
} from "./matchReasoning";

export interface ExtractionResult {
  /** Signal ids the learner named. Anything not in the module's list is dropped. */
  signals_hit: string[];
  /** Indices into the module's distractors[] that the reasoning rests on. */
  distractors_hit: number[];
  /** The model's feedback sentence(s). Score-free. */
  feedback: string;
  /**
   * Cue matches carrying the learner's own words. Always populated by the
   * deterministic matcher, even on the AI path — the model returns ids, and
   * feedback that quotes the learner needs the spans.
   */
  matches: CueMatch[];
}

export interface GradeInput {
  moduleVerdict: "real" | "fake";
  learnerVerdict: LearnerVerdict | null;
  signals: ModuleSignal[];
  rubric: ModuleRubric;
  distractors: ModuleDistractor[];
  extraction: ExtractionResult;
}

export interface GradeOutcome {
  score: ModuleGrade;
  signals_hit: string[];
  advanced_reasoner: boolean;
  over_flagged: boolean;
  dangerous_reasoning: boolean;
  /** Highest-weight signal the learner missed. Feedback names at most this one. */
  missed_signal: ModuleSignal | null;
  /** Distractors the learner leaned on, for the correction line. */
  corrections: ModuleDistractor[];
}

// ---------------------------------------------------------------------------
// Verdict comparison
// ---------------------------------------------------------------------------

/**
 * Module 07 reframes the binary: its buttons are Accurate / Misleading rather
 * than Real / Fake, because every fact in it is true and a learner who taps
 * "real" on the numbers has reasoned well. `verdict` stays 'fake' in the DB,
 * so 'misleading' is the matching answer.
 */
export function verdictMatches(
  moduleVerdict: "real" | "fake",
  learnerVerdict: LearnerVerdict | null
): boolean {
  if (!learnerVerdict) return false;
  if (moduleVerdict === "fake") {
    return learnerVerdict === "fake" || learnerVerdict === "misleading";
  }
  return learnerVerdict === "real" || learnerVerdict === "accurate";
}

// ---------------------------------------------------------------------------
// Rubric clauses
// ---------------------------------------------------------------------------

function clauseSatisfied(clause: RubricClause, hit: Set<string>): boolean {
  if (clause.andNot?.some((id) => hit.has(id))) return false;

  if (clause.names && clause.names.length > 0) {
    if (!clause.names.every((id) => hit.has(id))) return false;
  }

  if (clause.anyOf && clause.anyOf.length > 0) {
    const min = clause.min ?? 1;
    const count = clause.anyOf.filter((id) => hit.has(id)).length;
    if (count < min) return false;
  }

  // A clause with neither `names` nor `anyOf` is a no-op and must not
  // silently pass — that would turn every attempt into an ACCEPT.
  if (!clause.names?.length && !clause.anyOf?.length) return false;

  return true;
}

function anyClause(clauses: RubricClause[] | undefined, hit: Set<string>): boolean {
  return (clauses ?? []).some((c) => clauseSatisfied(c, hit));
}

// ---------------------------------------------------------------------------
// The grader
// ---------------------------------------------------------------------------

export function gradeAttempt(input: GradeInput): GradeOutcome {
  const { moduleVerdict, learnerVerdict, signals, rubric, distractors, extraction } =
    input;

  const validIds = new Set(signals.map((s) => s.id));
  // Drop anything the model returned that isn't a real signal for this module.
  // This is the hard boundary: a fluent-sounding invented reason scores zero.
  const signalsHit = Array.from(
    new Set(extraction.signals_hit.filter((id) => validIds.has(id)))
  );
  const hit = new Set(signalsHit);

  const corrections = extraction.distractors_hit
    .map((i) => distractors[i])
    .filter((d): d is ModuleDistractor => Boolean(d));

  // Distractor-driven flags (currently only Module 10's "test it with a small
  // amount first"). These fire regardless of the final score, because that
  // category of wrong answer is the one that could actually cost someone money
  // and it deserves to be visible rather than buried inside a PARTIAL.
  const dangerous_reasoning = corrections.some(
    (d) => d.flag === "dangerous_reasoning"
  );

  let over_flagged = false;
  let score: ModuleGrade;

  if (!verdictMatches(moduleVerdict, learnerVerdict)) {
    // Wrong verdict. Module 02 is the case that matters: calling a genuine
    // listing fake is over-flagging, the exact failure mode it exists to catch.
    const wv = rubric.wrongVerdict;
    score = wv?.score ?? "reject";
    if (wv?.flags?.includes("over_flagged")) over_flagged = true;
  } else if (rubric.rejectOnDistractor && corrections.length > 0 && !anyClause(rubric.accept, hit)) {
    // Reasoning rests on a near-miss trap and nothing stronger.
    score = "reject";
  } else if (anyClause(rubric.accept, hit)) {
    score = "accept";
  } else if (anyClause(rubric.partial, hit)) {
    score = "partial";
  } else {
    // Correct verdict, no named signal.
    score = "reject";
  }

  const advanced_reasoner =
    score !== "reject" &&
    (rubric.bonusAdvanced ?? []).some((id) => hit.has(id));

  return {
    score,
    signals_hit: signalsHit,
    advanced_reasoner,
    over_flagged,
    dangerous_reasoning,
    missed_signal: highestWeightMissed(signals, hit),
    corrections,
  };
}

/**
 * The signals that settle a module ON THEIR OWN, read out of the rubric.
 *
 * `weight` is not this. Weight ranks how much a signal matters; the rubric
 * decides what is sufficient, and the two genuinely differ — Module 06's
 * "forwarded many times" and Module 10's "six spots before midnight" are both
 * weight 3 and neither earns full credit alone, because each only counts
 * alongside a second signal from the same group.
 *
 * Feedback has to agree with the grader about that. Telling a learner they
 * "went straight to the thing that settles it" and then scoring them PARTIAL is
 * worse than either message on its own.
 *
 * An accept clause is individually decisive when it names ids outright, or when
 * it needs only one of a set. A clause requiring two or more is a combination,
 * so none of its members qualifies alone.
 */
export function decisiveSignalIds(rubric: ModuleRubric): string[] {
  const ids = new Set<string>();
  for (const clause of rubric.accept ?? []) {
    (clause.names ?? []).forEach((id) => ids.add(id));
    if (clause.anyOf && (clause.min ?? 1) === 1) {
      clause.anyOf.forEach((id) => ids.add(id));
    }
  }
  return Array.from(ids);
}

/**
 * Feedback names at most ONE signal the learner missed, highest weight first.
 * More than one is a lecture, not feedback.
 */
export function highestWeightMissed(
  signals: ModuleSignal[],
  hit: Set<string>
): ModuleSignal | null {
  const missed = signals
    .filter((s) => !hit.has(s.id))
    // Expert-tier signals are bonuses, not the thing to teach on a miss.
    .filter((s) => s.tier !== "expert" || signals.every((x) => x.tier === "expert"));

  if (missed.length === 0) return null;
  return missed.reduce((best, s) => (s.weight > best.weight ? s : best));
}

// ---------------------------------------------------------------------------
// Deterministic fallback extraction
// ---------------------------------------------------------------------------

/**
 * Match the learner's text against the authored cues on each signal.
 *
 * This is no longer only a fallback. It runs on every attempt, because the
 * feedback quotes the learner's own words and the model returns ids without
 * spans. When there is no API key — which is the current state of this
 * deployment — it is also the whole extraction step.
 *
 * It under-credits rather than over-credits by design: a cue has to be present,
 * in order, for the signal to count. A false ACCEPT teaches a learner that a
 * weak reason was a good one, which is worse than a PARTIAL they disagree with.
 */
export function extractSignalsHeuristically(
  reasoning: string,
  signals: ModuleSignal[],
  distractors: ModuleDistractor[]
): ExtractionResult {
  const matches = matchSignals(reasoning, signals);
  const distractorMatches = matchDistractors(reasoning, distractors);

  return {
    signals_hit: Array.from(new Set(matches.map((m) => m.id))),
    distractors_hit: Array.from(
      new Set(distractorMatches.map((m) => Number(m.id)))
    ).filter((i) => Number.isInteger(i)),
    feedback: "",
    matches,
  };
}
