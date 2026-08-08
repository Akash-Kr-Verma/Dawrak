// scripts/generate-module-seed.mjs
//
// Regenerates supabase/seed_modules.sql from the typed content in
// src/content/modules/. Run with: npm run seed:modules
//
// Why a generator rather than hand-written SQL: the module content is ~3,000
// lines of editorial prose and nested JSON. Authoring it in TypeScript gets it
// type-checked and gives reviewers a per-module diff; the generated .sql is the
// artifact that actually runs, and it is checked in so nobody needs Node to
// deploy it. Paste it into the Supabase SQL editor, or pipe it through psql.
//
// The seed is idempotent: `on conflict (slug) do update`. Re-running it after a
// content edit updates the rows in place. canonical_reasoning is protected by a
// DB trigger, so the seed opts in explicitly (see the SET at the top of the
// generated file) — that opt-in is the point, it makes an AI-driven rewrite of
// the reasoning impossible to do by accident.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CONTENT_DIR = join(ROOT, "src", "content", "modules");
const OUT = join(ROOT, "supabase", "seed_modules.sql");

// ---------------------------------------------------------------------------
// Load the authored modules.
//
// The content files are TypeScript with `@/` path aliases and no runtime
// dependencies beyond type imports. Rather than pull in a TS toolchain just to
// read data, transpile-on-require via a minimal strip: the files are plain
// object literals once the `import type` lines are removed.
// ---------------------------------------------------------------------------

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("typescript");
} catch {
  console.error(
    "This script needs the `typescript` package (already a devDependency).\n" +
      "Run `npm install` first."
  );
  process.exit(1);
}

