// supabase/tests/challenge.test.mjs
//
// Runs the full migration chain plus 0004 against PGlite and asserts the Daily
// Challenge can actually record something. No Docker, no Supabase CLI, no
// network, no credentials.
//
//   npm run test:challenge
//
// The regression this suite exists for: attempts never persisted, because the
// client sent a hardcoded non-uuid user id and AI scenarios were never written
// to `scenarios`. Both failures were swallowed. The first two sections here
// reproduce each one and then prove the fixed path works.

import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..", "..");
const read = (p) => readFileSync(join(REPO, p), "utf8");
const stripExt = (s) => s.replace(/create extension[^;]*;/gi, "");

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

const LEARNER = "11111111-1111-1111-1111-111111111111";
const NEWBIE = "22222222-2222-2222-2222-222222222222";

const db = new PGlite();

const actAs = async (uid) => {
  await db.exec(`set request.jwt.claim.sub = '${uid}';`);
  await db.exec(`set request.jwt.claim.role = 'authenticated';`);
};

section("Setup");
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
await db.exec(stripExt(read("supabase/schema.sql")));
await db.exec(read("supabase/seed.sql"));
await db.exec(read("supabase/migrations/0001_legacy_progress_rename.sql"));
await db.exec(read("supabase/migrations/0002_learning_modules.sql"));
await db.exec(read("supabase/seed_modules.sql"));
await db.exec(read("supabase/migrations/0003_mentoring.sql"));
ok("schema + seed + 0001..0003 applied", true);

await db.exec(`
  insert into auth.users (id) values ('${LEARNER}'), ('${NEWBIE}');
  insert into public.profiles (id, full_name) values ('${LEARNER}', 'Maria')
    on conflict (id) do update set full_name = 'Maria';
  insert into public.profiles (id, full_name) values ('${NEWBIE}', 'Sam')
    on conflict (id) do update set full_name = 'Sam';
`);

section("Migration 0004_challenge.sql");
try {
  await db.exec(read("supabase/migrations/0004_challenge.sql"));
  ok("0004 applies cleanly", true);
} catch (e) {
  ok("0004 applies cleanly", false, e.message);
  process.exit(1);
}
try {
  await db.exec(read("supabase/migrations/0004_challenge.sql"));
  ok("0004 is re-runnable (idempotent)", true);
} catch (e) {
  ok("0004 is re-runnable (idempotent)", false, e.message);
}

const seeded = await db.query(`select count(*)::int n from public.scenarios`);
ok("seed scenarios survived the migration", seeded.rows[0].n === 4, `got ${seeded.rows[0].n}`);
const origins = await db.query(
  `select distinct origin from public.scenarios order by origin`);
ok("existing rows default to origin 'seed'",
   origins.rows.length === 1 && origins.rows[0].origin === "seed",
   JSON.stringify(origins.rows));

section("The two bugs that stopped anything persisting");
const anyScenario = (
  await db.query(`select id from public.scenarios limit 1`)
).rows[0].id;

let bug1 = null;
try {
  await db.exec(`
    insert into public.attempts (user_id, scenario_id, user_reasoning, ai_score)
    values ('demo-user-123', '${anyScenario}', 'some reasoning here', 70);
  `);
} catch (e) { bug1 = e.message; }
ok("REGRESSION: hardcoded 'demo-user-123' is not a uuid and is rejected",
   bug1 !== null && /invalid input syntax for type uuid/i.test(bug1), bug1 ?? "no error");

let bug2 = null;
try {
  await db.exec(`
    insert into public.attempts (user_id, scenario_id, user_reasoning, ai_score)
    values ('${LEARNER}', gen_random_uuid(), 'some reasoning here', 70);
  `);
} catch (e) { bug2 = e.message; }
ok("REGRESSION: an unsaved AI scenario id violates the foreign key",
   bug2 !== null && /foreign key/i.test(bug2), bug2 ?? "no error");

