-- supabase/migrations/0002_learning_modules.sql
-- Play Your Part — finalized learning-module system.
--
-- Baseline for this migration is supabase/schema.sql (profiles, scenarios,
-- attempts, taught_sessions). That file stays as-is: the Daily Challenge tab
-- still reads `scenarios` and writes `attempts`. This migration adds the
-- authored, curriculum-grade module system alongside it.
--
-- Source of truth for the content model: play-your-part-modules-final.md (v1.2).
-- The 10-block layout in that document maps 1:1 onto `learning_modules`.

-- =========================================================================
-- 0. ENUM-LIKE DOMAINS
-- =========================================================================
-- Formats are the *interaction* type, not the topic. Each one maps to a
-- renderer in src/components/modules/. Adding a format here without adding a
-- renderer will fall through to the generic screen-sequence renderer.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'module_format') then
    create type public.module_format as enum (
      'sms_plus_landing_page',          -- M01
      'marketplace_listing',            -- M02
      'interactive_call',               -- M03, M08  (shared engine)
      'social_post_plus_donation_page', -- M04
      'dm_plus_portal',                 -- M05
      'forwarded_message',              -- M06
      'social_post_with_chart',         -- M07
      'interactive_payment_screen',     -- M09
      'group_chat'                      -- M10
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'module_grade') then
    create type public.module_grade as enum ('accept', 'partial', 'reject');
  end if;

  if not exists (select 1 from pg_type where typname = 'module_progress_status') then
    create type public.module_progress_status as enum (
      'not_started', 'in_progress', 'completed', 'skipped'
    );
  end if;
end
$$;


-- =========================================================================
-- 1. LEARNING MODULES
-- =========================================================================
create table if not exists public.learning_modules (
  id uuid primary key default gen_random_uuid(),

  -- ---- Block 1: ID & meta -------------------------------------------------
  slug         text not null unique,
  title        text not null,
  verdict      text not null check (verdict in ('real', 'fake')),
  difficulty   smallint not null check (difficulty between 1 and 5),
  format       public.module_format not null,
  est_seconds  integer not null check (est_seconds > 0),
  tags         text[] not null default '{}',

  -- ---- Block 2: Learner-facing copy --------------------------------------
  -- The only thing the learner reads before judging.
  prompt_text  text not null,
  -- Module 07 only: the binary question is reframed from "real or fake" to
  -- "is this giving you an accurate picture?" because every fact in it is
  -- true. Null on every other module. If the two-stage variant is ever built
  -- this splits into stage_1_question / stage_2_question.
  question_variant text,
  -- Labels for the two judgment buttons. Defaults to Real/Fake; M07 overrides.
  verdict_labels jsonb not null default
    '{"positive": "Real", "negative": "Fake"}'::jsonb,

  -- ---- Blocks 3-5: presentation ------------------------------------------
  render_spec    jsonb not null default '{}'::jsonb,  -- UI shell + screen layout
  assets         jsonb not null default '[]'::jsonb,  -- image/audio slots + licenses
  content_blocks jsonb not null default '{}'::jsonb,  -- the literal strings in the mock

  -- ---- Blocks 6-10: reasoning & grading ----------------------------------
  signals             jsonb not null default '[]'::jsonb,
  canonical_reasoning text not null,
  rubric              jsonb not null default '{}'::jsonb,
  distractors         jsonb not null default '[]'::jsonb,
  reveal              jsonb not null default '{}'::jsonb,

  -- ---- Interactive engines ------------------------------------------------
  -- Branching script for the shared call engine. Modules 03 and 08 are the
  -- same component with different rows here.
  call_script jsonb,

  -- ---- Duty of care & sequencing -----------------------------------------
  content_warning           boolean not null default false,
  content_warning_text      text,
  skippable_without_penalty boolean not null default false,
  sequence_order            integer not null unique,

  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- The call engine is config-driven; a call module without a script is a bug.
  constraint call_script_required_for_calls check (
    format <> 'interactive_call' or call_script is not null
  ),
  -- A content warning with nothing to display is worse than none.
  constraint warning_text_required check (
    not content_warning or content_warning_text is not null
  ),
  -- Signals drive grading. A module with none cannot be graded.
  constraint signals_not_empty check (jsonb_array_length(signals) > 0)
);

comment on table public.learning_modules is
  'Authored media-literacy modules. Content is editorial, not user-generated, '
  'and not AI-generated. See play-your-part-modules-final.md.';

comment on column public.learning_modules.canonical_reasoning is
  'IMMUTABLE AUTHORED TEXT. This is the explanation the learner reads after '
  'judging, and the reference the grader compares against. It is NEVER written '
  'or rewritten by an AI call. LLMs drift; this string is the thing that does '
  'not. The enforce_canonical_reasoning_immutable trigger blocks UPDATEs to it '
  'unless the session explicitly opts in (see the trigger body).';