function loadModuleFile(file) {
  const source = readFileSync(join(CONTENT_DIR, file), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const exports = {};
  const module = { exports };
  // The content files import only types, which the transpile elides. Any real
  // require would be a bug, so make it loud rather than silently undefined.
  const fakeRequire = (id) => {
    throw new Error(`Unexpected runtime import "${id}" in ${file}`);
  };
  new Function("exports", "module", "require", js)(exports, module, fakeRequire);

  const values = Object.values(module.exports).filter(
    (v) => v && typeof v === "object" && "slug" in v
  );
  if (values.length !== 1) {
    throw new Error(`${file} should export exactly one module, found ${values.length}`);
  }
  return values[0];
}

const files = readdirSync(CONTENT_DIR)
  .filter((f) => /^m\d\d-.*\.ts$/.test(f))
  .sort();

const modules = files.map(loadModuleFile);

if (modules.length !== 10) {
  console.warn(`⚠️  Expected 10 modules, found ${modules.length}.`);
}

// ---------------------------------------------------------------------------
// Validate before emitting. A bad seed is worse than no seed.
// ---------------------------------------------------------------------------

const errors = [];
const seenSlug = new Set();
const seenOrder = new Set();

for (const m of modules) {
  const where = m.slug || "(no slug)";
  if (!m.slug) errors.push("A module has no slug.");
  if (seenSlug.has(m.slug)) errors.push(`Duplicate slug: ${m.slug}`);
  seenSlug.add(m.slug);

  if (seenOrder.has(m.sequence_order))
    errors.push(`Duplicate sequence_order ${m.sequence_order} at ${where}`);
  seenOrder.add(m.sequence_order);

  if (!m.canonical_reasoning || m.canonical_reasoning.trim().length < 200)
    errors.push(`${where}: canonical_reasoning is missing or suspiciously short.`);
  if (!Array.isArray(m.signals) || m.signals.length === 0)
    errors.push(`${where}: signals[] is empty — the module cannot be graded.`);
  if (m.format === "interactive_call" && !m.call_script)
    errors.push(`${where}: interactive_call format requires a call_script.`);
  if (m.content_warning && !m.content_warning_text)
    errors.push(`${where}: content_warning is set but content_warning_text is null.`);

  // Every id referenced by the rubric must exist in signals[].
  const ids = new Set((m.signals || []).map((s) => s.id));
  const referenced = [];
  for (const clause of [...(m.rubric?.accept || []), ...(m.rubric?.partial || [])]) {
    referenced.push(...(clause.names || []), ...(clause.anyOf || []), ...(clause.andNot || []));
  }
  referenced.push(...(m.rubric?.bonusAdvanced || []), ...(m.rubric?.sufficientAlone || []));
  for (const id of referenced) {
    if (!ids.has(id)) errors.push(`${where}: rubric references unknown signal "${id}".`);
  }
}

// Sequence constraints from the content spec §10.
const ordered = [...modules].sort((a, b) => a.sequence_order - b.sequence_order);
if (ordered[0]?.verdict === "real")
  errors.push(
    `Sequence: ${ordered[0].slug} is a REAL control and must not be first — its value is breaking a pattern the learner has already formed.`
  );
for (let i = 0; i < ordered.length - 1; i++) {
  if (
    ordered[i].format === "interactive_call" &&
    ordered[i + 1].format === "interactive_call"
  ) {
    errors.push(
      `Sequence: ${ordered[i].slug} and ${ordered[i + 1].slug} are adjacent interactive calls.`
    );
  }
}

if (errors.length) {
  console.error("❌ Module content failed validation:\n");
  errors.forEach((e) => console.error("  • " + e));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

const q = (s) => (s === null || s === undefined ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const jsonb = (v) => `${q(JSON.stringify(v ?? null))}::jsonb`;
const arr = (a) =>
  a && a.length ? `array[${a.map((x) => q(x)).join(", ")}]::text[]` : `'{}'::text[]`;

const rows = ordered.map((m) => `  (
    ${q(m.slug)},
    ${q(m.title)},
    ${q(m.verdict)},
    ${m.difficulty},
    ${q(m.format)}::public.module_format,
    ${m.est_seconds},
    ${arr(m.tags)},
    ${q(m.prompt_text)},
    ${q(m.question_variant)},
    ${jsonb(m.verdict_labels)},
    ${jsonb(m.render_spec)},
    ${jsonb(m.assets)},
    ${jsonb(m.content_blocks)},
    ${jsonb(m.signals)},
    ${q(m.canonical_reasoning)},
    ${jsonb(m.rubric)},
    ${jsonb(m.distractors)},
    ${jsonb(m.reveal)},
    ${m.call_script ? jsonb(m.call_script) : "null"},
    ${m.content_warning},
    ${q(m.content_warning_text)},
    ${m.skippable_without_penalty},
    ${m.sequence_order}
  )`);

const sql = `-- supabase/seed_modules.sql
--
-- GENERATED FILE — do not edit by hand.
-- Source: src/content/modules/*.ts
-- Regenerate: npm run seed:modules
--
-- ${modules.length} finalized learning modules, in delivery order.
-- Requires supabase/migrations/0002_learning_modules.sql to have run first.
--
-- Idempotent: re-running updates existing rows by slug.

begin;

-- canonical_reasoning is protected by enforce_canonical_reasoning_immutable().
-- The seed is the one legitimate writer of that column, so it opts in here,
-- explicitly and visibly. Nothing else in the codebase sets this flag — which
-- is what makes an accidental AI-driven rewrite structurally impossible rather
-- than merely discouraged.
set local app.allow_canonical_edit = 'on';

insert into public.learning_modules (
  slug,
  title,
  verdict,
  difficulty,
  format,
  est_seconds,
  tags,
  prompt_text,
  question_variant,
  verdict_labels,
  render_spec,
  assets,
  content_blocks,
  signals,
  canonical_reasoning,
  rubric,
  distractors,
  reveal,
  call_script,
  content_warning,
  content_warning_text,
  skippable_without_penalty,
  sequence_order
) values
${rows.join(",\n")}
on conflict (slug) do update set
  title                     = excluded.title,
  verdict                   = excluded.verdict,
  difficulty                = excluded.difficulty,
  format                    = excluded.format,
  est_seconds               = excluded.est_seconds,
  tags                      = excluded.tags,
  prompt_text               = excluded.prompt_text,
  question_variant          = excluded.question_variant,
  verdict_labels            = excluded.verdict_labels,
  render_spec               = excluded.render_spec,
  assets                    = excluded.assets,
  content_blocks            = excluded.content_blocks,
  signals                   = excluded.signals,
  canonical_reasoning       = excluded.canonical_reasoning,
  rubric                    = excluded.rubric,
  distractors               = excluded.distractors,
  reveal                    = excluded.reveal,
  call_script               = excluded.call_script,
  content_warning           = excluded.content_warning,
  content_warning_text      = excluded.content_warning_text,
  skippable_without_penalty = excluded.skippable_without_penalty,
  sequence_order            = excluded.sequence_order;

commit;

-- Sanity check. Should return zero rows.
-- select * from public.validate_module_sequence();
`;

writeFileSync(OUT, sql, "utf8");
console.log(`✅ Wrote ${modules.length} modules to supabase/seed_modules.sql`);
console.log(
  "   Order: " + ordered.map((m) => m.slug.split("-")[0]).join(" → ")
);