section("The fixed path");
await actAs(LEARNER);
await db.exec(`
  insert into public.attempts
    (user_id, scenario_id, user_reasoning, ai_score, assessment, source_url,
     no_source_found, ai_feedback, source_audit, verdict_title, key_lesson, graded_by)
  values
    ('${LEARNER}', '${anyScenario}', 'No official domain, and it rushes you.', 82,
     'fake', 'https://pib.gov.in', false, 'Good catch on the urgency.',
     'VERIFIED CREDIBLE', 'Strong Analysis', 'Check the primary source.', 'ai');
`);
const stored = await db.query(
  `select * from public.attempts where user_id = '${LEARNER}'`);
ok("an attempt now persists", stored.rows.length === 1);
ok("the real/fake call is kept", stored.rows[0].assessment === "fake");
ok("the cited source is kept", stored.rows[0].source_url === "https://pib.gov.in");
ok("the coach's feedback is kept", (stored.rows[0].ai_feedback ?? "").length > 0);

let badAssessment = null;
try {
  await db.exec(`
    insert into public.attempts (user_id, scenario_id, user_reasoning, assessment)
    values ('${LEARNER}', '${anyScenario}', 'x', 'probably');
  `);
} catch (e) { badAssessment = e.message; }
ok("an unknown assessment value is rejected", badAssessment !== null);

section("An AI scenario, persisted so it can be referenced");
const aiId = (
  await db.query(`
    insert into public.scenarios
      (title, body_context, category, verdict, origin, source_channel,
       original_publisher, media_type, viral_reach)
    values ('AI generated claim', 'Body of the claim.', 'phishing', 'fake',
            'ai_generated', 'WhatsApp Forward', 'Broadcast', 'text', 'Forwarded a lot')
    returning id
  `)
).rows[0].id;
await db.exec(`
  insert into public.attempts (user_id, scenario_id, user_reasoning, ai_score, assessment)
  values ('${LEARNER}', '${aiId}', 'It asks for bank details.', 90, 'fake');
`);
ok("an attempt against a persisted AI scenario works", true);

const feedHasAi = await db.query(
  `select 1 from public.challenge_feed where id = '${aiId}'`);
ok("AI scenarios are visible in the feed", feedHasAi.rows.length === 1);
const nextIds = await db.query(
  `select public.next_challenge_for('${LEARNER}') as id`);
ok("but are never handed back out as a new challenge",
   nextIds.rows[0].id !== aiId, String(nextIds.rows[0].id));

section("challenge_feed withholds the verdict");
const feedCols = await db.query(`
  select column_name from information_schema.columns
  where table_schema='public' and table_name='challenge_feed'
`);
const names = feedCols.rows.map((r) => r.column_name);
ok("feed does NOT expose verdict", !names.includes("verdict"), names.join(", "));
ok("feed still carries what the card renders",
   ["title", "body_context", "source_channel", "media_type"].every((c) => names.includes(c)));
// Hiding is done by report count or by a moderator setting the flag; the
// schema.sql trigger clears is_hidden on insert, so set it afterwards.
const hidden = await db.query(`
  insert into public.scenarios (title, body_context, category, verdict)
  values ('Hidden one', 'body', 'phishing', 'fake') returning id
`);
await db.exec(
  `update public.scenarios set is_hidden = true where id = '${hidden.rows[0].id}'`);
const hiddenInFeed = await db.query(
  `select 1 from public.challenge_feed where id = '${hidden.rows[0].id}'`);
ok("hidden scenarios stay out of the feed", hiddenInFeed.rows.length === 0);

section("Moderation: hiding sticks");
// Pre-existing defect in schema.sql, corrected by 0004: the report trigger's
// `else` branch un-hid anything whenever reports_count was touched.
await db.exec(
  `update public.scenarios set reports_count = 1 where id = '${hidden.rows[0].id}'`);