comment on column public.learning_modules.signals is
  'Machine-readable form of canonical_reasoning: [{id, signal, weight, tier}]. '
  'Grading is "which of these did the learner name?", never "does this sound '
  'good?". The grader prompt may credit nothing outside this list.';

comment on column public.learning_modules.rubric is
  'Machine-readable accept/partial/reject conditions over signal ids. Evaluated '
  'in code by lib/modules/grade.ts, not by the model — the model only extracts '
  'which signals were named.';

comment on column public.learning_modules.format is
  'Interaction type, which selects the renderer. interactive_call is shared by '
  'modules 03 and 08 via call_script.';


-- Immutability guard for canonical_reasoning.
-- Editorial fixes are legitimate; silent AI rewrites are not. An UPDATE that
-- changes this column fails unless the session sets:
--   set local app.allow_canonical_edit = 'on';
create or replace function public.enforce_canonical_reasoning_immutable()
returns trigger as $$
begin
  if new.canonical_reasoning is distinct from old.canonical_reasoning
     and coalesce(current_setting('app.allow_canonical_edit', true), 'off') <> 'on'
  then
    raise exception
      'canonical_reasoning is immutable (module %). It must never be regenerated '
      'by an AI call. For a deliberate editorial change, run '
      '"set local app.allow_canonical_edit = ''on'';" in the same transaction.',
      old.slug
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_canonical_reasoning_immutable on public.learning_modules;
create trigger trg_canonical_reasoning_immutable
  before update on public.learning_modules
  for each row execute procedure public.enforce_canonical_reasoning_immutable();


-- Keep updated_at honest.
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_learning_modules_touch on public.learning_modules;
create trigger trg_learning_modules_touch
  before update on public.learning_modules
  for each row execute procedure public.touch_updated_at();


-- =========================================================================
-- 2. PER-USER MODULE PROGRESS
-- =========================================================================
-- Note: src/app/(dashboard)/learn/page.tsx already queried a table with this
-- name before this migration existed, and silently fell back to local state
-- when the query failed. This is that table, for real.
create table if not exists public.user_module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.learning_modules(id) on delete cascade,

  status public.module_progress_status not null default 'not_started',

  -- Module 08 may be skipped for wellbeing reasons. A skip recorded here must
  -- not reduce completion for mentor eligibility — see mentor_eligible_count.
  skipped_without_penalty boolean not null default false,

  best_score     public.module_grade,
  attempts_count integer not null default 0 check (attempts_count >= 0),
  completed_at   timestamptz,
  updated_at     timestamptz not null default now(),

  unique (user_id, module_id)
);

drop trigger if exists trg_user_module_progress_touch on public.user_module_progress;
create trigger trg_user_module_progress_touch
  before update on public.user_module_progress
  for each row execute procedure public.touch_updated_at();

create index if not exists idx_user_module_progress_user
  on public.user_module_progress (user_id);


-- =========================================================================
-- 3. MODULE ATTEMPTS
-- =========================================================================
-- Distinct from the existing `attempts` table, which belongs to the Daily
-- Challenge (free-form scenarios, 0-100 AI score). Module grading is
-- categorical and signal-based, so it gets its own table rather than
-- overloading a column that means something else.
create table if not exists public.module_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.learning_modules(id) on delete cascade,

  -- 'accurate'/'misleading' are the Module 07 accuracy-framed answers.
  learner_verdict text check (
    learner_verdict in ('real', 'fake', 'accurate', 'misleading')
  ),
  learner_reasoning text,

  score       public.module_grade not null,
  signals_hit text[] not null default '{}',
  feedback    text,

  -- Attempt-level flags. These are the only real inputs to Personalized Path.
  advanced_reasoner   boolean not null default false,
  over_flagged        boolean not null default false,
  dangerous_reasoning boolean not null default false,

  -- What the learner *did*, as opposed to what they said. Populated by the
  -- interactive engines (call, payment). The gap between "I knew it was a
  -- scam" and "I hung up" lives here.
  behavioural_log jsonb not null default '{}'::jsonb,

  -- 'ai'            = model extracted signals, code applied the rubric
  -- 'deterministic' = keyword fallback extracted signals, code applied rubric
  -- 'action_only'   = graded from behaviour alone (no written reasoning)
  graded_by text not null default 'ai'
    check (graded_by in ('ai', 'deterministic', 'action_only')),

  created_at timestamptz not null default now()
);

comment on column public.module_attempts.dangerous_reasoning is
  'Set when a learner''s reasoning would itself cost them money if acted on. '
  'Currently only Module 10 fires it ("I''d test it with a small amount '
  'first" — the small test IS the mechanism). Surfaced in feedback rather '
  'than buried inside a PARTIAL.';

comment on column public.module_attempts.over_flagged is
  'Set when a learner calls a genuine item fake (Module 02). Three of these '
  'across the set is a real skill-profile signal, not noise.';

