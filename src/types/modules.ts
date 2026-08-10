// src/types/modules.ts
//
// Types for the finalized learning-module system.
// Mirrors supabase/migrations/0002_learning_modules.sql 1:1.
//
// Content source of truth: play-your-part-modules-final.md (v1.2).

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

/**
 * Interaction type, not topic. Selects the renderer in
 * src/components/modules/. `interactive_call` is shared by modules 03 and 08 —
 * one engine, two `call_script` rows.
 */
export type ModuleFormat =
  | "sms_plus_landing_page"
  | "marketplace_listing"
  | "interactive_call"
  | "social_post_plus_donation_page"
  | "dm_plus_portal"
  | "forwarded_message"
  | "social_post_with_chart"
  | "interactive_payment_screen"
  | "group_chat";

export type ModuleGrade = "accept" | "partial" | "reject";

export type ModuleProgressStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "skipped";

/**
 * Every module now asks the same question and offers the same two buttons:
 * REAL or FAKE. Module 07 used to ask "accurate picture / misleading" because
 * every fact in it is true — that split the interaction pattern across the set
 * and made the judgement feel like a different exercise each time. The nuance
 * it existed to protect now lives where it belongs: in the explanation, which
 * says outright that the numbers weren't fabricated and the framing is what
 * makes the post fake.
 *
 * 'accurate' | 'misleading' remain in the union ONLY so attempts recorded
 * before that change still parse. Nothing emits them.
 */
export type LearnerVerdict = "real" | "fake" | "accurate" | "misleading";

// ---------------------------------------------------------------------------
// Signals — the machine-readable form of canonical_reasoning
// ---------------------------------------------------------------------------

/**
 * `green_flag` signals belong to REAL modules (currently only Module 02).
 * Same field, positive polarity — a learner "names a signal" either way.
 */
export type SignalPolarity = "red_flag" | "green_flag";

export type SignalTier = "primary" | "advanced" | "expert";

export interface ModuleSignal {
  /** Stable id used by the rubric and the grader. Never renumber these. */
  id: string;
  /** Human-readable statement of the signal, shown in feedback and reveal. */
  signal: string;
  /**
   * 1-3. Weight is also the strong/supporting line: a 3 settles the question on
   * its own or close to it, a 1-2 is real evidence that isn't enough by itself.
   * Feedback says so explicitly rather than praising every hit equally.
   */
  weight: 1 | 2 | 3;
  polarity: SignalPolarity;
  tier?: SignalTier;
  /**
   * One short line for the "Other signals" list. `signal` is written for an
   * author reading a rubric; `short` is written for a learner who has just
   * finished the scenario and will read four bullets, not four paragraphs.
   */
  short?: string;
  /**
   * Phrases that indicate the learner expressed THIS idea, in their own words.
   * Used by the deterministic matcher, which is the path that runs whenever
   * there is no AI key configured — so these are not a nicety, they are how
   * most learners' reasoning actually gets recognized.
   *
   * A cue containing a space is matched as a phrase. A single word is matched
   * on word boundaries. Write cues a learner would plausibly type, not the
   * vocabulary of the signal statement.
   */
  cues?: string[];
  /** Author's note on why this signal matters. Not shown to learners. */
  note?: string;
}

// ---------------------------------------------------------------------------
// Rubric — evaluated in code, never by the model
// ---------------------------------------------------------------------------

/**
 * A single condition over the set of signal ids the learner named.
 * `names` = all of these present. `anyOf` + `min` = at least `min` of these.
 * `andNot` = none of these present.
 */
export interface RubricClause {
  names?: string[];
  anyOf?: string[];
  min?: number;
  andNot?: string[];
}

/**
 * The authored half of the post-answer feedback.
 *
 * It lives on the rubric rather than in its own column for one practical
 * reason: `rubric` is already jsonb, already server-side-only, and already the
 * place that says how this module responds to a learner (see
 * `feedbackConstraints`). Putting it here means no migration is needed to ship
 * the new feedback shape — the seed regenerates the column.
 *
 * The learner-facing sequence is assembled at grade time as:
 *   What you noticed  — composed, personal, from their words and their actions
 *   Strongest clue    — `strongest`, authored, the same every time on purpose
 *   Other signals     — picked from signals[].short
 *   Takeaway          — `takeaway`, authored, one line they can carry out
 */
export interface FeedbackFrame {
  /** The one piece of evidence that settles this module. Two or three lines. */
  strongest: string;
  /** One memorable principle that outlives this scenario. One line. */
  takeaway: string;
  /**
   * Appended to "What you noticed" when the learner's verdict was wrong.
   * Module-specific because the useful thing to say differs: over-flagging a
   * genuine listing and missing a scam are opposite mistakes.
   */
  wrongVerdictNote?: string;
  /**
   * Appended when the verdict was right. Module 07 uses it to state outright
   * that the numbers were not fabricated, which the REAL/FAKE buttons can't
   * say on their own.
   */
  correctVerdictNote?: string;
}

