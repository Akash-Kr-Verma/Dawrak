// scripts/test-module-feedback.mjs
//
// Exercises the grading and feedback pipeline for all ten modules across the
// five cases that matter:
//
//   A  correct verdict + strong reasoning
//   B  correct verdict + weak reasoning        (must not be praised)
//   C  wrong verdict   + a real observation    (must be acknowledged)
//   D  wrong verdict   + vague reasoning       (must still teach something)
//   E  empty reasoning                         (must not crash or scold)
//
// Plus every behavioural branch of the two interactive call modules.
//
// Run with: npm run test:feedback
//
// This runs the same functions the API route runs, against the authored content
// in src/content/modules. It does NOT cover the AI extraction path — that path
// only ever ADDS signal ids on top of what is matched here, so what this proves
// is the floor: what a learner gets when no model is available, which is the
// current state of this deployment (no API key is configured).

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = join(ROOT, "src");

const require = createRequire(import.meta.url);
const ts = require("typescript");

// ---------------------------------------------------------------------------
// A minimal TS module loader, so the tests run the real source rather than a
// re-implementation of it. `@/` resolves to src/, the way tsconfig says.
// ---------------------------------------------------------------------------

const cache = new Map();

function loadTs(absPathNoExt) {
  if (cache.has(absPathNoExt)) return cache.get(absPathNoExt);

  const file = [".ts", ".tsx"]
    .map((ext) => absPathNoExt + ext)
    .find((candidate) => {
      try {
        readFileSync(candidate);
        return true;
      } catch {
        return false;
      }
    });
  if (!file) throw new Error(`Cannot resolve ${absPathNoExt}`);

  const js = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;

  const exports = {};
  const module = { exports };
  cache.set(absPathNoExt, exports);

  const localRequire = (id) => {
    if (id.startsWith("@/")) return loadTs(join(SRC, id.slice(2)));
    if (id.startsWith(".")) return loadTs(resolve(dirname(file), id));
    return require(id);
  };

  new Function("exports", "module", "require", js)(exports, module, localRequire);
  cache.set(absPathNoExt, module.exports);
  return module.exports;
}

const { decisiveSignalIds, extractSignalsHeuristically, gradeAttempt, verdictMatches } =
  loadTs(join(SRC, "lib", "modules", "grade"));
const { assessReasoning } = loadTs(join(SRC, "lib", "modules", "matchReasoning"));
const { composeFeedback } = loadTs(join(SRC, "lib", "modules", "composeFeedback"));
const { ALL_MODULES } = loadTs(join(SRC, "content", "modules", "index"));

const bySlug = Object.fromEntries(ALL_MODULES.map((m) => [m.slug, m]));

// ---------------------------------------------------------------------------
// The pipeline, exactly as /api/modules/grade assembles it.
// ---------------------------------------------------------------------------