const stillHidden = await db.query(
  `select is_hidden from public.scenarios where id = '${hidden.rows[0].id}'`);
ok("a filed report does not un-hide a moderated scenario",
   stillHidden.rows[0].is_hidden === true);
const stillOut = await db.query(
  `select 1 from public.challenge_feed where id = '${hidden.rows[0].id}'`);
ok("and it stays out of the feed", stillOut.rows.length === 0);

const autoHide = await db.query(`
  insert into public.scenarios (title, body_context, category, verdict)
  values ('Reported one', 'body', 'phishing', 'fake') returning id
`);
await db.exec(
  `update public.scenarios set reports_count = 3 where id = '${autoHide.rows[0].id}'`);
const auto = await db.query(
  `select is_hidden from public.scenarios where id = '${autoHide.rows[0].id}'`);
ok("auto-hide at 3 reports still works", auto.rows[0].is_hidden === true);

section("Questions Bank");
await actAs(NEWBIE);
let refused = null;
try {
  await db.query(`select public.submit_bank_scenario($1, $2, $3)`,
    ["A believable title", "A long enough description of what they would see.", "fake"]);
} catch (e) { refused = e.message; }
ok("a learner with no completed module cannot submit", refused !== null);

await actAs(LEARNER);
const m01 = (await db.query(
  `select id from public.learning_modules where slug='ewallet-suspension-phishing'`)).rows[0].id;
await db.exec(`
  insert into public.user_module_progress (user_id, module_id, status, completed_at)
  values ('${LEARNER}', '${m01}', 'completed', now())
  on conflict (user_id, module_id) do update set status='completed';
`);
const bankId = (
  await db.query(`select public.submit_bank_scenario($1, $2, $3, $4) as id`, [
    "Bank texts about a frozen account",
    "A message claiming your account is frozen and you must tap a link to unlock it.",
    "fake",
    "phishing",
  ])
).rows[0].id;
ok("completing one module unlocks submitting", typeof bankId === "string");

const bankRow = await db.query(
  `select origin, is_community_submitted, submitted_by_profile_id, verdict
   from public.scenarios where id = '${bankId}'`);
ok("it is tagged as a bank submission", bankRow.rows[0].origin === "questions_bank");
ok("it is attributed to the submitter",
   bankRow.rows[0].submitted_by_profile_id === LEARNER);
ok("the learner's own tag is stored as the verdict", bankRow.rows[0].verdict === "fake");

for (const [label, args] of [
  ["a short title", ["tiny", "A long enough description of what they would see.", "fake"]],
  ["a thin description", ["A believable title", "too short", "fake"]],
  ["an invalid verdict", ["A believable title", "A long enough description here.", "maybe"]],
]) {
  let r = null;
  try { await db.query(`select public.submit_bank_scenario($1,$2,$3)`, args); }
  catch (e) { r = e.message; }
  ok(`${label} is refused`, r !== null);
}

const feedName = await db.query(
  `select submitted_by_name from public.challenge_feed where id = '${bankId}'`);
ok("the feed shows who submitted it", feedName.rows[0].submitted_by_name === "Maria");

const preferred = await db.query(
  `select public.next_challenge_for('${NEWBIE}') as id`);
ok("bank submissions are served ahead of seed material",
   preferred.rows[0].id === bankId, String(preferred.rows[0].id));

section("scenario_stats");
await db.exec(`
  insert into public.attempts (user_id, scenario_id, user_reasoning, assessment)
  values ('${NEWBIE}', '${bankId}', 'Looks like a scam to me.', 'fake');
`);
let stats = await db.query(
  `select * from public.scenario_stats where scenario_id = '${bankId}'`);
ok("counts one attempt", stats.rows[0].attempts_total === 1);
ok("counts the correct call as spotted", stats.rows[0].spotted_count === 1);
ok("reports 100%", stats.rows[0].spotted_pct === 100);

