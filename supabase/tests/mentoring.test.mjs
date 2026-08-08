// supabase/tests/mentoring.test.mjs
//
// Runs schema + 0001 + 0002 + seed + 0003 against PGlite — real Postgres
// compiled to WASM — and asserts the mentoring layer holds. No Docker, no
// Supabase CLI, no network, no credentials.
//
//   npm run test:mentoring
//
// The two things most worth proving here are that adopting the hand-made
// `mentoring_sessions` table does not lose rows, and that the public share
// functions never hand the answer to the person being asked the question.

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

const MENTOR = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

/** Shim Supabase's auth schema, then act as a given user. */
async function actAs(db, uid) {
  await db.exec(`set request.jwt.claim.sub = '${uid}';`);
}

const db = new PGlite();

section("Supabase shims");
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

section("Baseline + module system");
await db.exec(stripExt(read("supabase/schema.sql")));
ok("schema.sql applies cleanly", true);

// Stand up the legacy table this project actually had, so 0001 has real work to
// do and the backfill function has something to find.
await db.exec(`
  create table public.user_module_progress (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null references public.profiles(id) on delete cascade,
    module_id         text not null,
    completed_lessons integer not null default 0,
    updated_at        timestamptz not null default now(),
    unique (user_id, module_id)
  );
  create index idx_user_module_progress_user on public.user_module_progress (user_id);
`);

// And the hand-made mentoring_sessions, with a row that must survive adoption.
await db.exec(`
  create table public.mentoring_sessions (
    id             uuid primary key default gen_random_uuid(),
    mentor_id      uuid not null,
    learner_name   text not null,
    relationship   text,
    topic_taught   text,
    proof_file_url text,
    notes          text,
    created_at     timestamptz not null default now()
  );
`);

await db.exec(`
  insert into auth.users (id) values ('${MENTOR}'), ('${OTHER}');
  insert into public.profiles (id, full_name) values ('${MENTOR}', 'Maria')
    on conflict (id) do update set full_name = 'Maria';
  insert into public.profiles (id, full_name) values ('${OTHER}', 'Sam')
    on conflict (id) do update set full_name = 'Sam';
  insert into public.user_module_progress (user_id, module_id, completed_lessons)
    values ('${MENTOR}', 'ewallet-suspension-phishing', 7);
  insert into public.mentoring_sessions (mentor_id, learner_name, relationship, topic_taught, notes)
    values ('${MENTOR}', 'Mom (Sunita)', 'Mother', 'WhatsApp phishing', 'Sat together');
`);
ok("legacy tables + fixture rows created", true);

await db.exec(read("supabase/migrations/0001_legacy_progress_rename.sql"));
await db.exec(read("supabase/migrations/0002_learning_modules.sql"));
await db.exec(read("supabase/seed_modules.sql"));
ok("0001 + 0002 + seed applied", true);

section("Migration 0003_mentoring.sql");
try {
  await db.exec(read("supabase/migrations/0003_mentoring.sql"));
  ok("0003 applies cleanly", true);
} catch (e) {
  ok("0003 applies cleanly", false, e.message);
  process.exit(1);
}
try {
  await db.exec(read("supabase/migrations/0003_mentoring.sql"));
  ok("0003 is re-runnable (idempotent)", true);
} catch (e) {
  ok("0003 is re-runnable (idempotent)", false, e.message);
}

section("Adopting the hand-made mentoring_sessions");
const kept = await db.query(`select learner_name, notes from public.mentoring_sessions`);
ok("pre-existing session row survived", kept.rows.length === 1 && kept.rows[0].learner_name === "Mom (Sunita)",
   JSON.stringify(kept.rows));
ok("its notes are intact", kept.rows[0]?.notes === "Sat together");

const colType = async (table, col) => {
  const r = await db.query(
    `select data_type from information_schema.columns
     where table_schema='public' and table_name=$1 and column_name=$2`, [table, col]);
  return r.rows[0]?.data_type ?? null;
};
ok("module_id column added", (await colType("mentoring_sessions", "module_id")) === "uuid");

const msFk = await db.query(`
  select constraint_name from information_schema.table_constraints
  where table_schema='public' and table_name='mentoring_sessions' and constraint_type='FOREIGN KEY'
`);
ok("module_id foreign key attached",
   msFk.rows.some((r) => r.constraint_name === "mentoring_sessions_module_id_fkey"),
   JSON.stringify(msFk.rows));

