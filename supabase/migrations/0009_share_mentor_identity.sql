-- supabase/migrations/0009_share_mentor_identity.sql
-- Dawrak — give the person on the other end of a share link a face and the
-- right name.
--
-- Run after 0006_share_scenario.sql and 0008_mentor_leaderboard.sql (the
-- display-name helper lives in 0008).
--
-- TWO THINGS ARE WRONG TODAY, AND BOTH ARE ON THE PUBLIC SIDE
--
-- 1. No avatar. `/teach/<token>` opens with "<name> wants to share something
--    they learned with you" above a circle holding one letter, because the
--    picture was never in the payload — the page had nothing to render. This
--    is the first screen anybody outside Dawrak ever sees, and it is asking
--    them to spend a minute on a stranger's say-so. A real face is the
--    difference between a person asking and a form asking.
--
-- 2. The wrong name. `get_share_link` read `full_name` alone, so a mentor who
--    chose a handle at onboarding was announced by whatever `handle_new_user`
--    stamped on them — for several live accounts, literally "New Member".
--    `mentor_display_name` (0008) is the one place that decides what a user is
--    called when someone else is looking, and it prefers the chosen handle,
--    skips the placeholders, and never falls back to an email address.
--
-- WHAT IS EXPOSED, AND WHY THAT IS SAFE
--
-- `profiles.avatar_url` is a path under /assets/avatars/ that the mentor picked
-- at onboarding, in a table that is already world-readable ("Allow public read
-- access to profiles" in schema.sql). It identifies nobody: it is one of eight
-- stock pictures. Nothing else is added to either payload — no email, no id, no
-- second profile column — and the answer key stays withheld exactly as before.
--
-- Both functions have to be dropped rather than replaced: the return type
-- changes, and CREATE OR REPLACE cannot do that. Dropping revokes their grants,
-- so those are re-issued at the bottom.

-- =========================================================================
-- 1. WHAT THE RECIPIENT SEES BEFORE JUDGING
-- =========================================================================
drop function if exists public.get_share_link(text);

create or replace function public.get_share_link(p_token text)
returns table (
  module_slug      text,
  module_title     text,
  format           public.module_format,
  prompt_text      text,
  question_variant text,
  verdict_labels   jsonb,
  render_spec      jsonb,
  content_blocks   jsonb,
  call_script      jsonb,
  content_warning      boolean,
  content_warning_text text,
  mentor_name       text,
  mentor_avatar_url text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    m.slug,
    m.title,
    m.format,
    m.prompt_text,
    m.question_variant,
    m.verdict_labels,
    m.render_spec,
    m.content_blocks,
    case
      when m.call_script is null then null
      else jsonb_set(m.call_script, '{behaviouralOutcomes}', '[]'::jsonb, true)
    end,
    m.content_warning,
    m.content_warning_text,
    public.mentor_display_name(p.username, p.full_name),
    nullif(trim(coalesce(p.avatar_url, '')), '')
  from public.mentor_share_links l
  join public.learning_modules m on m.id = l.module_id
  left join public.profiles p    on p.id = l.mentor_id
  where l.token = p_token
    and l.revoked_at is null
    and m.is_published;
$$;

comment on function public.get_share_link is
  'Everything an anonymous recipient needs to run a shared module and judge it '
  '— the same set a signed-in learner gets before judging, plus the mentor''s '
  'name and stock avatar. Never the answer: verdict, signals, rubric, '
  'distractors, canonical_reasoning and reveal are withheld, and the call '
  'script''s behavioural feedback lines are stripped.';


-- =========================================================================
-- 2. WHAT THEY SEE WHEN THE REPLY LANDS
-- =========================================================================
-- Same face on both screens. A reply that arrives under a different name or a
-- blank circle reads as a system message, which is the one thing this flow is
-- not.
drop function if exists public.get_share_response(uuid);

create or replace function public.get_share_response(p_receipt uuid)
returns table (
  learner_verdict   text,
  learner_reasoning text,
  reason_chips      text[],
  mentor_reply      text,
  replied_at        timestamptz,
  module_title      text,
  mentor_name       text,
  mentor_avatar_url text
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
    public.mentor_display_name(p.username, p.full_name),
    nullif(trim(coalesce(p.avatar_url, '')), '')
  from public.mentor_share_responses r
  join public.mentor_share_links l on l.id = r.share_link_id
  join public.learning_modules m   on m.id = l.module_id
  left join public.profiles p      on p.id = l.mentor_id
  where r.receipt_token = p_receipt;
$$;

comment on function public.get_share_response is
  'The recipient''s own submission and the mentor''s personal reply, fetched '
  'with the receipt they were handed. Reachable only by whoever holds that '
  'receipt.';


-- =========================================================================
-- 3. GRANTS
-- =========================================================================
-- Both functions were dropped, so their grants went with them. Revoke from
-- PUBLIC (the create-time default) and hand execute back to the two Supabase
-- roles that had it — anon included here, unlike the leaderboard: the entire
-- point of this flow is that the recipient has no account.
revoke all on function public.get_share_link(text)     from public;
revoke all on function public.get_share_response(uuid) from public;

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
      'public.get_share_response(uuid)'
    ] loop
      execute format('grant execute on function %s to %I', f, r);
    end loop;
  end loop;
end
$$;
