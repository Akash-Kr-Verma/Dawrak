-- supabase/migrations/0005_attempts_privacy.sql
--
-- RUN AFTER 0004_challenge.sql.
--
-- Why this file exists
-- --------------------
-- `schema.sql` gave Challenge `attempts` a world-readable select policy
-- (`using (true)`). Every learner's written reasoning on the Daily Challenge was
-- therefore readable by any authenticated user, and by `anon`. That is the exact
-- opposite of `module_attempts` and `mentor_share_responses`, which are private
-- for precisely this reason: the reasoning is the learner thinking out loud, and
-- it can name people, places and personal experiences.
--
-- This was flagged rather than changed when 0004 was written, because it is
-- pre-existing behaviour. It is closed here, before real users exist.
--
-- The catch, and why this is two changes rather than one
-- -----------------------------------------------------
-- `scenario_stats` ("what % of learners spotted this one") is defined
-- `security_invoker = true`, so it evaluates the *caller's* RLS against
-- `attempts`. Restricting the select policy alone would silently reduce that
-- view to a count of the caller's own attempts — the stat would still render,
-- just wrong, which is the failure mode this codebase already has too much of.
--
-- So the view is switched to run as its owner. It exposes only aggregates
-- (scenario_id, attempts_total, spotted_count, spotted_pct) and never a row's
-- `reasoning`, `assessment`, or `user_id`, so definer semantics widen nothing
-- that was not already public by intent.
--
-- Idempotent.

-- 1. Individual attempts become private to their author. -----------------------
drop policy if exists "Allow public read access to attempts" on public.attempts;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'attempts'
      and policyname = 'Learners read their own attempts'
  ) then
    create policy "Learners read their own attempts"
      on public.attempts
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;

-- 2. Aggregate stats keep counting across every learner. -----------------------
-- Owner is `postgres`, which is not subject to the policy above.
alter view public.scenario_stats set (security_invoker = false);

do $$
begin
  raise notice
    '0005: Challenge attempts are now readable only by their author; '
    'scenario_stats still aggregates across all learners.';
end
$$;