export interface ModuleRubric {
  /** OR over clauses. First match wins. */
  accept: RubricClause[];
  /** OR over clauses, checked only if no accept clause matched. */
  partial: RubricClause[];
  /** Naming any of these sets `advanced_reasoner` on the attempt. */
  bonusAdvanced?: string[];
  /**
   * Signals that are full credit entirely on their own. Purely documentary —
   * the accept clauses already encode it — but it is the thing an author most
   * often needs to check, so it is stated explicitly.
   */
  sufficientAlone?: string[];
  /** What to do when the learner's verdict does not match the module's. */
  wrongVerdict?: {
    score: ModuleGrade;
    /** Attempt-level booleans to set. */
    flags?: Array<"over_flagged" | "advanced_reasoner" | "dangerous_reasoning">;
  };
  /** If true, leaning on a distractor forces REJECT regardless of signals. */
  rejectOnDistractor?: boolean;
  /** Tone/handling requirements injected into the grader prompt. */
  feedbackConstraints?: string[];
  /** The authored half of the four-part feedback. See FeedbackFrame. */
  feedback?: FeedbackFrame;
  /** Author's note. Not sent to the model. */
  notes?: string;
}

// ---------------------------------------------------------------------------
// Distractors — wrong-but-tempting reasons the grader must not credit
// ---------------------------------------------------------------------------

export interface ModuleDistractor {
  /** The tempting wrong reason, as a learner would phrase it. */
  claim: string;
  /** Why it is wrong, and how to correct it kindly. */
  correction: string;
  /** Phrases that indicate the learner leaned on this. Same rules as signal cues. */
  cues?: string[];
  /**
   * Attempt-level boolean to set if the learner's reasoning rests on this.
   * Currently only Module 10's "I'd test it with a small amount first".
   */
  flag?: "dangerous_reasoning" | "over_flagged";
}

// ---------------------------------------------------------------------------
// Reveal panel
// ---------------------------------------------------------------------------