await db.exec(`
  insert into public.attempts (user_id, scenario_id, user_reasoning, assessment)
  values ('${LEARNER}', '${bankId}', 'Seems legit.', 'real');
`);
stats = await db.query(
  `select * from public.scenario_stats where scenario_id = '${bankId}'`);
ok("a wrong call drops it to 50%", stats.rows[0].spotted_pct === 50,
   JSON.stringify(stats.rows[0]));

// "Needs more evidence" is deliberately not a miss — but it is still an attempt.
await db.exec(`
  insert into public.attempts (user_id, scenario_id, user_reasoning, assessment)
  values ('${NEWBIE}', '${bankId}', 'I want to check first.', 'evidence');
`);
stats = await db.query(
  `select * from public.scenario_stats where scenario_id = '${bankId}'`);
ok("'needs more evidence' counts as an attempt, not a hit",
   stats.rows[0].attempts_total === 3 && stats.rows[0].spotted_count === 1,
   JSON.stringify(stats.rows[0]));

const untouched = await db.query(
  `select * from public.scenario_stats where attempts_total = 0 limit 1`);
ok("an unattempted scenario reports null rather than 0%",
   untouched.rows[0].spotted_pct === null);

section("Streak");
const fresh = await db.query(`select public.user_challenge_streak($1) as n`, [
  "33333333-3333-3333-3333-333333333333",
]);
ok("someone with no attempts has a streak of 0", fresh.rows[0].n === 0);

const S = "44444444-4444-4444-4444-444444444444";
await db.exec(`
  insert into auth.users (id) values ('${S}');
  insert into public.profiles (id, full_name) values ('${S}', 'Streak')
    on conflict (id) do nothing;
`);
// Three consecutive days ending today.
for (const off of [0, 1, 2]) {
  await db.exec(`
    insert into public.attempts (user_id, scenario_id, user_reasoning, created_at)
    values ('${S}', '${anyScenario}', 'day ${off}', now() - interval '${off} days');
  `);
}
let streak = await db.query(`select public.user_challenge_streak($1) as n`, [S]);
ok("three consecutive days reads as 3", streak.rows[0].n === 3, `got ${streak.rows[0].n}`);

// A gap, then an old cluster: the current streak must not absorb it.
await db.exec(`
  insert into public.attempts (user_id, scenario_id, user_reasoning, created_at)
  values ('${S}', '${anyScenario}', 'old', now() - interval '10 days');
`);
streak = await db.query(`select public.user_challenge_streak($1) as n`, [S]);
ok("a gap does not extend the current streak", streak.rows[0].n === 3, `got ${streak.rows[0].n}`);

const COLD = "55555555-5555-5555-5555-555555555555";
await db.exec(`
  insert into auth.users (id) values ('${COLD}');
  insert into public.profiles (id, full_name) values ('${COLD}', 'Cold')
    on conflict (id) do nothing;
  insert into public.attempts (user_id, scenario_id, user_reasoning, created_at)
  values ('${COLD}', '${anyScenario}', 'ages ago', now() - interval '5 days');
`);
const cold = await db.query(`select public.user_challenge_streak($1) as n`, [COLD]);
ok("a lapsed streak reads as 0", cold.rows[0].n === 0, `got ${cold.rows[0].n}`);

section("Nothing upstream was disturbed");
const mods = await db.query(
  `select count(*)::int n from public.learning_modules where is_published`);
ok("still exactly 10 published modules", mods.rows[0].n === 10);
const seq = await db.query(`select * from public.validate_module_sequence()`);
ok("module sequence still valid", seq.rows.length === 0);
const mentorFns = await db.query(`
  select count(*)::int n from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname='public'
    and p.proname in ('create_share_link','get_share_link','submit_share_response','get_share_response')
`);
ok("mentoring functions still present", mentorFns.rows[0].n === 4);

console.log(`\n${"─".repeat(58)}\n${pass} passed, ${fail} failed\n${"─".repeat(58)}`);
process.exit(fail ? 1 : 0);
