// src/lib/modules/composeFeedback.ts
//
// Turns a graded attempt into the four things a learner reads afterwards:
//
//   What you noticed → Strongest clue → Other signals → Takeaway
//
// The first one is the whole reason this file exists. Before, every learner who
// got a module right read the same paragraph, and the "How do you know?" box
// was decorative — you could type anything and the response was identical. That
// teaches answer recognition, which is the opposite of the skill.
//
// Three rules govern what goes in `noticed`, and they are the ones to keep if
// this ever gets rewritten:
//
//   1. NEVER claim the learner said something they didn't. Every sentence is
//      derived from a cue that actually matched, a distractor that actually
//      matched, an action actually taken, or the plain absence of any of those.
//      There is no path here that invents an observation.
//   2. A correct verdict is not automatically good reasoning. Naming only
//      supporting evidence gets told so, warmly and specifically — an account
//      being old is worth something, being allowed to inspect the bike before
//      paying is worth more, and a learner who can't tell those apart hasn't
//      learned anything durable.
//   3. A wrong verdict with a real observation in it gets the observation
//      acknowledged first. People stop reading after being told they're wrong.

import type {
  FeedbackBlocks,
  FeedbackFrame,
  ModuleDistractor,
  ModuleGrade,
  ModuleSignal,
} from "@/types/modules";
import type { CueMatch, ReasoningShape } from "./matchReasoning";

export interface ComposeInput {
  score: ModuleGrade;
  verdictCorrect: boolean;
  overFlagged: boolean;
  /** Signal ids credited by the rubric. */
  signalsHit: string[];
  /** Matches carrying the learner's own words. May be empty on the AI path. */
  matches: CueMatch[];
  signals: ModuleSignal[];
  /** Highest-weight signal the learner did not name. */
  missedSignal: ModuleSignal | null;
  distractorsHit: ModuleDistractor[];
  /**
   * Signal ids that earn full credit on their own, from `decisiveSignalIds()`.
   * This — not `weight` — is what decides whether the learner named something
   * that settles the module, because it is what the grader used.
   */
  decisiveIds: string[];
  frame?: FeedbackFrame;
  shape: ReasoningShape;
  /** Behaviour lines from an interactive engine, in the order they fired. */
  behaviour: Array<{ key: string; feedback: string; positive: boolean }>;
  /** Whether this module records actions at all (call / payment flows). */
  hasBehaviour: boolean;
  /**
   * An optional personalized observation from the extraction model. Used as an
   * additional sentence, never as a replacement for the composed ones — the
   * model can be absent, slow, or wrong, and the feedback still has to be
   * about this learner.
   */
  aiNote?: string;
}

const MAX_BEHAVIOUR_LINES = 3;

// ---------------------------------------------------------------------------

export function composeFeedback(input: ComposeInput): FeedbackBlocks {
  const byId = new Map(input.signals.map((s) => [s.id, s]));
  const hit = input.signalsHit
    .map((id) => byId.get(id))
    .filter((s): s is ModuleSignal => Boolean(s));

  // Only quote a match the rubric actually credited. Quoting a learner's words
  // back at them next to a signal we then didn't count reads as a bug.
  const creditedMatches = input.matches.filter((m) => input.signalsHit.includes(m.id));
  const quoteFor = (id: string) => creditedMatches.find((m) => m.id === id)?.quote;

  const decisive = new Set(input.decisiveIds);
  const strongHits = hit.filter((s) => decisive.has(s.id));
  const supportingHits = hit.filter((s) => !decisive.has(s.id));

  const sentences: string[] = [];

  // --- What they did ------------------------------------------------------
  // Actions come first in interactive modules because they happened first, and
  // because what someone does under pressure is more honest than what they
  // write about it afterwards.
  if (input.behaviour.length > 0) {
    // Capped at three. A learner who explored the branching can trip five or
    // six outcomes, and reading six paragraphs about your own call is the
    // essay problem this rewrite exists to remove. Content files order these
    // most-instructive-first for exactly this reason.
    sentences.push(...input.behaviour.slice(0, MAX_BEHAVIOUR_LINES).map((b) => b.feedback));
  } else if (input.hasBehaviour) {
    sentences.push(
      "You stayed in it to the end without giving anything up — worth noticing, though the fastest safe move was always available."
    );
  }

  // --- What they wrote ----------------------------------------------------
  sentences.push(
    ...describeReasoning(input, { strongHits, supportingHits, quoteFor, decisive })
  );

  if (input.aiNote && input.aiNote.trim()) {
    sentences.push(input.aiNote.trim());
  }

  // --- Verdict framing ----------------------------------------------------
  if (!input.verdictCorrect && input.frame?.wrongVerdictNote) {
    sentences.push(input.frame.wrongVerdictNote);
  }
  if (input.verdictCorrect && input.frame?.correctVerdictNote) {
    sentences.push(input.frame.correctVerdictNote);
  }

  return {
    noticed: sentences.filter(Boolean).join(" "),
    strongest: input.frame?.strongest ?? fallbackStrongest(input.signals),
    others: pickOthers(input.signals, hit),
    takeaway: input.frame?.takeaway ?? "",
    corrections: input.distractorsHit.map((d) => d.correction),
  };
}