create index if not exists idx_module_attempts_user
  on public.module_attempts (user_id, created_at desc);
create index if not exists idx_module_attempts_module
  on public.module_attempts (module_id);


-- =========================================================================
-- 4. PERSONALIZED PATH INPUTS
-- =========================================================================
-- The three attempt-level booleans, aggregated per learner. This is the whole
-- honest feature: three over-flags or three advanced-reasoner marks is enough
-- to say something true about a learner. security_invoker keeps RLS applying
-- to the querying user rather than the view owner.
create or replace view public.learner_signal_profile
with (security_invoker = true) as
select
  a.user_id,
  count(*)                                            as attempts_total,
  count(*) filter (where a.over_flagged)              as over_flag_count,
  count(*) filter (where a.advanced_reasoner)         as advanced_reasoner_count,
  count(*) filter (where a.dangerous_reasoning)       as dangerous_reasoning_count,
  count(*) filter (where a.score = 'accept')          as accept_count,
  count(*) filter (where a.score = 'partial')         as partial_count,
  count(*) filter (where a.score = 'reject')          as reject_count,
  (count(*) filter (where a.over_flagged)) >= 3       as over_flags_persistently,
  (count(*) filter (where a.advanced_reasoner)) >= 3  as reasons_at_advanced_level,
  (count(*) filter (where a.dangerous_reasoning)) > 0 as has_dangerous_reasoning
from public.module_attempts a
group by a.user_id;


-- Modules that count toward mentor eligibility for a user. A penalty-free skip
-- (Module 08's content warning) counts as satisfied, which is the whole point
-- of the flag.
create or replace function public.mentor_eligible_count(p_user_id uuid)
returns integer as $$
  select count(*)::integer
  from public.user_module_progress p
  where p.user_id = p_user_id
    and (p.status = 'completed'
         or (p.status = 'skipped' and p.skipped_without_penalty));
$$ language sql stable;


-- =========================================================================
-- 5. SEQUENCE VALIDATION
-- =========================================================================
-- Two hard constraints from the content spec (§10) that are cross-row, so they
-- are checked on demand rather than by a table constraint:
--   * Module 02 (the REAL control) must not be first — its pedagogical value
--     is breaking a pattern the learner has already started to form.
--   * Modules 03 and 08 must not be adjacent — two simulated calls
--     back-to-back exhausts the learner and dulls the second one.
-- Returns one row per violation; zero rows means the sequence is valid.
create or replace function public.validate_module_sequence()
returns table (violation text, detail text) as $$
begin
  return query
  select
    'control_module_first'::text,
    format('Module %s is a REAL control and must not be first in the sequence.', m.slug)
  from public.learning_modules m
  where m.verdict = 'real'
    and m.is_published
    and m.sequence_order = (
      select min(sequence_order) from public.learning_modules where is_published
    );

  return query
  select
    'adjacent_interactive_calls'::text,
    format('%s and %s are both interactive calls at adjacent positions %s and %s.',
           a.slug, b.slug, a.sequence_order, b.sequence_order)
  from public.learning_modules a
  join public.learning_modules b
    on b.sequence_order = a.sequence_order + 1
  where a.format = 'interactive_call'
    and b.format = 'interactive_call'
    and a.is_published and b.is_published;
end;
$$ language plpgsql stable;


-- =========================================================================
-- 6. ROW LEVEL SECURITY
-- =========================================================================
alter table public.learning_modules    enable row level security;
alter table public.user_module_progress enable row level security;
alter table public.module_attempts      enable row level security;

-- Module content is curriculum. Everyone reads it; nobody writes it from the
-- client. Authoring happens through migrations/seeds with the service role.
drop policy if exists "Published modules are readable by anyone" on public.learning_modules;
create policy "Published modules are readable by anyone"
  on public.learning_modules for select
  using (is_published);

drop policy if exists "Users read their own progress" on public.user_module_progress;
create policy "Users read their own progress"
  on public.user_module_progress for select
  using (auth.uid() = user_id);

drop policy if exists "Users write their own progress" on public.user_module_progress;
create policy "Users write their own progress"
  on public.user_module_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update their own progress" on public.user_module_progress;
create policy "Users update their own progress"
  on public.user_module_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Attempts are private. Unlike the Challenge tab's public `attempts` table,
-- these contain a learner's written reasoning about scams — sometimes
-- disclosing that a relative is ill (Module 06) or that they were taken in.
-- That is not public data.
drop policy if exists "Users read their own module attempts" on public.module_attempts;
create policy "Users read their own module attempts"
  on public.module_attempts for select
  using (auth.uid() = user_id);

drop policy if exists "Users record their own module attempts" on public.module_attempts;
create policy "Users record their own module attempts"
  on public.module_attempts for insert
  with check (auth.uid() = user_id);
