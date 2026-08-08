// supabase/tests/module-system.test.mjs
//
// Runs the schema + migration + seed against PGlite — real Postgres compiled
// to WASM — and asserts the module system holds. No Docker, no Supabase CLI,
// no network, no credentials.
//
//   npm run test:modules
//
// The second half unit-tests the rubric evaluator against fixture answers,
// which is the part that actually guarantees grading can't drift.

import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..", "..");
const read = (p) => readFileSync(join(REPO, p), "utf8");

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${extra ? "  → " + extra : ""}`);
  }
};
const section = (s) => console.log(`\n── ${s} ──`);

// ===========================================================================
// PART 1 — migration + seed against real Postgres
// ===========================================================================

const db = new PGlite();

section("Supabase shims");
// PGlite is plain Postgres: it has no `auth` schema and no auth.uid()/role().
// Supabase provides those. Shimming them here lets the real RLS policies parse
// and apply exactly as written.
await db.exec(`
  create schema if not exists auth;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
  create or replace function auth.uid() returns uuid as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$ language sql stable;
  create or replace function auth.role() returns text as $$
    select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
  $$ language sql stable;
`);
ok("auth schema shim created", true);

section("Baseline schema.sql");
// PGlite ships no uuid-ossp extension; Supabase has it, and nothing in the
// schema actually uses it (gen_random_uuid is built in). Harness detail only.
const stripExt = (s) => s.replace(/create extension[^;]*;/gi, "");
try {
  await db.exec(stripExt(read("supabase/schema.sql")));
  ok("schema.sql applies cleanly", true);
} catch (e) {
  ok("schema.sql applies cleanly", false, e.message);
  process.exit(1);
}

section("Migration 0002_learning_modules.sql");
try {
  await db.exec(read("supabase/migrations/0002_learning_modules.sql"));
  ok("migration applies cleanly", true);
} catch (e) {
  ok("migration applies cleanly", false, e.message);
  process.exit(1);
}
try {
  await db.exec(read("supabase/migrations/0002_learning_modules.sql"));
  ok("migration is re-runnable (idempotent)", true);
} catch (e) {
  ok("migration is re-runnable (idempotent)", false, e.message);
}

section("Schema shape");
const tables = (
  await db.query(
    `select table_name from information_schema.tables where table_schema='public'`
  )
).rows.map((r) => r.table_name);
for (const t of [
  "learning_modules",
  "module_attempts",
  "user_module_progress",
  "profiles",
  "scenarios",
  "attempts",
  "taught_sessions",
]) {
  ok(`table ${t} exists`, tables.includes(t));
}
ok(
  "Daily Challenge tables left intact",
  tables.includes("scenarios") && tables.includes("attempts")
);

section("Seed");
try {
  await db.exec(read("supabase/seed_modules.sql"));
  ok("seed applies cleanly", true);
} catch (e) {
  ok("seed applies cleanly", false, e.message);
  process.exit(1);
}
try {
  await db.exec(read("supabase/seed_modules.sql"));
  ok("seed is idempotent", true);
} catch (e) {
  ok("seed is idempotent", false, e.message);
}

section("Content integrity");
const n = (await db.query(`select count(*)::int n from public.learning_modules`)).rows[0].n;
ok("10 modules present", n === 10, String(n));

ok(
  "every module has substantial canonical_reasoning",
  (
    await db.query(
      `select count(*)::int n from public.learning_modules
       where canonical_reasoning is null or length(trim(canonical_reasoning)) < 200`
    )
  ).rows[0].n === 0
);

const sig = (
  await db.query(
    `select slug, jsonb_array_length(signals) n from public.learning_modules order by sequence_order`
  )
).rows;
ok("every module has at least one signal", sig.every((r) => r.n >= 1));
console.log("    " + sig.map((r) => `${r.slug.split("-")[0]}:${r.n}`).join(" "));

const calls = (
  await db.query(
    `select slug, call_script is not null has from public.learning_modules where format='interactive_call'`
  )
).rows;
ok(
  "both interactive_call modules carry a call_script",
  calls.length === 2 && calls.every((r) => r.has)
);

const warn = (
  await db.query(
    `select slug, skippable_without_penalty s, content_warning_text is not null t
     from public.learning_modules where content_warning`
  )
).rows;
ok(
  "M08 has a content warning, warning text, and a penalty-free skip",
  warn.length === 1 &&
    warn[0].slug === "digital-arrest-family-variant" &&
    warn[0].s === true &&
    warn[0].t === true
);

const qv = (
  await db.query(
    `select slug, verdict_labels from public.learning_modules where question_variant is not null`
  )
).rows;
ok("only M07 has a question_variant", qv.length === 1 && qv[0].slug === "misleading-crime-statistic");
ok(
  "M07 relabels its buttons Accurate / Misleading",
  qv[0]?.verdict_labels?.negative === "Misleading"
);
ok(
  "exactly one REAL control module",
  (await db.query(`select count(*)::int n from public.learning_modules where verdict='real'`)).rows[0].n === 1
);

section("Sequence constraints (content spec §10)");
const violations = (await db.query(`select * from public.validate_module_sequence()`)).rows;
ok("validate_module_sequence() returns no violations", violations.length === 0, JSON.stringify(violations));
const order = (
  await db.query(`select sequence_order o, slug, format from public.learning_modules order by sequence_order`)
).rows;
console.log("    " + order.map((r) => `${r.o}.${r.slug.split("-")[0]}`).join(" → "));
ok("the REAL control is not first", order[0].slug !== "marketplace-bicycle-genuine");
ok(
  "the two calls are not adjacent",
  !order.some((r, i) => i < order.length - 1 && r.format === "interactive_call" && order[i + 1].format === "interactive_call")
);

section("canonical_reasoning immutability");
let blocked = false;
try {
  await db.exec(
    `update public.learning_modules set canonical_reasoning='AI rewrote this' where slug='ewallet-suspension-phishing'`
  );
} catch (e) {
  blocked = /immutable/i.test(e.message);
}
ok("a plain UPDATE is rejected", blocked);
ok(
  "the original text survived",
  (
    await db.query(
      `select left(canonical_reasoning,13) s from public.learning_modules where slug='ewallet-suspension-phishing'`
    )
  ).rows[0].s === "This is fake."
);
let optIn = false;
try {
  await db.exec(`begin;
    set local app.allow_canonical_edit='on';
    update public.learning_modules set canonical_reasoning = canonical_reasoning || ' x' where slug='ewallet-suspension-phishing';
    commit;`);
  optIn = true;
} catch (e) {
  console.log("      " + e.message);
}
ok("an explicit opt-in editorial edit is permitted", optIn);

section("Table constraints");
const mustFail = async (name, sql, expect) => {
  try {
    await db.exec(sql);
    ok(name, false, "expected rejection");
  } catch (e) {
    ok(name, expect.test(e.message), e.message.slice(0, 80));
  }
};
const base = (slug, order, extra = "", cols = "", vals = "") =>
  `insert into public.learning_modules (slug,title,verdict,difficulty,format,est_seconds,prompt_text,signals,canonical_reasoning,sequence_order${cols})
   values ('${slug}','X','fake',3,${extra || "'group_chat'"},60,'p','[{"id":"S1"}]'::jsonb,repeat('a',250),${order}${vals})`;
await mustFail("call module without call_script rejected", base("x1", 91, "'interactive_call'"), /call_script_required/);
await mustFail(
  "empty signals[] rejected",
  `insert into public.learning_modules (slug,title,verdict,difficulty,format,est_seconds,prompt_text,signals,canonical_reasoning,sequence_order)
   values ('x2','X','fake',3,'group_chat',60,'p','[]'::jsonb,repeat('a',250),92)`,
  /signals_not_empty/
);
await mustFail("content_warning without text rejected", base("x3", 93, "", ",content_warning", ",true"), /warning_text_required/);
await mustFail("duplicate sequence_order rejected", base("x4", 1), /sequence_order/);

section("Attempts, progress, Personalized Path inputs");
const U = "11111111-1111-1111-1111-111111111111";
await db.exec(`
  insert into auth.users (id) values ('${U}');
  insert into public.profiles (id, full_name) values ('${U}','Test Learner') on conflict (id) do nothing;`);
const bySlug = Object.fromEntries(
  (await db.query(`select id, slug from public.learning_modules`)).rows.map((r) => [r.slug, r.id])
);

for (let i = 0; i < 3; i++) {
  await db.query(
    `insert into public.module_attempts (user_id,module_id,learner_verdict,learner_reasoning,score,signals_hit,over_flagged)
     values ($1,$2,'fake','felt off','reject','{}',true)`,
    [U, bySlug["marketplace-bicycle-genuine"]]
  );
}
await db.query(
  `insert into public.module_attempts (user_id,module_id,learner_verdict,learner_reasoning,score,signals_hit,advanced_reasoner)
   values ($1,$2,'fake','asks for PIN and OTP via a link','accept','{S1,S5}',true)`,
  [U, bySlug["ewallet-suspension-phishing"]]
);
await db.query(
  `insert into public.module_attempts (user_id,module_id,learner_verdict,learner_reasoning,score,signals_hit,dangerous_reasoning)
   values ($1,$2,'fake','I would test with a small amount first','partial','{S2}',true)`,
  [U, bySlug["trading-circle-investment"]]
);

const p = (await db.query(`select * from public.learner_signal_profile where user_id=$1`, [U])).rows[0];
ok("over_flag_count = 3", p.over_flag_count === 3, String(p.over_flag_count));
ok("over_flags_persistently fires at 3", p.over_flags_persistently === true);
ok("advanced_reasoner_count = 1", p.advanced_reasoner_count === 1);
ok("has_dangerous_reasoning", p.has_dangerous_reasoning === true);

await db.query(
  `insert into public.user_module_progress (user_id,module_id,status,completed_at) values ($1,$2,'completed',now())`,
  [U, bySlug["ewallet-suspension-phishing"]]
);
await db.query(
  `insert into public.user_module_progress (user_id,module_id,status,skipped_without_penalty) values ($1,$2,'skipped',true)`,
  [U, bySlug["digital-arrest-family-variant"]]
);
ok(
  "a penalty-free skip still counts toward mentor eligibility",
  (await db.query(`select public.mentor_eligible_count($1) n`, [U])).rows[0].n === 2
);

section("RLS");
const rls = (
  await db.query(
    `select relname, relrowsecurity from pg_class
     where relname in ('learning_modules','module_attempts','user_module_progress')`
  )
).rows;
ok("RLS enabled on all three new tables", rls.length === 3 && rls.every((r) => r.relrowsecurity));
ok(
  "policies exist on the new tables",
  (
    await db.query(
      `select count(*)::int n from pg_policies where schemaname='public' and tablename like '%module%'`
    )
  ).rows[0].n >= 5
);

// ===========================================================================
// PART 2 — the rubric evaluator
// ===========================================================================
//
// This is the part that guarantees grading cannot drift. The model only ever
// extracts signal ids; these assertions cover what happens to them afterwards.

section("Rubric evaluator");

const require_ = createRequire(import.meta.url);
const ts = require_("typescript");

function loadTs(relPath) {
  const src = readFileSync(join(REPO, relPath), "utf8");
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  const module = { exports };
  new Function("exports", "module", "require", js)(exports, module, () => ({}));
  return module.exports;
}

const { gradeAttempt, verdictMatches, extractSignalsHeuristically } = loadTs(
  "src/lib/modules/grade.ts"
);

// Pull the real signals/rubric/distractors out of the seeded DB, so these
// assertions test the shipped content, not a fixture that could drift from it.
async function moduleRow(slug) {
  const r = await db.query(
    `select verdict, signals, rubric, distractors from public.learning_modules where slug=$1`,
    [slug]
  );
  return r.rows[0];
}

const grade = (row, learnerVerdict, signals_hit, distractors_hit = []) =>
  gradeAttempt({
    moduleVerdict: row.verdict,
    learnerVerdict,
    signals: row.signals,
    rubric: row.rubric,
    distractors: row.distractors,
    extraction: { signals_hit, distractors_hit, feedback: "" },
  });

// --- M01: S1 alone is full credit; two weaker signals also accept ----------
const m01 = await moduleRow("ewallet-suspension-phishing");
ok("M01 S1 alone → accept", grade(m01, "fake", ["S1"]).score === "accept");
ok("M01 S2+S3 → accept", grade(m01, "fake", ["S2", "S3"]).score === "accept");
ok("M01 S2 alone → partial", grade(m01, "fake", ["S2"]).score === "partial");
ok("M01 no signals → reject", grade(m01, "fake", []).score === "reject");
ok("M01 S5 sets advanced_reasoner", grade(m01, "fake", ["S1", "S5"]).advanced_reasoner === true);
ok(
  "M01 invented signal id is discarded, not credited",
  grade(m01, "fake", ["S99", "TOTALLY_MADE_UP"]).score === "reject" &&
    grade(m01, "fake", ["S99"]).signals_hit.length === 0
);
ok(
  "M01 distractor-only reasoning → reject",
  grade(m01, "fake", [], [0]).score === "reject"
);
ok(
  "M01 feedback names at most one missed signal",
  grade(m01, "fake", ["S2"]).missed_signal !== null
);

// --- M02: the over-flagging control ---------------------------------------
const m02 = await moduleRow("marketplace-bicycle-genuine");
ok("M02 correct verdict + 2 green flags → accept", grade(m02, "real", ["G1", "G2"]).score === "accept");
ok("M02 correct verdict + 1 green flag → partial", grade(m02, "real", ["G1"]).score === "partial");
const overflag = grade(m02, "fake", ["G1", "G2"]);
ok("M02 calling it fake → reject", overflag.score === "reject");
ok("M02 calling it fake sets over_flagged", overflag.over_flagged === true);
ok(
  "M02 over_flagged does not fire on a correct verdict",
  grade(m02, "real", ["G1", "G2"]).over_flagged === false
);

// --- M07: the accuracy-framed verdict -------------------------------------
const m07 = await moduleRow("misleading-crime-statistic");
ok("M07 'misleading' counts as the correct verdict", verdictMatches("fake", "misleading") === true);
ok("M07 'accurate' counts as the wrong verdict", verdictMatches("fake", "accurate") === false);
ok("M07 misleading + S1 → accept", grade(m07, "misleading", ["S1"]).score === "accept");
ok("M07 judging it accurate → reject", grade(m07, "accurate", ["S1"]).score === "reject");
ok("M07 S4 alone → partial", grade(m07, "misleading", ["S4"]).score === "partial");
ok(
  "M07 'the numbers are made up' distractor → reject",
  grade(m07, "misleading", [], [0]).score === "reject"
);

// --- M10: dangerous_reasoning ---------------------------------------------
const m10 = await moduleRow("trading-circle-investment");
const smallAmountIdx = m10.distractors.findIndex((d) =>
  d.claim.toLowerCase().includes("small amount")
);
ok("M10 has the 'test with a small amount' distractor", smallAmountIdx >= 0);
const dangerous = grade(m10, "fake", ["S2"], [smallAmountIdx]);
ok("M10 that distractor sets dangerous_reasoning", dangerous.dangerous_reasoning === true);
ok("M10 S1 alone → accept", grade(m10, "fake", ["S1"]).score === "accept");
ok("M10 S4 alone → accept", grade(m10, "fake", ["S4"]).score === "accept");
ok("M10 S5 sets advanced_reasoner", grade(m10, "fake", ["S5"]).advanced_reasoner === true);
ok(
  "M10 dangerous_reasoning is visible even on a non-reject",
  dangerous.score === "partial" && dangerous.dangerous_reasoning === true
);

// --- Determinism -----------------------------------------------------------
const runs = new Set();
for (let i = 0; i < 50; i++) runs.add(JSON.stringify(grade(m01, "fake", ["S2", "S4"])));
ok("the same input always produces the same grade (50 runs)", runs.size === 1);

// --- Heuristic fallback ----------------------------------------------------
const heur = extractSignalsHeuristically(
  "They are asking for my PIN and a one-time code through a link, which no legitimate provider does.",
  m01.signals,
  m01.distractors
);
ok("heuristic fallback finds S1 in an obvious answer", heur.signals_hit.includes("S1"), JSON.stringify(heur.signals_hit));
const heurEmpty = extractSignalsHeuristically("idk seems bad", m01.signals, m01.distractors);
ok("heuristic fallback credits nothing for a vague answer", heurEmpty.signals_hit.length === 0);

// ===========================================================================

console.log("\n" + "─".repeat(58));
console.log(`${pass} passed, ${fail} failed`);
console.log("─".repeat(58) + "\n");
process.exit(fail === 0 ? 0 : 1);
