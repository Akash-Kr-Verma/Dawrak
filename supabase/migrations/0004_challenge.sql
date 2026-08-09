-- supabase/migrations/0004_challenge.sql
-- Play Your Part — Daily Challenge and the Questions Bank.
--
-- Run after 0003_mentoring.sql.
--
-- The Daily Challenge shipped without ever recording anything. `/api/feedback`
-- was called with a hardcoded `userId: "demo-user-123"`, which is not a uuid, so
-- every insert into `attempts` failed the foreign key to `profiles`. The error
-- was logged and swallowed, the AI feedback still rendered, and the screen
-- looked like it worked. On the hosted project at the time of writing: 8
-- scenarios seeded, **0 attempts, ever**. The Profile tab computes level, points
-- and category breakdown from that table, so it was reading an empty set for
-- every user.
--
-- The second failure was in the same call: AI-generated scenarios were given ids
-- like `ai-live-1723-457` and never written to `scenarios`, so even a correct
-- user id could not have satisfied `attempts.scenario_id`. Scenarios have to
-- exist as rows before an attempt can point at one.
--
-- This migration adds what the Challenge needs to persist, plus the Questions
-- Bank the prototype's Challenge panel is actually built around: situations
-- written and tagged by people, not by a model.

-- =========================================================================
-- 1. SCENARIOS — presentation + provenance
-- =========================================================================
-- The API already returned these fields; they simply had nowhere to live, so a
-- scenario could not survive a page reload.
alter table public.scenarios
  add column if not exists original_publisher text,
  add column if not exists source_channel     text,
  add column if not exists viral_reach        text,
  add column if not exists date_str           text,
  add column if not exists media_type         text,
  add column if not exists is_approved        boolean not null default true;

-- Where a scenario came from. This is what keeps the three pools separable:
-- the hand-written seed, throwaway AI generations, and the Questions Bank that
-- learners stock themselves.
alter table public.scenarios
  add column if not exists origin text not null default 'seed';

do $$
begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_schema = 'public' and table_name = 'scenarios'
      and constraint_name = 'scenarios_origin_check'
  ) then
    alter table public.scenarios
      add constraint scenarios_origin_check
      check (origin in ('seed', 'ai_generated', 'questions_bank'));
  end if;

  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_schema = 'public' and table_name = 'scenarios'
      and constraint_name = 'scenarios_media_type_check'
  ) then
    alter table public.scenarios
      add constraint scenarios_media_type_check
      check (media_type is null or media_type in ('text', 'image', 'audio', 'video'));
  end if;
end
$$;

comment on column public.scenarios.origin is
  'seed = supabase/seed.sql. ai_generated = produced by /api/challenge/next and '
  'persisted so an attempt can reference it; not listed in the Questions Bank. '
  'questions_bank = written and tagged by a learner.';

create index if not exists idx_scenarios_origin
  on public.scenarios (origin, created_at desc);
create index if not exists idx_scenarios_bank
  on public.scenarios (created_at desc)
  where origin = 'questions_bank';


-- =========================================================================
-- 2. ATTEMPTS — what the learner actually did
-- =========================================================================
-- `attempts` stored only the free text and a score. Everything else the
-- Challenge screen collects — the real/fake/needs-evidence call, the source
-- they cited, whether they asserted no official source exists — was thrown
-- away, which also made "did they get it right?" uncomputable.
alter table public.attempts
  add column if not exists assessment      text,
  add column if not exists source_url      text,
  add column if not exists no_source_found boolean not null default false,
  add column if not exists ai_feedback     text,
  add column if not exists source_audit    text,
  add column if not exists verdict_title   text,
  add column if not exists key_lesson      text,
  add column if not exists graded_by       text not null default 'ai';

do $$
begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_schema = 'public' and table_name = 'attempts'
      and constraint_name = 'attempts_assessment_check'
  ) then
    alter table public.attempts
      add constraint attempts_assessment_check
      check (assessment is null or assessment in ('real', 'fake', 'evidence'));
  end if;

  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_schema = 'public' and table_name = 'attempts'
      and constraint_name = 'attempts_graded_by_check'
  ) then
    alter table public.attempts
      add constraint attempts_graded_by_check
      check (graded_by in ('ai', 'fallback'));
  end if;