function run(slug, { verdict, reasoning = "", behaviour = {} }) {
  const mod = bySlug[slug];
  if (!mod) throw new Error(`No module ${slug}`);

  const shape = assessReasoning(reasoning);
  const extraction =
    shape.empty || shape.minimal
      ? { signals_hit: [], distractors_hit: [], feedback: "", matches: [] }
      : extractSignalsHeuristically(reasoning, mod.signals, mod.distractors);

  const outcome = gradeAttempt({
    moduleVerdict: mod.verdict,
    learnerVerdict: verdict,
    signals: mod.signals,
    rubric: mod.rubric,
    distractors: mod.distractors,
    extraction,
  });

  const fired = (mod.call_script?.behaviouralOutcomes ?? []).filter((o) => behaviour[o.key]);

  const blocks = composeFeedback({
    score: outcome.score,
    verdictCorrect: verdictMatches(mod.verdict, verdict),
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

  return { mod, outcome, blocks, shape };
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

/** A: correct + strong. B: correct + weak. C: wrong + real observation.
 *  D: wrong + vague. E: empty. */
const CASES = {
  "ewallet-suspension-phishing": {
    A: { verdict: "fake", reasoning: "The message asks me to enter my PIN and the one time code through a link, and no real bank ever asks for that." },
    B: { verdict: "fake", reasoning: "The link is shortened so you cannot see where it actually goes." },
    C: { verdict: "real", reasoning: "It uses my real name so it must be from them, although the deadline of 24 hours is strange." },
    D: { verdict: "real", reasoning: "It looks real to me, seems fine." },
    E: { verdict: "fake", reasoning: "" },
  },
  "marketplace-bicycle-genuine": {
    A: { verdict: "real", reasoning: "Because the seller lets me inspect it and pay cash when I pick it up." },
    B: { verdict: "real", reasoning: "Because the Facebook account is old." },
    C: { verdict: "fake", reasoning: "Cash is suspicious to me, although he does say I can come and see the bike first." },
    D: { verdict: "fake", reasoning: "Something feels off about this one." },
    E: { verdict: "real", reasoning: "" },
  },
  "voip-customs-impersonation": {
    A: { verdict: "fake", reasoning: "He would not give me a number to call back, and he wanted me to pay a fee during the call." },
    B: { verdict: "fake", reasoning: "He had a badge and it looked official." },
    C: { verdict: "real", reasoning: "He gave a case number so it seemed official, but he did ask for money." },
    D: { verdict: "real", reasoning: "I was not sure, it seemed real enough." },
    E: { verdict: "fake", reasoning: "" },
  },
  "disaster-charity-appeal": {
    A: { verdict: "fake", reasoning: "They only take crypto and gift cards, and there is no registration number anywhere." },
    B: { verdict: "fake", reasoning: "There is a 48 hours deadline on the matched donation." },
    C: { verdict: "real", reasoning: "The photo is real so it must be genuine, but they want a bank transfer." },
    D: { verdict: "real", reasoning: "I believe it, looks real." },
    E: { verdict: "fake", reasoning: "" },
  },
  "fake-scholarship-portal": {
    A: { verdict: "fake", reasoning: "They asked me to pay a fee to receive the scholarship, which makes no sense." },
    B: { verdict: "fake", reasoning: "The deadline is only 72 hours which is a rush." },
    C: { verdict: "real", reasoning: "The portal looked professional, although they want my passport and bank details." },
    D: { verdict: "real", reasoning: "I think it is real." },
    E: { verdict: "fake", reasoning: "" },
  },
  "health-cure-forward": {
    A: { verdict: "fake", reasoning: "There is no study or source for it, and it claims no side effects which real medicine never has." },
    B: { verdict: "fake", reasoning: "It says forwarded many times at the top." },
    C: { verdict: "real", reasoning: "My aunt would not send me something fake, but there is no source for it." },
    D: { verdict: "real", reasoning: "Seems true to me." },
    E: { verdict: "fake", reasoning: "" },
  },
  "misleading-crime-statistic": {
    A: { verdict: "fake", reasoning: "The raw numbers are tiny, it is only six more incidents, and they compare January to February in one neighbourhood." },
    B: { verdict: "fake", reasoning: "The chart axis does not start at zero." },
    C: { verdict: "real", reasoning: "The numbers are accurate so it is fine, although it only covers two months." },
    D: { verdict: "real", reasoning: "Looks legit to me." },
    E: { verdict: "fake", reasoning: "" },
  },
  "digital-arrest-family-variant": {
    A: { verdict: "fake", reasoning: "He would not let me speak to my son and he told me not to tell anyone." },
    B: { verdict: "fake", reasoning: "There was a lot of time pressure about it being filed tonight." },
    C: { verdict: "real", reasoning: "He knew my sons name so it must be real." },
    D: { verdict: "real", reasoning: "I panicked, it seemed real." },
    E: { verdict: "fake", reasoning: "" },
  },
  "collect-request-reversal": {
    A: { verdict: "fake", reasoning: "You never enter your PIN to receive money, and the screen said requesting from you." },
    B: { verdict: "fake", reasoning: "He was rushing me the whole time." },
    C: { verdict: "real", reasoning: "He should have used cash instead, but he was rushing me." },
    D: { verdict: "real", reasoning: "Probably fine I think." },
    E: { verdict: "fake", reasoning: "" },
  },
  "trading-circle-investment": {
    A: { verdict: "fake", reasoning: "They guarantee returns, and nobody can guarantee an investment." },
    B: { verdict: "fake", reasoning: "Only 6 spots left before midnight is pressure." },
    C: { verdict: "real", reasoning: "I would test it with a small amount first to see if it works." },
    D: { verdict: "real", reasoning: "Looks like a good opportunity." },
    E: { verdict: "fake", reasoning: "" },
  },
};

/** Every branch of the two call modules, by the log a branch produces. */
const CALL_BRANCHES = {
  "voip-customs-impersonation": {
    "declined at ring": { declined_call: true },
    "hung up turn 1": { ended_call_before_turn_2: true },
    "denied expecting parcel": { questioned_caller: true, denied_expecting_parcel: true },
    "asked what is in the package": { questioned_caller: true, asked_what_package_contains: true },
    "asked for callback number": { questioned_caller: true, asked_for_callback_number: true },
    "reached the ID/payment ask": { questioned_caller: true, reached_payment_request: true },
    "asked for it in writing": { questioned_caller: true, asked_for_it_in_writing: true, reached_payment_request: true },
    "showed ID": { complied_with_id_or_payment: true, showed_id: true, reached_payment_request: true },
    "sent payment": { complied_with_id_or_payment: true, sent_payment: true, reached_payment_request: true },
    "hung up at turn 2": { ended_call: true, reached_payment_request: true },
  },
  "digital-arrest-family-variant": {
    "declined at ring": { declined_call: true },
    "asked to speak to child": { questioned_caller: true, asked_to_speak_to_child: true },
    "asked what he is accused of": { questioned_caller: true, asked_what_he_is_accused_of: true },
    "tried to contact child": { tried_to_contact_child: true, refused_isolation_instruction: true },
    "reached the payment ask": { reached_payment_request: true },
    "refused isolation": { refused_isolation_instruction: true, reached_payment_request: true },
    "asked for code word": { asked_for_verification: true, ended_call: true, reached_payment_request: true },
    "sent the deposit": { complied_with_payment: true, reached_payment_request: true },
    "hung up late": { ended_call: true, reached_payment_request: true },
  },
};

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

const failures = [];
const verbose = process.argv.includes("--verbose");

function check(label, condition, detail) {
  if (!condition) failures.push(`${label}\n      ${detail}`);
}

function show(label, r) {
  if (!verbose) return;
  console.log(`\n  ${label}  [${r.outcome.score}] signals=${r.outcome.signals_hit.join(",") || "—"}`);
  console.log(`    noticed:   ${r.blocks.noticed}`);
  console.log(`    strongest: ${r.blocks.strongest.slice(0, 96)}…`);
  console.log(`    others:    ${r.blocks.others.length} points`);
  console.log(`    takeaway:  ${r.blocks.takeaway.slice(0, 96)}…`);
  if (r.blocks.corrections.length) console.log(`    corrections: ${r.blocks.corrections.length}`);
}

const PRAISE = /straight to the thing that settles it|named the thing that settles it/i;

console.log("Reasoning cases\n" + "=".repeat(70));

for (const [slug, cases] of Object.entries(CASES)) {
  const mod = bySlug[slug];
  console.log(`\n${mod.title}  (${slug})`);

  // Every module must be answerable with Real/Fake and nothing else.
  check(
    `${slug}: verdict labels`,
    mod.verdict_labels.positive === "Real" && mod.verdict_labels.negative === "Fake",
    `got ${JSON.stringify(mod.verdict_labels)}`
  );
  check(`${slug}: has a feedback frame`, Boolean(mod.rubric.feedback?.strongest && mod.rubric.feedback?.takeaway),
    "rubric.feedback.strongest / .takeaway missing");
  check(`${slug}: every signal has cues`, mod.signals.every((s) => (s.cues ?? []).length > 0),
    `missing on: ${mod.signals.filter((s) => !(s.cues ?? []).length).map((s) => s.id).join(", ")}`);
  check(`${slug}: every signal has a short line`, mod.signals.every((s) => s.short),
    `missing on: ${mod.signals.filter((s) => !s.short).map((s) => s.id).join(", ")}`);

  for (const [name, input] of Object.entries(cases)) {
    const r = run(slug, input);
    show(`${name}`, r);

    // Structure is always complete.
    check(`${slug} ${name}: noticed is non-empty`, r.blocks.noticed.trim().length > 0, "empty");
    check(`${slug} ${name}: has strongest`, r.blocks.strongest.length > 20, r.blocks.strongest);
    check(`${slug} ${name}: 2-4 other signals`, r.blocks.others.length >= 2 && r.blocks.others.length <= 4,
      `got ${r.blocks.others.length}`);
    check(`${slug} ${name}: has takeaway`, r.blocks.takeaway.length > 20, r.blocks.takeaway);

    if (name === "A") {
      check(`${slug} A: full credit for strong reasoning`, r.outcome.score === "accept",
        `got ${r.outcome.score}, signals ${r.outcome.signals_hit.join(",") || "none"}`);
      // The whole point: the feedback repeats the learner's own words back.
      check(`${slug} A: quotes the learner`, r.blocks.noticed.includes("“"),
        r.blocks.noticed);
    }
    if (name === "B") {
      check(`${slug} B: weak reasoning is not full credit`, r.outcome.score !== "accept",
        `got ${r.outcome.score} for "${input.reasoning}"`);
      check(`${slug} B: says the evidence is only supporting`,
        /supporting evidence/i.test(r.blocks.noticed) || /stronger piece/i.test(r.blocks.noticed),
        r.blocks.noticed);
      check(`${slug} B: no unqualified praise`, !PRAISE.test(r.blocks.noticed), r.blocks.noticed);
    }
    if (name === "C") {
      check(`${slug} C: wrong verdict is not full credit`, r.outcome.score !== "accept",
        `got ${r.outcome.score}`);
      // Either the observation is credited, or a distractor correction is
      // shown. Silence on a real observation is the failure mode.
      check(`${slug} C: responds to the observation`,
        r.outcome.signals_hit.length > 0 || r.blocks.corrections.length > 0,
        r.blocks.noticed);
    }
    if (name === "D") {
      check(`${slug} D: still teaches`, /specific thing to look for|evidence|point at/i.test(r.blocks.noticed),
        r.blocks.noticed);
    }
    if (name === "E") {
      check(`${slug} E: handled gracefully`, /didn't write much/i.test(r.blocks.noticed),
        r.blocks.noticed);
    }
  }
}

console.log("\n\nCall branches\n" + "=".repeat(70));

for (const [slug, branches] of Object.entries(CALL_BRANCHES)) {
  console.log(`\n${bySlug[slug].title}`);
  for (const [name, behaviour] of Object.entries(branches)) {
    const r = run(slug, { verdict: "fake", reasoning: "", behaviour });
    const keys = Object.keys(behaviour);
    const known = (bySlug[slug].call_script.behaviouralOutcomes ?? []).map((o) => o.key);
    const recognized = keys.filter((k) => known.includes(k));

    check(`${slug} [${name}]: branch produces feedback`, recognized.length > 0,
      `none of ${keys.join(", ")} has a behaviouralOutcome`);
    check(`${slug} [${name}]: reflected in the feedback`,
      recognized.length === 0 || r.blocks.noticed.length > 40, r.blocks.noticed);

    console.log(`  ${name.padEnd(30)} → ${recognized.length} outcome(s): ${r.blocks.noticed.slice(0, 88)}…`);
  }
}

// Two different branches must not produce the same text — that would mean the
// actions weren't really being read.
for (const [slug, branches] of Object.entries(CALL_BRANCHES)) {
  const seen = new Map();
  for (const [name, behaviour] of Object.entries(branches)) {
    const { blocks } = run(slug, { verdict: "fake", reasoning: "", behaviour });
    if (seen.has(blocks.noticed)) {
      check(`${slug}: "${name}" and "${seen.get(blocks.noticed)}" give identical feedback`, false,
        blocks.noticed.slice(0, 120));
    }
    seen.set(blocks.noticed, name);
  }
}

// ---------------------------------------------------------------------------

console.log("\n" + "=".repeat(70));
if (failures.length) {
  console.error(`\n❌ ${failures.length} check(s) failed:\n`);
  failures.forEach((f) => console.error("  • " + f));
  process.exit(1);
}
console.log("\n✅ All checks passed.");