// ---------------------------------------------------------------------------
// "What you noticed"
// ---------------------------------------------------------------------------

function describeReasoning(
  input: ComposeInput,
  ctx: {
    strongHits: ModuleSignal[];
    supportingHits: ModuleSignal[];
    quoteFor: (id: string) => string | undefined;
    decisive: Set<string>;
  }
): string[] {
  const { strongHits, supportingHits, quoteFor, decisive } = ctx;
  const out: string[] = [];
  const missed = input.missedSignal;

  // --- Nothing to work with ----------------------------------------------
  if (input.shape.empty || input.shape.minimal) {
    out.push(
      input.hasBehaviour
        ? "You didn't write much about why — no problem, what you did is recorded above."
        : "You didn't write much about why, so there's nothing to check your thinking against."
    );
    if (missed) {
      out.push(`Next time, the thing to point at is this: ${lower(clauseOf(missed))}.`);
    }
    return out;
  }

  // --- A conclusion with no observation behind it -------------------------
  if (strongHits.length === 0 && supportingHits.length === 0) {
    if (input.shape.vague) {
      out.push(
        input.verdictCorrect
          ? "You got there, but what you wrote is the conclusion rather than the evidence — a feeling you can't point at doesn't transfer to the next one."
          : "What you wrote is a feeling rather than something you can point at, and that's the part worth changing — evidence is what survives being wrong."
      );
    } else {
      out.push(
        input.verdictCorrect
          ? "You landed on the right call, but nothing you wrote matches the evidence that settles this one."
          : "Nothing in what you wrote matches the evidence in this scenario."
      );
    }
    if (missed) {
      out.push(`The specific thing to look for: ${lower(clauseOf(missed))}.`);
    }
    return out;
  }

  // --- Real evidence, but only the supporting kind ------------------------
  // The bike module lives or dies on this branch: "the account is old" is a
  // true observation and a weak one, and a learner told "correct!" for it has
  // been taught to trust account age.
  if (strongHits.length === 0 && supportingHits.length > 0) {
    const s = supportingHits[0];
    const q = quoteFor(s.id);
    out.push(
      q
        ? `You picked up on something real — you said ${quoted(q)}.`
        : `You picked up on something real: ${lower(clauseOf(s))}.`
    );
    out.push(
      "That's supporting evidence, though. It makes the picture more likely, it doesn't settle it on its own."
    );
    // The stronger piece must come from the set the grader treats as
    // sufficient, not merely from the highest-weight thing left over.
    const stronger = strongestUnnamed(input.signals, input.signalsHit, decisive);
    if (stronger) {
      out.push(`The stronger piece was right there: ${lower(clauseOf(stronger))}.`);
    }
    return out;
  }

  // --- They named something that actually settles it ----------------------
  // "You went straight to the thing that settles it" is only true if they then
  // drew the right conclusion from it. Someone who spotted that the seller
  // invites inspection and still called the listing fake found the evidence and
  // read it backwards, and the feedback has to say the first half without
  // implying the second.
  const lead = strongHits[0];
  const leadQuote = quoteFor(lead.id);
  if (input.verdictCorrect) {
    out.push(
      leadQuote
        ? `You went straight to the thing that settles it — you said ${quoted(leadQuote)}.`
        : `You named the thing that settles it: ${lower(clauseOf(lead))}.`
    );
  } else {
    out.push(
      leadQuote
        ? `You did spot the thing that settles this — you said ${quoted(leadQuote)}.`
        : `You did spot the thing that settles this: ${lower(clauseOf(lead))}.`
    );
  }

  const extras = [...strongHits.slice(1), ...supportingHits];
  if (extras.length === 1) {
    out.push(`You also caught ${lower(clauseOf(extras[0]))}.`);
  } else if (extras.length > 1) {
    out.push(
      `You also caught ${lower(clauseOf(extras[0]))}, and ${extras.length - 1} more of the signals in this one.`
    );
  }

  if (!input.verdictCorrect) {
    // Right observation, wrong call. Say both plainly.
    out.push("That observation was sound — it's the conclusion you drew from it that went the other way.");
  } else if (missed && decisive.has(missed.id)) {
    out.push(`One you walked past: ${lower(clauseOf(missed))}.`);
  }

  return out;
}

