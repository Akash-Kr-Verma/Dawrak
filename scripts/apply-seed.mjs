// scripts/apply-seed.mjs
//
// Applies supabase/seed_modules.sql to the connected Supabase project.
//
//   npm run seed:apply
//
// WHY THIS EXISTS
//
// The module content lives in Postgres. `src/content/modules/*.ts` is its
// source, and `npm run seed:modules` regenerates the .sql — but neither of
// those touches the running app. Until this script (or the SQL Editor) runs,
// the deployed app keeps serving whatever was seeded last.
//
// WHAT IT NEEDS
//
// A privileged Postgres connection string. The anon key in .env.local cannot do
// this and is not supposed to be able to: `learning_modules` has exactly one
// RLS policy, "Published modules are readable by anyone", for SELECT. There is
// no INSERT or UPDATE policy for anon or authenticated, and no security-definer
// function that writes content. That is the correct design — it means a stolen
// browser key cannot rewrite the curriculum — and it is also why applying the
// seed is a deliberate, credentialed act.
//
// Set SUPABASE_DB_URL, either in the environment or as a line in .env.local:
//
//   SUPABASE_DB_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
//
// Use the **Session Pooler** URI from Supabase → Project Settings → Database.
// The direct `db.<ref>.supabase.co` host is IPv6-only and will not resolve from
// most machines, including this one.
//
// The seed carries its own begin/commit and is idempotent — `on conflict (slug)
// do update` — so re-running it is safe and is the normal way to ship a content
// edit.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** .env.local values in this project are double-quoted; strip them. */
function readEnvFile() {
  const out = {};
  try {
    for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env.local — the environment may still carry the URL */
  }
  return out;
}

const fileEnv = readEnvFile();
const dbUrl = process.env.SUPABASE_DB_URL || fileEnv.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error(`
❌ SUPABASE_DB_URL is not set, so there is nothing to connect to.

   This is the one step that cannot be done with the keys in .env.local. The
   anon key can read published modules and nothing else — writing content needs
   a database connection.

   Get it from: Supabase dashboard → your project → Project Settings →
   Database → Connection string → **Session pooler** (URI). Substitute your
   database password for [YOUR-PASSWORD].

   Then either add this line to .env.local:

     SUPABASE_DB_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"

   ...or pass it for one run:

     SUPABASE_DB_URL="..." npm run seed:apply

   Alternative with no connection string at all: open supabase/seed_modules.sql,
   paste the whole file into the Supabase SQL Editor, and run it. Then verify
   with: npm run seed:check
`);
  process.exit(2);
}

const sql = readFileSync(join(ROOT, "supabase", "seed_modules.sql"), "utf8");

// Supabase requires TLS. `rejectUnauthorized: false` matches what the Supabase
// CLI and the dashboard's own connection strings do — the pooler presents a
// certificate for a shared host, and pinning it is not something this script
// can do portably.
const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  // The seed is ~140KB of jsonb; give it room on a slow first connection.
  statement_timeout: 120_000,
  connectionTimeoutMillis: 30_000,
});

const started = Date.now();
try {
  await client.connect();
  const { rows: whoami } = await client.query(
    "select current_database() as db, current_user as usr, version() as ver"
  );
  console.log(`Connected to ${whoami[0].db} as ${whoami[0].usr}`);

  const { rows: before } = await client.query(
    "select count(*)::int as n from public.learning_modules"
  );
  console.log(`Modules before: ${before[0].n}`);

  // The file carries its own begin/commit, so it is all-or-nothing on its own.
  await client.query(sql);

  const { rows: after } = await client.query(
    `select count(*)::int as n,
            count(*) filter (
              where rubric -> 'feedback' ->> 'strongest' is not null
            )::int as with_frame
       from public.learning_modules`
  );
  console.log(`Modules after:  ${after[0].n} (${after[0].with_frame} carrying a feedback frame)`);
  console.log(`\n✅ Seed applied in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
  console.log("   Verify what the app will actually see:  npm run seed:check");
} catch (err) {
  console.error("\n❌ Seed failed. Nothing was committed — the file is one transaction.\n");
  console.error(`   ${err.message}`);
  if (/password authentication failed/i.test(err.message)) {
    console.error(
      "\n   The password in SUPABASE_DB_URL is wrong. Reset it under\n" +
        "   Project Settings → Database → Database password, then rebuild the URI."
    );
  } else if (/ENOTFOUND|EAI_AGAIN/i.test(err.message)) {
    console.error(
      "\n   Host did not resolve. If you used db.<ref>.supabase.co, that host is\n" +
        "   IPv6-only — use the Session pooler URI instead."
    );
  } else if (/ETIMEDOUT|ECONNREFUSED/i.test(err.message)) {
    console.error(
      "\n   Could not reach the database. Check the port (6543 for the session\n" +
        "   pooler) and that outbound connections are not blocked."
    );
  }
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
