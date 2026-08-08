-- supabase/migrations/0003_mentoring.sql
-- Play Your Part — mentoring, scoped to the finalized 10-module system.
--
-- Run after 0002_learning_modules.sql.
--
-- Three things happen here.
--
-- 1. `mentoring_sessions` is brought into the repo. It has been living only in
--    the hosted project, hand-made through the dashboard, with no definition
--    under version control — so a fresh environment silently lacked it and the
--    Mentor Hub broke in ways nothing in the repo explained. This adopts the
--    existing table in place (create-if-not-exists plus add-column-if-not-exists)
--    rather than recreating it, so existing rows survive untouched.
--
-- 2. Mentoring becomes per-module. The old model gated the whole Mentor Hub on
--    `user_module_progress.completed_lessons >= 5` — a column that exists in no
--    migration, counting "lessons" the finalized module system does not have.
--    The replacement is the rule the prototype states: finish a module and you
--    can mentor that module, immediately, without finishing the other nine.
--    The unlock signal is `user_module_progress.status = 'completed'`, which
--    /api/modules/grade already writes.
--
-- 3. A mentor can share one mastered module with someone outside the app, over
--    a link that needs no account. The recipient judges it and writes why; that
--    lands in the mentor's Pending Reviews; the mentor replies personally.
--
-- Anonymous access is deliberately NOT granted on any table here. The public
-- share flow goes through four security-definer functions that return exactly
-- the fields the recipient may see. A `select` policy over `mentor_share_links`
-- would let anyone page through every mentor's links, because PostgREST filters
-- are supplied by the caller — knowing the token would stop being what grants
-- access. The functions take the token as an argument instead, which makes the
-- token the only way in.

-- =========================================================================
-- 1. MENTORING SESSIONS  (offline teaching, logged with proof)
-- =========================================================================
-- Fresh environments get the table from here. Environments that already have
-- the hand-made one keep their rows and only gain what is missing.
create table if not exists public.mentoring_sessions (
  id             uuid primary key default gen_random_uuid(),
  mentor_id      uuid not null references public.profiles(id) on delete cascade,
  learner_name   text not null,
  relationship   text,
  topic_taught   text,
  proof_file_url text,
  notes          text,

  -- New. Null on every pre-existing row, and null stays legal: sessions logged
  -- before this migration recorded only the free-text `topic_taught`, and
  -- guessing which module those meant would be inventing data.
  module_id      uuid references public.learning_modules(id) on delete set null,

  created_at     timestamptz not null default now()
);

-- Adoption path for the hand-made table. Each of these is a no-op on a table
-- this migration just created.
alter table public.mentoring_sessions
  add column if not exists relationship   text,
  add column if not exists topic_taught   text,
  add column if not exists proof_file_url text,
  add column if not exists notes          text,
  add column if not exists module_id      uuid,
  add column if not exists created_at     timestamptz not null default now();

-- The module FK is added separately: `add column if not exists` will not attach
-- a constraint to a column that already exists.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'mentoring_sessions'
      and constraint_name = 'mentoring_sessions_module_id_fkey'
  ) then
    alter table public.mentoring_sessions
      add constraint mentoring_sessions_module_id_fkey
      foreign key (module_id) references public.learning_modules(id)
      on delete set null;
  end if;
end
$$;

-- The mentor FK is attempted, not assumed. On an adopted table this can fail
-- legitimately — a row whose mentor no longer has a profile is old demo data,
-- not a reason to abort the migration. Report and carry on.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'mentoring_sessions'
      and constraint_name = 'mentoring_sessions_mentor_id_fkey'
  ) then
    begin
      alter table public.mentoring_sessions
        add constraint mentoring_sessions_mentor_id_fkey
        foreign key (mentor_id) references public.profiles(id) on delete cascade;
    exception when others then
      raise notice
        'mentoring_sessions.mentor_id could not be made a foreign key (%). '
        'Existing rows probably reference a missing profile. The table works; '
        'clean the orphans and re-run this migration to add the constraint.',
        sqlerrm;
    end;
  end if;
end
$$;

create index if not exists idx_mentoring_sessions_mentor
  on public.mentoring_sessions (mentor_id, created_at desc);
create index if not exists idx_mentoring_sessions_module
  on public.mentoring_sessions (module_id);