end
$$;

comment on column public.attempts.assessment is
  '''evidence'' means "needs more evidence" — deliberately neither right nor '
  'wrong. scenario_stats counts it in the denominator but never as a hit, '
  'because treating "I withheld judgment" as a miss would teach the opposite '
  'of what this app is for.';

comment on column public.attempts.graded_by is
  'ai = the model scored it. fallback = the AI call failed and the canned '
  'response was stored. Worth keeping: a run of ''fallback'' rows means the '
  'scores in this table are not comparable to the rest.';

create index if not exists idx_attempts_user_created
  on public.attempts (user_id, created_at desc);
create index if not exists idx_attempts_scenario
  on public.attempts (scenario_id);


-- =========================================================================
-- 2b. MODERATION: stop the report trigger un-hiding things
-- =========================================================================
-- `check_reports_count()` in schema.sql auto-hides a scenario at 3 reports,
-- which is right. Its `else` branch then sets `is_hidden := false` on every
-- other insert or reports_count update, which is not: a scenario hidden by hand
-- pops back into the feed the moment anybody files a single report on it, and
-- an insert cannot be created hidden at all.
--
-- That was harmless while `scenarios` held four hand-written seed rows. The
-- Questions Bank below lets learners write into the shared pool everyone else
-- is tested on, so hiding needs to actually stick.
--
-- New rule: reports escalate, and only a deliberate un-hide reverses it. The
-- auto-hide at 3 is unchanged.
create or replace function public.check_reports_count()
returns trigger as $$
begin
  if new.reports_count >= 3 then
    new.is_hidden := true;
  end if;
  -- No else. Dropping below 3 reports does not un-hide: clearing a hide is a
  -- moderator's decision, made by setting is_hidden directly.
  return new;
end;
$$ language plpgsql;


-- =========================================================================
-- 3. CHALLENGE FEED  (what the client is allowed to render)
-- =========================================================================
-- Excludes `verdict`. Note honestly what this is and is not: RLS cannot hide a
-- column, and `scenarios` keeps its public read policy, so a determined user can
-- still select the verdict directly. This view is the same discipline as
-- RUNNER_COLUMNS in src/hooks/useModules.ts — it stops the answer being handed
-- to the page unprompted; it is not a security boundary. The real boundary in
-- this codebase is the anon share flow in 0003, where no table is reachable at
-- all.
create or replace view public.challenge_feed
with (security_invoker = true) as
select
  s.id,
  s.title,
  s.body_context,
  s.category,
  s.media_url,
  s.media_type,
  s.original_publisher,
  s.source_channel,
  s.viral_reach,
  s.date_str,
  s.origin,
  s.is_community_submitted,
  s.submitted_by_profile_id,
  coalesce(nullif(trim(p.full_name), ''), 'A community member') as submitted_by_name,
  s.created_at
from public.scenarios s
left join public.profiles p on p.id = s.submitted_by_profile_id
where not s.is_hidden
  and s.is_approved;


-- =========================================================================
-- 4. SCENARIO STATS  ("86% of learners spotted it")
-- =========================================================================
create or replace view public.scenario_stats
with (security_invoker = true) as
select
  s.id                                                          as scenario_id,
  count(a.id)::integer                                          as attempts_total,
  count(*) filter (where a.assessment = s.verdict)::integer      as spotted_count,
  case
    when count(a.id) = 0 then null
    else round(100.0 * count(*) filter (where a.assessment = s.verdict)
               / count(a.id))::integer
  end                                                           as spotted_pct
from public.scenarios s
left join public.attempts a on a.scenario_id = s.id
group by s.id;

comment on view public.scenario_stats is
  'Aggregate only. It reads `attempts`, which carries a public read policy from '
  'schema.sql — unlike module_attempts, which 0002 deliberately made private '
  'because written reasoning can disclose personal circumstances. The same '
  'argument applies to attempts.user_reasoning; tightening it is a live '
  'decision, not something this migration changes underneath the Challenge tab.';


-- =========================================================================
-- 5. STREAK
-- =========================================================================
-- The prototype's "🔥 Day 12". Consecutive calendar days with at least one
-- attempt, counted back from today. Yesterday still counts as live so the
-- streak does not appear to break at midnight for someone mid-session.
create or replace function public.user_challenge_streak(p_user_id uuid)
returns integer
language sql
stable
as $$
  with days as (
    select distinct (a.created_at at time zone 'utc')::date as d
    from public.attempts a
    where a.user_id = p_user_id
  ),
  grouped as (
    -- Consecutive dates share a constant (date - row_number).
    select d, d - (row_number() over (order by d))::integer as grp
    from days
  ),
  runs as (
    select count(*)::integer as len, max(d) as last_day
    from grouped
    group by grp
  )
  select coalesce(
    (select len from runs
      where last_day >= (current_date - 1)
      order by last_day desc
      limit 1),
    0
  );
$$;


-- =========================================================================
-- 6. QUESTIONS BANK SUBMISSION
-- =========================================================================
-- From the prototype: "No AI checks it; your judgment is the check."
--
-- Gated on having completed at least one module, which is the same bar that
-- unlocks mentoring in 0003. Someone who has finished a module has been graded
-- on their reasoning at least once; letting a brand-new account write into the
-- shared pool everyone else is tested on is a moderation problem waiting to
-- happen.
create or replace function public.submit_bank_scenario(
  p_title    text,
  p_body     text,
  p_verdict  text,
  p_category text default 'source_checking'
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_id        uuid;
  v_completed integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  select count(*) into v_completed
  from public.user_module_progress
  where user_id = auth.uid() and status = 'completed';

  if v_completed < 1 then
    raise exception
      'Complete at least one learning module before submitting to the Questions Bank.'
      using errcode = 'check_violation';
  end if;

  if p_verdict not in ('real', 'fake') then
    raise exception 'Verdict must be real or fake.' using errcode = 'check_violation';
  end if;

  if length(coalesce(trim(p_title), '')) < 8 then
    raise exception 'Give the situation a title of at least 8 characters.'
      using errcode = 'check_violation';
  end if;

  if length(coalesce(trim(p_body), '')) < 20 then
    raise exception 'Describe what someone would actually see (20 characters minimum).'
      using errcode = 'check_violation';
  end if;

  if p_category not in
     ('source_checking', 'deepfake', 'phishing', 'emotional_manipulation') then
    raise exception 'Unknown category %', p_category using errcode = 'check_violation';
  end if;

  insert into public.scenarios (
    title, body_context, category, verdict,
    is_community_submitted, submitted_by_profile_id,
    origin, source_channel, original_publisher, media_type
  )
  values (
    trim(p_title), trim(p_body), p_category, p_verdict,
    true, auth.uid(),
    'questions_bank', 'Questions Bank', 'Submitted by a learner', 'text'
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.submit_bank_scenario is
  'Adds a learner-written, learner-tagged situation to the shared Daily '
  'Challenge pool. No model reviews it — that is the design, per the prototype.';


-- =========================================================================
-- 7. PICKING THE NEXT CHALLENGE
-- =========================================================================
-- Prefers something the learner has not attempted, and prefers Questions Bank
-- material over the seed so community submissions actually get seen. Returns
-- no verdict, for the same reason challenge_feed does not.
create or replace function public.next_challenge_for(p_user_id uuid)
returns uuid
language sql
stable
as $$
  select f.id
  from public.challenge_feed f
  where f.origin in ('seed', 'questions_bank')
    and not exists (
      select 1 from public.attempts a
      where a.scenario_id = f.id and a.user_id = p_user_id
    )
  order by
    case when f.origin = 'questions_bank' then 0 else 1 end,
    random()
  limit 1;
$$;

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      raise notice 'role % not present — skipping grants (offline test run?)', r;
      continue;
    end if;
    execute format('grant execute on function public.user_challenge_streak(uuid) to %I', r);
    execute format('grant execute on function public.next_challenge_for(uuid) to %I', r);
  end loop;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.submit_bank_scenario(text, text, text, text) to authenticated';
  end if;
end
$$;
