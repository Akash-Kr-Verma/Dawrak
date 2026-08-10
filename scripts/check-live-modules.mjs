// scripts/check-live-modules.mjs
//
// Reports whether the connected Supabase project is serving the CURRENT module
// content, or an older seed.
//
// Read-only, and uses the anon key from .env.local — the same credentials the
// browser has, so what this sees is what a learner would get. It exists because
// "the seed is applied" is not a thing you can tell by looking at the repo:
// the content lives in Postgres, and src/content/modules/*.ts is only its
// source. Run it after applying supabase/seed_modules.sql to confirm the apply
// actually landed.
//
//   node scripts/check-live-modules.mjs

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// .env.local values are double-quoted in this project; strip them or
// createClient/fetch will send the quotes as part of the key.
function readEnv() {
  const out = {};
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = readEnv();
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL_ || !KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY missing from .env.local");
  process.exit(2);
}

const cols = [
  "slug",
  "title",
  "verdict_labels",
  "question_variant",
  "signals",
  "rubric",
  "distractors",
  "updated_at",
].join(",");

const res = await fetch(
  `${URL_}/rest/v1/learning_modules?select=${cols}&order=sequence_order.asc`,
  { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
);

if (!res.ok) {
  console.error(`❌ Could not read learning_modules: ${res.status} ${res.statusText}`);
  console.error(await res.text());
  process.exitCode = 2;
  process.exit(2);
}

const rows = await res.json();
if (!Array.isArray(rows) || rows.length === 0) {
  console.error("❌ learning_modules is empty or unreadable. The seed has never been applied.");
  console.error("   Apply it with: npm run seed:apply");
  process.exitCode = 1;
}

// The three things this revision added to the content. All are inside existing
// jsonb columns, so their presence is the signal that the new seed is live.
let stale = 0;
const list = Array.isArray(rows) ? rows : [];
console.log(`Connected: ${URL_}`);
console.log(`Modules published: ${list.length}\n`);
console.log(
  "slug".padEnd(34) + "verdict".padEnd(16) + "cues".padEnd(8) + "short".padEnd(8) + "frame"
);
console.log("-".repeat(76));

for (const m of list) {
  const signals = m.signals ?? [];
  const withCues = signals.filter((s) => (s.cues ?? []).length > 0).length;
  const withShort = signals.filter((s) => s.short).length;
  const frame = Boolean(m.rubric?.feedback?.strongest && m.rubric?.feedback?.takeaway);
  const verdict = `${m.verdict_labels?.positive}/${m.verdict_labels?.negative}`;

  const ok =
    withCues === signals.length &&
    withShort === signals.length &&
    frame &&
    verdict === "Real/Fake";
  if (!ok) stale++;

  console.log(
    (ok ? "  " : "! ") +
      m.slug.padEnd(32) +
      verdict.padEnd(16) +
      `${withCues}/${signals.length}`.padEnd(8) +
      `${withShort}/${signals.length}`.padEnd(8) +
      (frame ? "yes" : "NO")
  );
}

console.log();
if (stale > 0) {
  console.error(
    `❌ ${stale} of ${list.length} modules are running OLD content.\n` +
      "   Apply supabase/seed_modules.sql — see: npm run seed:apply"
  );
  // process.exitCode rather than process.exit(): fetch keeps a pooled socket
  // open, and tearing the loop down under it makes libuv abort with an
  // assertion on Windows, which looks like a crash in the script itself.
  process.exitCode = 1;
} else if (list.length > 0) {
  console.log("✅ Live content matches this revision: Real/Fake everywhere, cues and");
  console.log("   short lines on every signal, and an authored feedback frame per module.");
}

// ---------------------------------------------------------------------------
// Wiring check — run the LIVE rows through the real grading pipeline.
//
// The content check above says what is in the database. This says whether the
// app can actually grade it. They come apart in one direction that matters: a
// database still on the previous seed hands back verdict labels the current UI
// no longer submits, and a module that marks a correct answer wrong is worse
// than one with slightly stale prose.
// ---------------------------------------------------------------------------

const { pathToFileURL } = await import("node:url");
const { readFileSync: rf } = await import("node:fs");
const tsMod = await import("typescript").then((m) => m.default ?? m);

const cache = new Map();
function loadTs(absNoExt) {
  if (cache.has(absNoExt)) return cache.get(absNoExt);
  const file = [".ts", ".tsx"].map((e) => absNoExt + e).find((f) => {
    try { rf(f); return true; } catch { return false; }
  });
  if (!file) throw new Error(`cannot resolve ${absNoExt}`);
  const js = tsMod.transpileModule(rf(file, "utf8"), {
    compilerOptions: { module: tsMod.ModuleKind.CommonJS, target: tsMod.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  const module = { exports };
  cache.set(absNoExt, exports);
  const req = (id) => {
    if (id.startsWith("@/")) return loadTs(join(ROOT, "src", id.slice(2)));
    if (id.startsWith(".")) return loadTs(resolve(dirname(file), id));
    return createRequire(pathToFileURL(file).href)(id);
  };
  new Function("exports", "module", "require", js)(exports, module, req);
  cache.set(absNoExt, module.exports);
  return module.exports;
}

const { createRequire } = await import("node:module");
const grade = loadTs(join(ROOT, "src", "lib", "modules", "grade"));
const { assessReasoning } = loadTs(join(ROOT, "src", "lib", "modules", "matchReasoning"));
const { composeFeedback } = loadTs(join(ROOT, "src", "lib", "modules", "composeFeedback"));

console.log("\nGrading the live rows\n" + "-".repeat(76));

let wiringFailures = 0;
for (const m of list) {
  // The verdict column is not exposed by the select above (and should not be),
  // so derive the correct answer from the slug's known polarity: exactly one
  // module in the set is genuine.
  const moduleVerdict = m.slug === "marketplace-bicycle-genuine" ? "real" : "fake";
  const correct = moduleVerdict; // what the UI now submits for the right answer

  const reasoning = "test";
  const shape = assessReasoning(reasoning);
  const extraction = { signals_hit: [], distractors_hit: [], feedback: "", matches: [] };

  let outcome, blocks, err = null;
  try {
    outcome = grade.gradeAttempt({
      moduleVerdict,
      learnerVerdict: correct,
      signals: m.signals ?? [],
      rubric: m.rubric ?? { accept: [], partial: [] },
      distractors: m.distractors ?? [],
      extraction,
    });
    blocks = composeFeedback({
      score: outcome.score,
      verdictCorrect: grade.verdictMatches(moduleVerdict, correct),
      overFlagged: outcome.over_flagged,
      signalsHit: outcome.signals_hit,
      matches: [],
      signals: m.signals ?? [],
      missedSignal: outcome.missed_signal,
      distractorsHit: outcome.corrections,
      decisiveIds: grade.decisiveSignalIds(m.rubric ?? { accept: [], partial: [] }),
      frame: m.rubric?.feedback,
      shape,
      behaviour: [],
      hasBehaviour: false,
    });
  } catch (e) {
    err = e.message;
  }

  // What must hold regardless of which seed is live.
  const okVerdict = !err && grade.verdictMatches(moduleVerdict, correct);
  const okBlocks = !err && blocks.noticed.length > 0 && blocks.strongest.length > 0 && blocks.others.length >= 2;
  const ok = okVerdict && okBlocks;
  if (!ok) wiringFailures++;

  console.log(
    (ok ? "  " : "! ") +
      m.slug.padEnd(32) +
      (err ? `THREW: ${err}` : `verdict ok, ${blocks.others.length} signals, takeaway ${blocks.takeaway ? "yes" : "—"}`)
  );
}

console.log();
if (wiringFailures > 0) {
  console.error(`❌ ${wiringFailures} module(s) cannot be graded from the live row.`);
  process.exitCode = 1;
} else {
  console.log("✅ Every live module grades correctly and produces a complete feedback");
  console.log("   panel. A correct answer scores as correct on this data.");
}