-- =========================================================================
-- 2. SHARE LINKS  (one mastered module, sent outside the app)
-- =========================================================================
create table if not exists public.mentor_share_links (
  id         uuid primary key default gen_random_uuid(),
  token      text not null unique,
  mentor_id  uuid not null references public.profiles(id) on delete cascade,
  module_id  uuid not null references public.learning_modules(id) on delete cascade,

  -- Revoking beats deleting: responses hang off this row, and a mentor pulling
  -- a link should not delete what people already sent them.
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.mentor_share_links is
  'A mentor sharing one module they completed, with someone who has no account. '
  'The token is the credential — it is the only thing the public functions '
  'accept, and no table here is readable by anon.';

create index if not exists idx_mentor_share_links_mentor
  on public.mentor_share_links (mentor_id, created_at desc);


-- =========================================================================
-- 3. SHARE RESPONSES  (their answer, and the mentor's personal reply)
-- =========================================================================
create table if not exists public.mentor_share_responses (
  id            uuid primary key default gen_random_uuid(),
  share_link_id uuid not null references public.mentor_share_links(id) on delete cascade,

  -- Handed to the recipient after they submit so they can come back for the
  -- reply. Separate from `id` so that holding one response's receipt never
  -- implies anything about any other row.
  receipt_token uuid not null unique default gen_random_uuid(),

  -- 'accurate'/'misleading' are Module 07's accuracy-framed answers, matching
  -- the check on module_attempts.learner_verdict.
  learner_verdict text check (
    learner_verdict in ('real', 'fake', 'accurate', 'misleading')
  ),
  learner_reasoning text,
  reason_chips      text[] not null default '{}',

  -- Optional, and optional on purpose: the share view asks for an email only so
  -- the recipient can be told a reply landed. Nothing requires it.
  recipient_email text,

  mentor_reply text,
  replied_at   timestamptz,

  created_at timestamptz not null default now(),

  -- A reply is text plus a timestamp, or neither. Half-set rows would make
  -- "is this still pending?" ambiguous in every query that asks.
  constraint reply_is_complete check (
    (mentor_reply is null and replied_at is null)
    or (mentor_reply is not null and replied_at is not null)
  )
);

comment on column public.mentor_share_responses.learner_reasoning is
  'Written by someone who is not a user of this app and never agreed to its '
  'terms. Visible to the mentor who owns the link and to nobody else.';

create index if not exists idx_mentor_share_responses_link
  on public.mentor_share_responses (share_link_id, created_at desc);
create index if not exists idx_mentor_share_responses_pending
  on public.mentor_share_responses (share_link_id)
  where mentor_reply is null;


-- =========================================================================
-- 4. ROW LEVEL SECURITY
-- =========================================================================
alter table public.mentoring_sessions      enable row level security;
alter table public.mentor_share_links      enable row level security;
alter table public.mentor_share_responses  enable row level security;

drop policy if exists "Mentors read their own sessions" on public.mentoring_sessions;
create policy "Mentors read their own sessions"
  on public.mentoring_sessions for select
  using (auth.uid() = mentor_id);

drop policy if exists "Mentors log their own sessions" on public.mentoring_sessions;
create policy "Mentors log their own sessions"
  on public.mentoring_sessions for insert
  with check (auth.uid() = mentor_id);

drop policy if exists "Mentors update their own sessions" on public.mentoring_sessions;
create policy "Mentors update their own sessions"
  on public.mentoring_sessions for update
  using (auth.uid() = mentor_id)
  with check (auth.uid() = mentor_id);

drop policy if exists "Mentors read their own share links" on public.mentor_share_links;
create policy "Mentors read their own share links"
  on public.mentor_share_links for select
  using (auth.uid() = mentor_id);

-- Insert goes through create_share_link(), which runs as the caller. The
-- completed-module check lives in that function; this policy is the ownership
-- half, so a hand-rolled insert still cannot forge someone else's link.
drop policy if exists "Mentors create their own share links" on public.mentor_share_links;
create policy "Mentors create their own share links"
  on public.mentor_share_links for insert
  with check (auth.uid() = mentor_id);

drop policy if exists "Mentors revoke their own share links" on public.mentor_share_links;
create policy "Mentors revoke their own share links"
  on public.mentor_share_links for update
  using (auth.uid() = mentor_id)
  with check (auth.uid() = mentor_id);

drop policy if exists "Mentors read responses to their links" on public.mentor_share_responses;
create policy "Mentors read responses to their links"
  on public.mentor_share_responses for select
  using (exists (
    select 1 from public.mentor_share_links l
    where l.id = share_link_id and l.mentor_id = auth.uid()
  ));

drop policy if exists "Mentors reply to their own responses" on public.mentor_share_responses;
create policy "Mentors reply to their own responses"
  on public.mentor_share_responses for update
  using (exists (
    select 1 from public.mentor_share_links l
    where l.id = share_link_id and l.mentor_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.mentor_share_links l
    where l.id = share_link_id and l.mentor_id = auth.uid()
  ));

-- Note the absence of any insert policy for responses. Recipients are anonymous
-- and submit through submit_share_response() below.


-- =========================================================================
-- 5. MENTOR-SIDE FUNCTION
-- =========================================================================
-- Security invoker: this must run as the mentor so auth.uid() is real and the
-- insert is checked by the policy above.
create or replace function public.create_share_link(p_module_id uuid)
returns text
language plpgsql
security invoker
as $$
declare
  v_token   text;
  v_status  public.module_progress_status;
  v_attempt integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  -- The rule, enforced where it cannot be skipped by calling the table
  -- directly: you may mentor a module you have completed. Only 'completed' —
  -- a penalty-free skip of Module 08 counts toward mentor eligibility, but it
  -- does not mean the learner can teach that module to someone else.
  select status into v_status
  from public.user_module_progress
  where user_id = auth.uid() and module_id = p_module_id;

  if v_status is distinct from 'completed' then
    raise exception
      'You can only share a module you have completed.'
      using errcode = 'check_violation';
  end if;

  -- Reuse the live link for this module rather than minting a second one, so a
  -- mentor who clicks Share twice does not split their replies across links.
  select token into v_token
  from public.mentor_share_links
  where mentor_id = auth.uid()
    and module_id = p_module_id
    and revoked_at is null
  order by created_at desc
  limit 1;

  if v_token is not null then
    return v_token;
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_token := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    begin
      insert into public.mentor_share_links (token, mentor_id, module_id)
      values (v_token, auth.uid(), p_module_id);
      return v_token;
    exception when unique_violation then
      if v_attempt >= 5 then
        raise;
      end if;
    end;
  end loop;
end;
$$;

comment on function public.create_share_link is
  'Mints (or reuses) a share link for a module the caller has completed. '
  'Returns the token to put in /teach/<token>.';


-- =========================================================================
-- 6. PUBLIC FUNCTIONS  (the anonymous recipient's entire surface)
-- =========================================================================
-- search_path is pinned on every security-definer function below. Without it a
-- caller could put a lookalike schema in front of `public` and have these run
-- against their own tables with the definer's rights.

-- What the recipient sees before judging.
--
-- The withheld columns are the point: no verdict, no signals, no rubric, no
-- reveal, and above all no canonical_reasoning. Handing those to the page would
-- put the answer in the network tab of the person being asked the question, and
-- would also make the mentor's personal reply pointless. This mirrors
-- RUNNER_COLUMNS in src/hooks/useModules.ts.
create or replace function public.get_share_link(p_token text)
returns table (
  module_slug      text,
  module_title     text,
  prompt_text      text,
  question_variant text,
  verdict_labels   jsonb,
  content_warning      boolean,
  content_warning_text text,
  mentor_name      text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    m.slug,
    m.title,
    m.prompt_text,
    m.question_variant,
    m.verdict_labels,
    m.content_warning,
    m.content_warning_text,
    coalesce(nullif(trim(p.full_name), ''), 'Your mentor')
  from public.mentor_share_links l
  join public.learning_modules m on m.id = l.module_id
  left join public.profiles p    on p.id = l.mentor_id
  where l.token = p_token
    and l.revoked_at is null
    and m.is_published;
$$;

-- The recipient's answer. Returns a receipt so they can come back for the reply
-- without an account.
create or replace function public.submit_share_response(
  p_token     text,
  p_verdict   text,
  p_reasoning text,
  p_chips     text[] default '{}',
  p_email     text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link_id uuid;
  v_receipt uuid;
begin
  select id into v_link_id
  from public.mentor_share_links
  where token = p_token and revoked_at is null;

  if v_link_id is null then
    raise exception 'This link is no longer active.'
      using errcode = 'no_data_found';
  end if;

  if p_verdict is not null
     and p_verdict not in ('real', 'fake', 'accurate', 'misleading') then
    raise exception 'Invalid verdict %', p_verdict
      using errcode = 'check_violation';
  end if;

  -- Bounded so an open endpoint cannot be used to write unbounded rows.
  if length(coalesce(p_reasoning, '')) > 2000 then
    raise exception 'Reasoning is too long (2000 characters max).'
      using errcode = 'check_violation';
  end if;

  if coalesce(array_length(p_chips, 1), 0) > 12 then
    raise exception 'Too many reason chips.' using errcode = 'check_violation';
  end if;

  insert into public.mentor_share_responses
    (share_link_id, learner_verdict, learner_reasoning, reason_chips, recipient_email)
  values
    (v_link_id, p_verdict, nullif(trim(coalesce(p_reasoning, '')), ''),
     coalesce(p_chips, '{}'), nullif(trim(coalesce(p_email, '')), ''))
  returning receipt_token into v_receipt;

  return v_receipt;
end;
$$;

-- Polled by the share page while the recipient waits for a reply.
create or replace function public.get_share_response(p_receipt uuid)
returns table (
  learner_verdict   text,
  learner_reasoning text,
  reason_chips      text[],
  mentor_reply      text,
  replied_at        timestamptz,
  module_title      text,
  mentor_name       text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    r.learner_verdict,
    r.learner_reasoning,
    r.reason_chips,
    r.mentor_reply,
    r.replied_at,
    m.title,
    coalesce(nullif(trim(p.full_name), ''), 'Your mentor')
  from public.mentor_share_responses r
  join public.mentor_share_links l on l.id = r.share_link_id
  join public.learning_modules m   on m.id = l.module_id
  left join public.profiles p      on p.id = l.mentor_id
  where r.receipt_token = p_receipt;
$$;

-- Default execute is granted to PUBLIC, which would include any future role.
-- Revoke first, then hand it back to exactly the two Supabase roles.
revoke all on function public.get_share_link(text)        from public;
revoke all on function public.submit_share_response(text, text, text, text[], text) from public;
revoke all on function public.get_share_response(uuid)    from public;
revoke all on function public.create_share_link(uuid)     from public;

-- `anon` and `authenticated` are created by Supabase, not by Postgres. The
-- offline test harness (PGlite) has neither, and a bare GRANT would abort the
-- migration there — so grant per role, only where the role exists.
do $$
declare
  r text;
  f text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      raise notice 'role % not present — skipping grants (offline test run?)', r;
      continue;
    end if;
    foreach f in array array[
      'public.get_share_link(text)',
      'public.submit_share_response(text, text, text, text[], text)',
      'public.get_share_response(uuid)'
    ] loop
      execute format('grant execute on function %s to %I', f, r);
    end loop;
  end loop;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.create_share_link(uuid) to authenticated';
  end if;
end
$$;


-- =========================================================================
-- 7. MENTORABLE MODULES
-- =========================================================================
-- The replacement for `completed_lessons >= 5`, in one place so the Mentor Hub,
-- the Learn tab's "You can mentor this" badge, and anything added later cannot
-- drift apart on what "mentorable" means.
create or replace view public.mentorable_modules
with (security_invoker = true) as
select
  p.user_id,
  m.id   as module_id,
  m.slug,
  m.title,
  m.format,
  m.difficulty,
  m.sequence_order,
  p.best_score,
  p.completed_at,
  (select l.token
     from public.mentor_share_links l
    where l.mentor_id = p.user_id
      and l.module_id = m.id
      and l.revoked_at is null
    order by l.created_at desc
    limit 1) as active_share_token
from public.user_module_progress p
join public.learning_modules m on m.id = p.module_id
where p.status = 'completed'
  and m.is_published;

comment on view public.mentorable_modules is
  'Modules a learner has completed and may therefore mentor. security_invoker '
  'means the underlying RLS applies, so a caller only ever sees their own rows.';


-- =========================================================================
-- 8. OPTIONAL: legacy progress backfill
-- =========================================================================
-- 0001_legacy_progress_rename.sql parks the pre-module-system progress table at
-- user_module_progress_legacy rather than dropping it. That table keyed modules
-- by slug text and tracked `completed_lessons`, a per-module lesson counter the
-- finalized system does not have.
--
-- This is NOT run automatically, because "completed_lessons >= 5" meant lessons
-- inside a module, and reading it as "this module is complete" is a guess about
-- someone else's data. Inspect the legacy table first, then call this by hand if
-- the mapping is right for your environment:
--
--     select * from public.backfill_legacy_module_progress();
--
-- It only ever inserts rows that are absent, so it is safe to run twice.
create or replace function public.backfill_legacy_module_progress()
returns table (legacy_module text, action text)
language plpgsql
as $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_module_progress_legacy'
  ) then
    return query select null::text, 'no legacy table present — nothing to do'::text;
    return;
  end if;

  return query
  with legacy as (
    select l.user_id, l.module_id as slug, l.completed_lessons
    from public.user_module_progress_legacy l
    where l.completed_lessons >= 5
  ),
  resolved as (
    select legacy.user_id, legacy.slug, m.id as module_id
    from legacy
    join public.learning_modules m on m.slug = legacy.slug
  ),
  inserted as (
    insert into public.user_module_progress (user_id, module_id, status, completed_at)
    select r.user_id, r.module_id, 'completed', now()
    from resolved r
    on conflict (user_id, module_id) do nothing
    returning module_id
  )
  select r.slug,
         case when exists (select 1 from inserted i where i.module_id = r.module_id)
              then 'backfilled as completed'
              else 'skipped — progress already recorded'
         end
  from resolved r;
end;
$$;