section("Sharing requires completing the module");
const modId = async (slug) =>
  (await db.query(`select id from public.learning_modules where slug=$1`, [slug])).rows[0].id;
const m01 = await modId("ewallet-suspension-phishing");
const m02 = await modId("marketplace-bicycle-genuine");

await actAs(db, MENTOR);

let refused = null;
try {
  await db.query(`select public.create_share_link($1)`, [m01]);
} catch (e) { refused = e.message; }
ok("cannot share a module with no progress row", refused !== null, "expected a refusal");

await db.exec(`
  insert into public.user_module_progress (user_id, module_id, status)
  values ('${MENTOR}', '${m01}', 'in_progress')
  on conflict (user_id, module_id) do update set status = 'in_progress';
`);
refused = null;
try {
  await db.query(`select public.create_share_link($1)`, [m01]);
} catch (e) { refused = e.message; }
ok("cannot share a module that is only in_progress", refused !== null, "expected a refusal");

// A penalty-free skip counts toward mentor eligibility but must not let you
// teach the module you skipped.
await db.exec(`
  insert into public.user_module_progress (user_id, module_id, status, skipped_without_penalty)
  values ('${MENTOR}', '${m02}', 'skipped', true)
  on conflict (user_id, module_id) do update set status='skipped', skipped_without_penalty=true;
`);
refused = null;
try {
  await db.query(`select public.create_share_link($1)`, [m02]);
} catch (e) { refused = e.message; }
ok("a penalty-free skip does not unlock sharing", refused !== null, "expected a refusal");

await db.exec(`
  update public.user_module_progress set status='completed', completed_at=now()
  where user_id='${MENTOR}' and module_id='${m01}';
`);
const tokenRes = await db.query(`select public.create_share_link($1) as token`, [m01]);
const token = tokenRes.rows[0].token;
ok("completing the module mints a link", typeof token === "string" && token.length === 12, String(token));

const again = await db.query(`select public.create_share_link($1) as token`, [m01]);
ok("clicking Share twice reuses the same link", again.rows[0].token === token);

section("What the recipient can see");
const view = await db.query(`select * from public.get_share_link($1)`, [token]);
ok("link resolves for an anonymous recipient", view.rows.length === 1);
ok("carries the module's prompt", (view.rows[0]?.prompt_text ?? "").length > 20);
ok("carries the mentor's name", view.rows[0]?.mentor_name === "Maria");

const exposed = Object.keys(view.rows[0] ?? {});
for (const leak of ["verdict", "signals", "rubric", "canonical_reasoning", "reveal", "distractors"]) {
  ok(`does NOT expose ${leak}`, !exposed.includes(leak), `exposed: ${exposed.join(", ")}`);
}

section("Answer, then the mentor's reply");
const receiptRes = await db.query(
  `select public.submit_share_response($1, $2, $3, $4, $5) as receipt`,
  [token, "fake", "It asks for the OTP and rushes you.", ["urgency", "info"], "someone@example.com"]
);
const receipt = receiptRes.rows[0].receipt;
ok("recipient can submit without an account", typeof receipt === "string" && receipt.length === 36);

let rejected = null;
try {
  await db.query(`select public.submit_share_response($1, $2, $3)`, ["not-a-real-token", "fake", "x"]);
} catch (e) { rejected = e.message; }
ok("a bogus token is refused", rejected !== null);

rejected = null;
try {
  await db.query(`select public.submit_share_response($1, $2, $3)`, [token, "maybe", "x"]);
} catch (e) { rejected = e.message; }
ok("an invalid verdict is refused", rejected !== null);

rejected = null;
try {
  await db.query(`select public.submit_share_response($1, $2, $3)`, [token, "fake", "x".repeat(2100)]);
} catch (e) { rejected = e.message; }
ok("an oversized answer is refused", rejected !== null);

let polled = await db.query(`select * from public.get_share_response($1)`, [receipt]);
ok("recipient can poll their own answer back", polled.rows[0]?.learner_verdict === "fake");
ok("no reply yet", polled.rows[0]?.mentor_reply === null);
ok("chips round-tripped", (polled.rows[0]?.reason_chips ?? []).join(",") === "urgency,info");

const pending = await db.query(`
  select r.id from public.mentor_share_responses r
  join public.mentor_share_links l on l.id = r.share_link_id
  where l.mentor_id = '${MENTOR}' and r.mentor_reply is null
`);
ok("it lands in the mentor's pending reviews", pending.rows.length === 1);

