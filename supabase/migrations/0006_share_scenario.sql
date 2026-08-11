-- supabase/migrations/0006_share_scenario.sql
-- Play Your Part — let the recipient of a shared module see the actual
-- scenario, not a written description of it.
--
-- Run after 0003_mentoring.sql.
--
-- WHAT THIS CHANGES
--
-- `get_share_link` returned only the framing: title, prompt_text, the two
-- verdict labels and the content warning. So someone opening /teach/<token>
-- read a paragraph *about* a scam and was then asked to judge it. The whole
-- point of these modules is that you look at the thing itself — the SMS, the
-- portal, the listing, the call — and notice what is wrong with it. A summary
-- hands over the noticing, which is the skill being taught.
--
-- This adds the three columns that carry the scenario itself:
--
--   render_spec     which engine runs, and the screens it walks through
--   content_blocks  the content those screens render
--   call_script     the branching call, for Modules 03 and 08
--
-- plus `format`, so the page can pick the right engine.
--
-- WHAT IS STILL WITHHELD, AND WHY
--
-- Everything that answers the question. `verdict`, `signals`, `rubric`,
-- `distractors`, `canonical_reasoning` and `reveal` are not here and must not
-- be added: the recipient is being asked to judge, and the reply they get is a
-- person's. Putting the answer in the network tab would defeat both.
--
-- These three columns are exactly the set an authenticated learner already
-- receives before judging — RUNNER_COLUMNS in src/hooks/useModules.ts — so this
-- grants an anonymous recipient no more than a signed-in learner has, and the
-- boundary stays in one place rather than two.
--
-- One tightening on top of that. `call_script.behaviouralOutcomes` carries the
-- feedback lines for what the learner DID during the call ("you ended the call
-- — that was the right move"). The recipient flow never grades behaviour: their
-- feedback is the mentor's reply, written by hand. Those strings are stripped
-- here rather than shipped and ignored. The array is left present but empty,
-- which is what the call engine expects — it only ever filters over it.

-- The return type changes, so the old signature has to go first. Dropping
-- revokes its grants too; they are re-issued at the bottom.
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
    coalesce(nullif(trim(p.full_name), ''), 'Your mentor')
  from public.mentor_share_links l
  join public.learning_modules m on m.id = l.module_id
  left join public.profiles p    on p.id = l.mentor_id
  where l.token = p_token
    and l.revoked_at is null
    and m.is_published;
$$;

comment on function public.get_share_link is
  'Everything an anonymous recipient needs to run a shared module and judge it '
  '— the same set a signed-in learner gets before judging. Never the answer: '
  'verdict, signals, rubric, distractors, canonical_reasoning and reveal are '
  'withheld, and the call script''s behavioural feedback lines are stripped.';

-- Default execute is granted to PUBLIC on create, which would include any
-- future role. Revoke, then hand it back to exactly the Supabase roles that
-- had it before the drop.
revoke all on function public.get_share_link(text) from public;

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      raise notice 'role % not present — skipping grant (offline test run?)', r;
      continue;
    end if;
    execute format('grant execute on function public.get_share_link(text) to %I', r);
  end loop;
end
$$;
