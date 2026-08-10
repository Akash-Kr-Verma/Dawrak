// src/lib/modules/matchReasoning.ts
//
// Reads what the learner actually wrote.
//
// The old heuristic derived keywords from the signal statement itself and asked
// for a two-word overlap. That fails in both directions: a learner who writes
// "he wants me to pay before the parcel is released" matches nothing in
// "Demands payment during the call", while a learner who writes "the payment
// screen was during a call" matches it. Signals now carry authored `cues` —
// phrases a learner would plausibly type — and this file matches against those.
//
// Two things it returns that the old one didn't, both of which the feedback
// needs in order to be about the learner rather than about the module:
//
//   1. WHICH cue matched, so feedback can name the specific thing they saw.
//   2. The learner's OWN span of text that matched, so feedback can quote them.
//      Quoting is the difference between "you named the payment demand" and
//      "you said the fee was the giveaway" — the second one proves we read it.
//
// Nothing here invents analysis. A phrase is credited only if it is present.

import type { ModuleDistractor, ModuleSignal } from "@/types/modules";

export interface CueMatch {
  /** Signal id, or distractor index for distractor matches. */
  id: string;
  /** The authored cue that fired. */
  cue: string;
  /** The learner's own words, trimmed for quoting. */
  quote: string;
}

// ---------------------------------------------------------------------------
// Tokenizing
// ---------------------------------------------------------------------------