await db.exec(`
  update public.mentor_share_responses
  set mentor_reply = 'Exactly right — no provider asks for an OTP over a link.',
      replied_at = now()
  where id = '${pending.rows[0].id}';
`);
polled = await db.query(`select * from public.get_share_response($1)`, [receipt]);
ok("recipient sees the personal reply", (polled.rows[0]?.mentor_reply ?? "").startsWith("Exactly right"));

let halfReply = null;
try {
  await db.exec(`
    update public.mentor_share_responses set mentor_reply = 'oops', replied_at = null
    where id = '${pending.rows[0].id}';
  `);
} catch (e) { halfReply = e.message; }
ok("a reply without a timestamp is rejected", halfReply !== null);

section("Revoking");
await db.exec(`update public.mentor_share_links set revoked_at = now() where token = '${token}';`);
const dead = await db.query(`select * from public.get_share_link($1)`, [token]);
ok("a revoked link stops resolving", dead.rows.length === 0);
const kept2 = await db.query(`select count(*)::int n from public.mentor_share_responses`);
ok("revoking keeps the answers already received", kept2.rows[0].n === 1);
await db.exec(`update public.mentor_share_links set revoked_at = null where token = '${token}';`);

section("mentorable_modules");
const mine = await db.query(`select * from public.mentorable_modules where user_id = '${MENTOR}'`);
ok("lists exactly the completed module", mine.rows.length === 1 && mine.rows[0].slug === "ewallet-suspension-phishing",
   JSON.stringify(mine.rows.map((r) => r.slug)));
ok("surfaces the active share token", mine.rows[0]?.active_share_token === token);
const theirs = await db.query(`select * from public.mentorable_modules where user_id = '${OTHER}'`);
ok("a learner with no completions has none", theirs.rows.length === 0);

section("RLS");
const rls = await db.query(`
  select relname, relrowsecurity from pg_class
  where relnamespace = 'public'::regnamespace
    and relname in ('mentoring_sessions','mentor_share_links','mentor_share_responses')
  order by relname
`);
ok("RLS enabled on all three mentoring tables",
   rls.rows.length === 3 && rls.rows.every((r) => r.relrowsecurity),
   JSON.stringify(rls.rows));

const pol = await db.query(`
  select tablename, count(*)::int n from pg_policies
  where schemaname='public'
    and tablename in ('mentoring_sessions','mentor_share_links','mentor_share_responses')
  group by tablename order by tablename
`);
ok("policies exist on all three", pol.rows.length === 3 && pol.rows.every((r) => r.n > 0),
   JSON.stringify(pol.rows));

const insertPol = await db.query(`
  select count(*)::int n from pg_policies
  where schemaname='public' and tablename='mentor_share_responses' and cmd='INSERT'
`);
ok("no direct insert policy on responses (anon goes through the function)",
   insertPol.rows[0].n === 0);

const definers = await db.query(`
  select p.proname, p.proconfig
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname='public' and p.prosecdef
    and p.proname in ('get_share_link','submit_share_response','get_share_response')
`);
ok("all three public functions are security definer", definers.rows.length === 3);
ok("all three pin search_path",
   definers.rows.every((r) => (r.proconfig ?? []).some((c) => c.startsWith("search_path="))),
   JSON.stringify(definers.rows.map((r) => [r.proname, r.proconfig])));

section("Legacy backfill (opt-in)");
const before = await db.query(
  `select count(*)::int n from public.user_module_progress where user_id='${OTHER}'`);
await db.exec(`
  insert into public.user_module_progress_legacy (user_id, module_id, completed_lessons)
  values ('${OTHER}', 'marketplace-bicycle-genuine', 6);
`);
const bf = await db.query(`select * from public.backfill_legacy_module_progress()`);
ok("backfill reports what it did", bf.rows.length >= 1, JSON.stringify(bf.rows));
const after = await db.query(
  `select status from public.user_module_progress where user_id='${OTHER}'`);
ok("legacy completion becomes a real progress row",
   after.rows.length === before.rows[0].n + 1 && after.rows[0].status === "completed",
   JSON.stringify(after.rows));
const bf2 = await db.query(`select * from public.backfill_legacy_module_progress()`);
ok("running it twice changes nothing",
   bf2.rows.every((r) => r.action !== "backfilled as completed"), JSON.stringify(bf2.rows));

console.log(`\n${"─".repeat(58)}\n${pass} passed, ${fail} failed\n${"─".repeat(58)}`);
process.exit(fail ? 1 : 0);
