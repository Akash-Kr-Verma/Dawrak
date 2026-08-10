// src/lib/modules/graderPrompt.ts
//
// The grader prompt, from the content spec §7.
//
// One deliberate strengthening of the spec's version: §7 asks the model to
// return a `score`. We ask it only to EXTRACT which of the fixed signals the
// learner named, and compute the score in code (lib/modules/grade.ts) by
// applying the rubric literally. Any `score` the model emits is discarded.
//
// This follows §7's own stated rationale further than §7's own prompt does:
// "the model never generates red flags — it selects from a fixed list."
// Extraction is a judgement a model is good at. Applying a rubric is a
// judgement code is good at, and code cannot be talked into an ACCEPT by
// fluent writing.

import type {
  ModuleDistractor,
  ModuleRubric,
  ModuleSignal,
} from "@/types/modules";

export interface GraderPromptInput {
  moduleVerdict: "real" | "fake";
  learnerVerdict: string | null;
  learnerText: string;
  signals: ModuleSignal[];
  distractors: ModuleDistractor[];
  rubric: ModuleRubric;
  /** Behavioural events from the interactive engines, if any. */
  behaviouralLog?: Record<string, unknown>;
}

export function buildGraderPrompt(input: GraderPromptInput): string {
  const signalsList = input.signals
    .map((s) => `${s.id} (weight ${s.weight}): ${s.signal}`)
    .join("\n");

  const distractorsList = input.distractors
    .map((d, i) => `[${i}] "${d.claim}" — ${d.correction}`)
    .join("\n");

  const constraints = (input.rubric.feedbackConstraints ?? [])
    .map((c) => `- ${c}`)
    .join("\n");

  const behaviour =
    input.behaviouralLog && Object.keys(input.behaviouralLog).length > 0
      ? `\nWHAT THE LEARNER ACTUALLY DID (behavioural log — separate from their\nwritten reasoning; acknowledge it but do not let it change which signals\nyou extract):\n${JSON.stringify(input.behaviouralLog)}\n`
      : "";

  return `You are grading a learner's written reasoning in a media-literacy
exercise. You are NOT evaluating writing quality, grammar, or length.

MODULE VERDICT: ${input.moduleVerdict}
LEARNER VERDICT: ${input.learnerVerdict ?? "(not given)"}
LEARNER REASONING: ${JSON.stringify(input.learnerText)}
${behaviour}
The ONLY valid signals for this module are:
${signalsList}

The following are common WRONG reasons. If the learner's reasoning
rests on one, do not credit it — correct it kindly:
${distractorsList}

RULES — follow exactly:
1. Credit ONLY signals from the list above. If the learner names a
   reason that is not in the list and not in the distractor list,
   do not count it toward the score.
2. Do not invent additional red flags. Do not restate the full
   canonical reasoning — the learner sees the module's own
   explanation immediately after you, so anything you add there is
   duplication.
3. Do NOT decide the score. Your job is extraction: report which
   signal ids the learner actually named, and which distractors (by
   index) their reasoning rests on. The rubric is applied separately.
   A signal counts as named only if the learner expressed the idea —
   not if they merely used a similar word.
4. \`noticed\` is ONE sentence, about THIS learner's specific wording,
   and it must be something the composed feedback could not already
   say from the signal list alone: an observation they made that is
   real but doesn't map to a listed signal, a place where two of
   their reasons pull against each other, or a specific misreading
   of the scenario. If you have nothing of that kind to say, return
   an empty string. An empty string is the correct and common answer.
   Never write praise, never summarize their answer back to them,
   and never state a signal — those are handled elsewhere and
   duplicating them makes the feedback repeat itself.
5. Never tell a learner they were foolish, naive, or would have
   fallen for it. Never quote the learner's words back with scare
   quotes or sarcasm.
${constraints ? `\nADDITIONAL CONSTRAINTS FOR THIS MODULE:\n${constraints}\n` : ""}
Return JSON only:
{"signals_hit":["S1"],"distractors_hit":[0],"noticed":""}`;
}

/**
 * Parse whatever the model returned into a shape we trust.
 * Everything is re-validated downstream against the module's real signal ids,
 * so a hallucinated id here is harmless — it gets dropped, not credited.
 */
export function parseExtraction(raw: string): {
  signals_hit: string[];
  distractors_hit: number[];
  /** The model's one extra observation, if it had one. Usually empty. */
  noticed: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { signals_hit: [], distractors_hit: [], noticed: "" };
  }
  const o = (parsed ?? {}) as Record<string, unknown>;
  // `feedback` is read as a fallback so a model that answers in the old shape
  // still produces something usable rather than silently nothing.
  const noticed =
    typeof o.noticed === "string"
      ? o.noticed
      : typeof o.feedback === "string"
      ? o.feedback
      : "";
  return {
    signals_hit: Array.isArray(o.signals_hit)
      ? o.signals_hit.filter((x): x is string => typeof x === "string")
      : [],
    distractors_hit: Array.isArray(o.distractors_hit)
      ? o.distractors_hit.filter((x): x is number => Number.isInteger(x))
      : [],
    noticed,
  };
}