interface Token {
  /** Lowercased, punctuation-stripped. */
  word: string;
  /** Offsets into the ORIGINAL string, so quotes keep the learner's spelling. */
  start: number;
  end: number;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const re = /[a-z0-9']+/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    tokens.push({
      word: m[0].toLowerCase().replace(/'/g, ""),
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return tokens;
}

/**
 * Crude stemming, deliberately.
 *
 * "inspect" should match "inspecting" and "inspection"; "pay" should match
 * "paying" and "paid". A real stemmer is a dependency and a source of surprise;
 * a prefix rule over words of four characters or more covers the endings that
 * actually show up in a sentence like "he let me inspect it before paying" and
 * fails safe when it doesn't.
 */
function wordsMatch(cueWord: string, textWord: string): boolean {
  if (cueWord === textWord) return true;
  if (cueWord.length >= 4 && textWord.startsWith(cueWord)) return true;
  if (textWord.length >= 4 && cueWord.startsWith(textWord)) return true;
  // pay/paid is the one common irregular that a prefix rule misses, and it is
  // load-bearing in half the modules.
  if ((cueWord === "pay" && textWord === "paid") || (cueWord === "paid" && textWord === "pay"))
    return true;
  return false;
}

/** How many tokens may sit between two consecutive cue words and still count. */
const MAX_GAP = 3;

/**
 * Find a cue's words in order within the learner's tokens.
 *
 * Ordered-with-gaps rather than exact substring: people don't reproduce a
 * phrase, they use it. "see it before paying" has to match "he said I can come
 * and see it myself before I pay anything", and it does — same words, same
 * order, small gaps. It does not match "I paid before I saw it", because order
 * is the thing that carries the meaning.
 */
function findPhrase(cueWords: string[], tokens: Token[]): { start: number; end: number } | null {
  for (let i = 0; i < tokens.length; i++) {
    if (!wordsMatch(cueWords[0], tokens[i].word)) continue;

    let cursor = i;
    let matched = 1;

    for (let c = 1; c < cueWords.length; c++) {
      let found = -1;
      for (let t = cursor + 1; t <= cursor + 1 + MAX_GAP && t < tokens.length; t++) {
        if (wordsMatch(cueWords[c], tokens[t].word)) {
          found = t;
          break;
        }
      }
      if (found === -1) break;
      cursor = found;
      matched++;
    }

    if (matched === cueWords.length) {
      return { start: tokens[i].start, end: tokens[cursor].end };
    }
  }
  return null;
}

const QUOTE_MAX_WORDS = 14;

/**
 * Widen a match to a readable fragment of the learner's sentence.
 *
 * A bare cue span reads like a keyword hit ("inspect it"); a little context
 * around it reads like someone quoting you back to yourself, which is the
 * point. Capped, because a learner who wrote a paragraph should not get the
 * paragraph handed back.
 */
function quoteAround(original: string, span: { start: number; end: number }): string {
  // Extend to sentence-ish boundaries, then clamp by word count.
  let start = span.start;
  let end = span.end;

  while (start > 0 && !".!?\n".includes(original[start - 1])) start--;
  while (end < original.length && !".!?\n".includes(original[end])) end++;

  let fragment = original.slice(start, end).trim();
  const words = fragment.split(/\s+/);
  if (words.length > QUOTE_MAX_WORDS) {
    // Keep the window around the match rather than the head of the sentence.
    const matchText = original.slice(span.start, span.end).trim();
    const idx = fragment.toLowerCase().indexOf(matchText.toLowerCase());
    const before = fragment.slice(0, Math.max(0, idx)).split(/\s+/).filter(Boolean);
    const keepBefore = before.slice(-4);
    const after = fragment.slice(idx + matchText.length).split(/\s+/).filter(Boolean);
    const keepAfter = after.slice(0, QUOTE_MAX_WORDS - keepBefore.length - matchText.split(/\s+/).length);
    fragment =
      (keepBefore.length ? "…" : "") +
      [...keepBefore, matchText, ...keepAfter].join(" ") +
      (after.length > keepAfter.length ? "…" : "");
  }
  return fragment.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

function matchCues(
  text: string,
  entries: Array<{ id: string; cues?: string[] }>
): CueMatch[] {
  const tokens = tokenize(text);
  if (tokens.length === 0) return [];

  const out: CueMatch[] = [];
  for (const entry of entries) {
    for (const cue of entry.cues ?? []) {
      const cueWords = tokenize(cue).map((t) => t.word);
      if (cueWords.length === 0) continue;
      const span = findPhrase(cueWords, tokens);
      if (span) {
        out.push({ id: entry.id, cue, quote: quoteAround(text, span) });
        break; // One match per signal is enough; the first cue is the best one.
      }
    }
  }
  return out;
}

export function matchSignals(text: string, signals: ModuleSignal[]): CueMatch[] {
  return matchCues(text, signals);
}

export function matchDistractors(
  text: string,
  distractors: ModuleDistractor[]
): CueMatch[] {
  return matchCues(
    text,
    distractors.map((d, i) => ({ id: String(i), cues: d.cues }))
  );
}

// ---------------------------------------------------------------------------
// Reasoning shape
// ---------------------------------------------------------------------------

/**
 * Phrases that express a conclusion without any evidence behind it. These are
 * not wrong — a bad feeling about a scam is often correct — but feedback has to
 * be able to tell "I could tell it was fake" apart from "he wouldn't give me a
 * callback number", because the teaching response is completely different.
 */
const VAGUE_MARKERS = [
  "looks fake", "looks real", "seems fake", "seems real", "feels fake",
  "feels real", "looks suspicious", "seems suspicious", "feels off",
  "something felt", "something seemed", "gut", "instinct", "just know",
  "just knew", "obviously", "obvious scam", "common sense", "i guessed",
  "guessing", "not sure", "no idea", "dont know", "i think its", "i think it is",
];

export interface ReasoningShape {
  words: number;
  /** Nothing usable to respond to. */
  empty: boolean;
  /** Very short — enough to record, not enough to analyse. */
  minimal: boolean;
  /** A verdict restated as a reason, with no observation attached. */
  vague: boolean;
}

export function assessReasoning(raw: string): ReasoningShape {
  const text = (raw ?? "").trim();
  const words = text ? text.split(/\s+/).length : 0;
  const flat = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ");

  return {
    words,
    empty: words === 0,
    minimal: words > 0 && words < 4,
    vague: VAGUE_MARKERS.some((v) => flat.includes(v)),
  };
}