// ---------------------------------------------------------------------------
// "Other signals"
// ---------------------------------------------------------------------------

/**
 * Two to four short evidence points, heaviest first, preferring the ones the
 * learner did NOT name — repeating their own answer back is not teaching, and
 * four bullets is the most anyone reads after an interactive scenario.
 */
function pickOthers(signals: ModuleSignal[], hit: ModuleSignal[]): string[] {
  const hitIds = new Set(hit.map((s) => s.id));
  const ranked = [...signals].sort((a, b) => b.weight - a.weight);
  const unnamed = ranked.filter((s) => !hitIds.has(s.id));
  const named = ranked.filter((s) => hitIds.has(s.id));
  return [...unnamed, ...named].slice(0, 4).map(shortOf);
}

function strongestUnnamed(
  signals: ModuleSignal[],
  hitIds: string[],
  decisive: Set<string>
): ModuleSignal | null {
  const unnamed = signals
    .filter((s) => !hitIds.includes(s.id))
    .sort((a, b) => b.weight - a.weight);
  return unnamed.find((s) => decisive.has(s.id)) ?? unnamed[0] ?? null;
}

function fallbackStrongest(signals: ModuleSignal[]): string {
  const top = [...signals].sort((a, b) => b.weight - a.weight)[0];
  return top ? shortOf(top) : "";
}

// ---------------------------------------------------------------------------

function shortOf(s: ModuleSignal): string {
  return (s.short ?? s.signal).trim().replace(/\.$/, "");
}

/**
 * The clause form of a signal, for splicing into a sentence.
 *
 * `short` is written to stand alone as a bullet, so it often runs to two
 * sentences — which is right in the "Other signals" list and wrong in the
 * middle of "The stronger piece was right there: …", where it turns one line of
 * feedback into a paragraph. The first sentence always carries the claim; the
 * second is the elaboration, and the bullet list is where that belongs.
 */
function clauseOf(s: ModuleSignal): string {
  const full = shortOf(s);
  // Split on sentence end, but not on the decimal in "10,000" or an initial.
  const match = full.match(/^(.+?[.!?])\s+[A-Z“]/);
  return (match ? match[1] : full).replace(/\.$/, "");
}

/** Lowercase a leading capital when a line is spliced mid-sentence. */
function lower(s: string): string {
  if (!s) return s;
  // Leave acronyms and proper-ish starts alone: "PIN means paying" must not
  // become "pIN means paying".
  if (s.length > 1 && s[1] === s[1].toUpperCase() && /[A-Z]/.test(s[1])) return s;
  return s[0].toLowerCase() + s.slice(1);
}

function quoted(q: string): string {
  return `“${q.replace(/^["“']|["”']$/g, "")}”`;
}