export interface ModuleReveal {
  headline: string;
  body: string;
  sourceLinks?: string[];
  /** e.g. surfacing a national cybercrime helpline in a regional pack. */
  localizationNote?: string;
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export interface ModuleAsset {
  /** Slot name referenced by render_spec / content_blocks. */
  slot: string;
  what: string;
  source: string;
  license: string;
  /** Build constraints that are part of the pedagogy, not just production. */
  note?: string;
}

// ---------------------------------------------------------------------------
// Render spec — drives the screens
// ---------------------------------------------------------------------------

export type RenderEngine =
  /** N static screens the learner advances through, then judges. */
  | "screen_sequence"
  /** Branching call with a three-move classifier. Modules 03, 08. */
  | "interactive_call"
  /** Tap-through where the action *is* the answer. Module 09. */
  | "action_flow";

export interface ModuleScreen {
  id: string;
  /** Layout hint consumed by the format's renderer. */
  kind: string;
  /** How the learner moves on. `auto` = a plain Continue button. */
  advance?: {
    via: "button" | "link_tap" | "cta_tap" | "notification_tap" | "choice";
    label?: string;
  };
  /** Arbitrary per-screen presentation flags (padlock shown, axis start, ...). */
  props?: Record<string, unknown>;
}

export interface ModuleRenderSpec {
  engine: RenderEngine;
  /** Outer chrome. Most modules render inside a phone frame. */
  frame?: "phone" | "none";
  screens: ModuleScreen[];
  /**
   * Build-safety constraints that must survive into the implementation.
   * Module 01 and 05 render a simulated address bar; it must be static text,
   * never a real page, iframe, or posting form.
   */
  safety?: string[];
}

// ---------------------------------------------------------------------------
// Interactive call engine (modules 03 and 08)
// ---------------------------------------------------------------------------

/**
 * The caller has exactly three moves, and everything the learner does maps to
 * one of them. This is not a simplification for build reasons — a real scammer
 * also only has these three moves, which is the lesson.
 */
export type CallerMove =
  /** Agrees with the doubt and folds it into the story. Default fallback. */
  | "absorb_redirect"
  /** Never gives a checkable detail; raises the stakes instead. */
  | "deflect_escalate"
  /** A deadline, a consequence, a transfer to "enforcement". */
  | "time_pressure";

export interface CallOption {
  id: string;
  /** What the learner taps. */
  label: string;
  /** Classification of the learner's move. */
  type: "doubt" | "engaged" | "verify" | "refuse" | "comply" | "end_call";
  /** True for the moves the module wants to reward. */
  correct?: boolean;
  /** Caller's scripted reply. */
  response?: string;
  /** Which of the three moves the reply is. */
  callerMove?: CallerMove;
  /** Behavioural flags to record if the learner picks this. */
  logs?: string[];
  /** Ends the call immediately (hang up, or comply-and-finish). */
  terminal?: boolean;
}

export interface CallTurn {
  id: string;
  /** What the caller says before the options appear. */
  callerLine: string;
  options: CallOption[];
}

export interface CallScript {
  /** The lock-screen line. Its tap is also the audio-unlock gesture. */
  armingCopy: string;
  /** Caller identity as displayed on the ring screen. */
  ring: {
    appLabel: string;
    callerName: string;
    callerNumber: string;
    avatar: "org_logo" | "silhouette";
    /** Ring for the full duration before any timeout. Discomfort is the lesson. */
    ringSeconds: number;
  };
  /** Fixed opening line, before turn 1. */
  opening: string;
  turns: CallTurn[];
  /** Red banner across the top of the connected screen (Module 08). */
  pressureBanner?: string;
  /** Hard stop. Never let a learner get stuck. */
  maxTurns: number;
  maxSeconds: number;
  /**
   * Behavioural outcomes graded separately from written reasoning, with the
   * feedback line for each. No shaming on the comply branches — ever.
   */
  behaviouralOutcomes: Array<{
    key: string;
    feedback: string;
    positive: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// Action flow (module 09)
// ---------------------------------------------------------------------------

export interface ActionFlowStep {
  id: string;
  kind: string;
  props?: Record<string, unknown>;
  /** Choices whose selection is itself the answer. */
  actions?: Array<{
    id: string;
    label: string;
    correct?: boolean;
    logs?: string[];
    /** Step id to go to. `reveal` ends the flow. */
    next: string;
  }>;
}

// ---------------------------------------------------------------------------
// The module
// ---------------------------------------------------------------------------

export interface LearningModule {
  id: string;
  slug: string;
  title: string;
  verdict: "real" | "fake";
  difficulty: 1 | 2 | 3 | 4 | 5;
  format: ModuleFormat;
  est_seconds: number;
  tags: string[];

  prompt_text: string;
  /** Module 07 only. Reframes the binary from real/fake to accurate/misleading. */
  question_variant: string | null;
  verdict_labels: { positive: string; negative: string };

  render_spec: ModuleRenderSpec;
  assets: ModuleAsset[];
  content_blocks: Record<string, unknown>;

  signals: ModuleSignal[];
  /** IMMUTABLE. Never generated by an AI call. See the migration's comment. */
  canonical_reasoning: string;
  rubric: ModuleRubric;
  distractors: ModuleDistractor[];
  reveal: ModuleReveal;

  call_script: CallScript | null;

  content_warning: boolean;
  content_warning_text: string | null;
  skippable_without_penalty: boolean;
  sequence_order: number;

  is_published: boolean;
}

/** The authored shape — everything except DB-generated columns. */
export type AuthoredModule = Omit<LearningModule, "id" | "is_published">;

/**
 * What the client is allowed to load before the learner judges.
 *
 * Deliberately excludes `verdict`, `signals`, `rubric`, `distractors`,
 * `canonical_reasoning` and `reveal`: those are the answer, and shipping them
 * to the browser up front means a curious learner can read the answer out of
 * the network tab. They come back from /api/modules/grade after submission.
 */
export type RunnableModule = Pick<
  LearningModule,
  | "id"
  | "slug"
  | "title"
  | "difficulty"
  | "format"
  | "est_seconds"
  | "tags"
  | "prompt_text"
  | "question_variant"
  | "verdict_labels"
  | "render_spec"
  | "assets"
  | "content_blocks"
  | "call_script"
  | "content_warning"
  | "content_warning_text"
  | "skippable_without_penalty"
  | "sequence_order"
>;

// ---------------------------------------------------------------------------
// Attempts & progress
// ---------------------------------------------------------------------------

export interface ModuleAttempt {
  id: string;
  user_id: string;
  module_id: string;
  learner_verdict: LearnerVerdict | null;
  learner_reasoning: string | null;
  score: ModuleGrade;
  signals_hit: string[];
  feedback: string | null;
  advanced_reasoner: boolean;
  over_flagged: boolean;
  dangerous_reasoning: boolean;
  behavioural_log: Record<string, unknown>;
  graded_by: "ai" | "deterministic" | "action_only";
  created_at: string;
}

export interface UserModuleProgress {
  id: string;
  user_id: string;
  module_id: string;
  status: ModuleProgressStatus;
  skipped_without_penalty: boolean;
  best_score: ModuleGrade | null;
  attempts_count: number;
  completed_at: string | null;
  updated_at: string;
}

/**
 * The four-part learning sequence shown after judging, in display order.
 *
 * Only `noticed` is personal — it is built from what this learner wrote, what
 * they did, and what they walked past. The other three are the module's
 * teaching, reorganized so it can be read rather than skipped.
 */
export interface FeedbackBlocks {
  /** Personalized. Never a stock sentence when there is real input to respond to. */
  noticed: string;
  /** The single most important piece of evidence in this scenario. */
  strongest: string;
  /** 2-4 short supporting evidence points. */
  others: string[];
  /** One principle that applies outside the module. */
  takeaway: string;
  /** Corrections for wrong-but-tempting reasons the learner actually leaned on. */
  corrections: string[];
}

/** Shape returned by the grading endpoint. */
export interface GradeResult {
  score: ModuleGrade;
  signals_hit: string[];
  advanced_reasoner: boolean;
  over_flagged: boolean;
  dangerous_reasoning: boolean;
  /** Flattened `blocks.noticed`. Kept for the module_attempts.feedback column. */
  feedback: string;
  blocks: FeedbackBlocks;
  graded_by: "ai" | "deterministic" | "action_only";
}
