-- supabase/migrations/0008_mentor_leaderboard.sql
-- Dawrak — the mentoring leaderboard.
--
-- Run after 0003_mentoring.sql. Adds no table and no column: everything ranked
-- here is already recorded by the mentoring flow. What is missing is not data,
-- it is *cross-user read access*, and that absence is deliberate — RLS scopes
-- `mentor_share_responses` and `mentoring_sessions` to the mentor who owns them,
-- so no client can total up anybody else's teaching. A leaderboard needs exactly
-- that total and nothing else.
--
-- So the whole surface is three security-definer functions that return COUNTS.
-- Never a learner's reasoning, never a recipient's email, never a share token —
-- those stay behind the policies that already guard them. Loosening RLS on the
-- underlying tables to make a ranking possible would have traded a feature for
-- every mentor's private replies.
--
-- WHAT COUNTS AS TEACHING SOMEONE
--
--   1. A share response the mentor has REPLIED to. Someone with no account
--      opened their link, walked the module and sent back their reasoning, and
--      the mentor wrote back. That is the loop closed: learn → teach → multiply.
--      A response still sitting unanswered is a person reached, not yet taught,
--      and is reported separately as `awaiting_reply` so the app can nudge.
--
--   2. A row in `mentoring_sessions` — an in-person session logged before that
--      feature was retired. Read-only now, and real: somebody sat with somebody
--      and taught them. Dropping those from the ranking would erase the only
--      offline teaching this product ever recorded.
--
-- Responses on a revoked link still count. Revoking pulls the link; it does not
-- un-teach the person who already answered it.

-- =========================================================================
-- 1. DISPLAY NAME
-- =========================================================================
-- The leaderboard is the first screen in this app that shows one user's name to
-- another, so what counts as a name gets decided here rather than per-query.
--
-- `handle_new_user` stamps every signup 'New Member' and 0007 copied full_name
-- into username, so live rows carry that placeholder in both columns. It is not
-- a name. Mirrors PLACEHOLDER_NAMES in src/hooks/useAuth.ts.
--
-- Note what is NOT in the fallback chain: the email. displayName() on the client
-- falls back to the address's local-part, which is fine for the account's owner
-- looking at their own profile and is a leak the moment it is rendered to
-- somebody else. A generic label is the correct floor here.
create or replace function public.mentor_display_name(
  p_username  text,
  p_full_name text
)
returns text
language sql
immutable
as $$
  select coalesce(
    (select v
       from (values (nullif(trim(p_username), '')),
                    (nullif(trim(p_full_name), ''))) as t(v)
      where v is not null
        and lower(v) not in ('new member', 'mil changemaker')
      limit 1),
    'Dawrak member'
  );
$$;


