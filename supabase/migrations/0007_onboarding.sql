-- 0007_onboarding.sql
--
-- Adds the username captured at onboarding.
--
-- Numbered 0007, not 0006. The UI branch this was ported from named the same
-- file `0006_onboarding.sql`, which collides with `0006_share_scenario.sql`
-- already applied here. The filenames differ, so git merges both without a
-- conflict and nothing warns you — the ordering just quietly becomes ambiguous.
--
-- Already applied to the hosted project (`profiles.username` is live), so this
-- file is written to be safe to re-run and exists mainly so the column has a
-- definition in version control rather than only in the dashboard — the exact
-- drift that has bitten this project before.

alter table public.profiles
  add column if not exists username text;

-- Anyone who signed up before onboarding existed should not be sent through it.
-- Their display name becomes their username; the app treats a null username as
-- "not onboarded yet" and nothing else.
update public.profiles
set username = full_name
where username is null
  and full_name is not null
  and length(trim(full_name)) > 0;

-- Deliberately NO unique index on username.
--
-- The onboarding screen checks the handle is free before writing, which leaves
-- a two-round-trip race only the database could actually settle. A unique index
-- is the right fix — but it cannot be added here: the backfill above copies
-- `full_name` into `username`, and this project's live data already contains
-- repeats (several rows read "New Member"), so creating the index would abort
-- on existing duplicates. Deduplicating real user rows is a product decision,
-- not something a UI pass should do silently. Left as a known gap.