-- =========================================================================
-- 2. THE COUNTS
-- =========================================================================
-- One definition of "people taught", in one place, so the leaderboard and a
-- mentor's own card can never disagree about their own number.
--
-- Security definer because it reads across every mentor. It is deliberately NOT
-- granted to anon or authenticated: the two functions below call it as the
-- definer and expose only what each is meant to. Nothing else may call it.
create or replace function public.mentor_impact_counts()
returns table (
  user_id        uuid,
  people_taught  integer,
  awaiting_reply integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with shared as (
    select
      l.mentor_id                                              as user_id,
      count(*) filter (where r.mentor_reply is not null)::int   as taught,
      count(*) filter (where r.mentor_reply is null)::int       as awaiting
    from public.mentor_share_responses r
    join public.mentor_share_links l on l.id = r.share_link_id
    group by l.mentor_id
  ),
  offline as (
    select s.mentor_id as user_id, count(*)::int as taught
    from public.mentoring_sessions s
    group by s.mentor_id
  )
  select
    coalesce(sh.user_id, off.user_id),
    (coalesce(sh.taught, 0) + coalesce(off.taught, 0))::int,
    coalesce(sh.awaiting, 0)::int
  from shared sh
  full join offline off on off.user_id = sh.user_id;
$$;

comment on function public.mentor_impact_counts is
  'Internal. People taught per mentor: share responses they replied to, plus '
  'in-person sessions they logged. Not granted to anon or authenticated — the '
  'public functions below call it as the definer.';


-- =========================================================================
-- 3. THE LEADERBOARD
-- =========================================================================
-- Ties share a rank (1, 2, 2, 4). Two mentors who each taught three people did
-- the same amount of teaching, and inventing a tiebreak would rank them on when
-- they signed up — which is not the thing being measured. Display order is still
-- deterministic (older account first) so the list does not shuffle between loads.
create or replace function public.mentor_leaderboard(p_limit integer default 10)
returns table (
  rank          integer,
  user_id       uuid,
  display_name  text,
  avatar_url    text,
  people_taught integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    rank() over (order by c.people_taught desc)::int,
    c.user_id,
    public.mentor_display_name(p.username, p.full_name),
    p.avatar_url,
    c.people_taught
  from public.mentor_impact_counts() c
  join public.profiles p on p.id = c.user_id
  where c.people_taught > 0
  order by c.people_taught desc, p.created_at asc
  limit greatest(1, least(coalesce(p_limit, 10), 100));
$$;

comment on function public.mentor_leaderboard is
  'Top mentors by people taught. Counts and public profile fields only — no '
  'response text, no recipient emails, no share tokens.';


-- =========================================================================
-- 4. THE CALLER'S OWN STANDING
-- =========================================================================
-- Always one row, even for someone who has taught nobody — the Profile card
-- renders either way and a zero-row result would make "not ranked yet"
-- indistinguishable from "the query failed".
--
-- `rank` is null until they have taught at least one person. Being ranked last
-- among people who have taught someone is an achievement; being unranked is the
-- honest state before that.
create or replace function public.my_mentor_impact()
returns table (
  rank           integer,
  people_taught  integer,
  awaiting_reply integer,
  total_mentors  integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with counts as (
    select * from public.mentor_impact_counts()
  ),
  ranked as (
    select c.user_id, rank() over (order by c.people_taught desc)::int as rank
    from counts c
    where c.people_taught > 0
  )
  select
    (select r.rank from ranked r where r.user_id = auth.uid()),
    coalesce((select c.people_taught  from counts c where c.user_id = auth.uid()), 0),
    coalesce((select c.awaiting_reply from counts c where c.user_id = auth.uid()), 0),
    (select count(*)::int from counts c where c.people_taught > 0);
$$;

comment on function public.my_mentor_impact is
  'The signed-in mentor''s own standing. One row always; rank is null until '
  'they have taught someone.';


-- =========================================================================
-- 5. GRANTS
-- =========================================================================
-- Default execute goes to PUBLIC, which would include any role added later.
revoke all on function public.mentor_display_name(text, text) from public;
revoke all on function public.mentor_impact_counts()          from public;
revoke all on function public.mentor_leaderboard(integer)     from public;
revoke all on function public.my_mentor_impact()              from public;

-- Revoking from PUBLIC is NOT enough on Supabase, and this is worth stating
-- because the first version of this file got it wrong and the live database
-- proved it. Supabase ships
--
--   alter default privileges in schema public
--     grant execute on functions to anon, authenticated, service_role;
--
-- so every function above was granted execute DIRECTLY to those roles the
-- moment it was created. A direct grant survives `revoke ... from public`
-- untouched — anon could read the leaderboard and any signed-in user could call
-- the internal counts function. Each role has to be named.
--
-- Guarded per role, because `anon`/`authenticated` are created by Supabase and
-- do not exist in the offline PGlite harness — a bare REVOKE would abort the
-- migration there. Same pattern as 0003.
do $$
declare
  r text;
  f text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      raise notice 'role % not present — skipping (offline test run?)', r;
      continue;
    end if;
    foreach f in array array[
      'public.mentor_display_name(text, text)',
      'public.mentor_impact_counts()',
      'public.mentor_leaderboard(integer)',
      'public.my_mentor_impact()'
    ] loop
      execute format('revoke all on function %s from %I', f, r);
    end loop;
  end loop;

  -- Then hand back exactly two functions, to signed-in users only. The
  -- leaderboard is an in-app screen: the anonymous /teach/<token> flow has no
  -- business enumerating mentors, and `mentor_impact_counts` stays callable by
  -- nobody but the two functions above, which run as the definer.
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.mentor_leaderboard(integer) to authenticated';
    execute 'grant execute on function public.my_mentor_impact() to authenticated';
  end if;
end
$$;
