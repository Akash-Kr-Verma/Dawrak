-- supabase/migrations/0001_legacy_progress_rename.sql
--
-- RUN THIS BEFORE 0002_learning_modules.sql.
--
-- Why this file exists
-- --------------------
-- Some environments already contain a hand-made `user_module_progress` table
-- that predates the module system. The Learn page queried it before the real
-- schema existed (see the note at the top of section 2 in 0002). That legacy
-- table has the shape:
--
--     id, user_id (uuid), module_id (TEXT), updated_at
--
-- while 0002 expects `module_id uuid references learning_modules(id)` plus
-- status / best_score / attempts_count / completed_at / skipped_without_penalty.
--
-- 0002 creates that table with `create table if not exists`. Against a database
-- holding the legacy table, that statement is a no-op: the migration reports
-- success, the Learn tab starts rendering all 10 modules, and the breakage moves
-- somewhere much less obvious — the first write of a learner's progress, which
-- hits a text/uuid mismatch and a foreign key that was never created.
--
-- So the legacy table is moved aside rather than left to absorb the no-op.
--
-- Renaming, not dropping: the row count visible to the anon role is 0, but RLS
-- can hide other users' rows, so this preserves whatever is actually in there.
-- To undo, rename it back.
--
-- Indexes are renamed with it. `alter table ... rename` leaves index and
-- constraint names untouched, and those names are schema-scoped — a retained
-- `user_module_progress_pkey` collides with the primary key 0002 creates, and a
-- retained `idx_user_module_progress_user` silently satisfies 0002's
-- `create index if not exists` so the new table never gets its index.
--
-- Idempotent, and safe on a database that never had the legacy table: the guard
-- keys on the absence of the `status` column, so this is a no-op both before the
-- legacy table exists and after 0002 has created the correct one.

do $$
declare
  r record;
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name   = 'user_module_progress'
  ) then
    raise notice '0001: no user_module_progress table present — nothing to do.';
    return;
  end if;

  -- `status` is the cheapest column that exists only in the 0002 shape.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'user_module_progress'
      and column_name  = 'status'
  ) then
    raise notice '0001: user_module_progress already has the 0002 shape — nothing to do.';
    return;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name   = 'user_module_progress_legacy'
  ) then
    raise exception
      'user_module_progress_legacy already exists. A previous run of this file '
      'moved a legacy table aside; resolve that table by hand before re-running '
      'so this does not overwrite it.';
  end if;

  alter table public.user_module_progress
    rename to user_module_progress_legacy;

  -- Take the indexes (and the constraints they back) along with the table, so
  -- none of their names are left behind to collide with 0002.
  for r in
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and tablename  = 'user_module_progress_legacy'
      and indexname not like '%\_legacy'
  loop
    execute format(
      'alter index public.%I rename to %I',
      r.indexname, r.indexname || '_legacy'
    );
  end loop;

  raise notice
    '0001: moved legacy user_module_progress aside to user_module_progress_legacy. '
    'Its rows are preserved. 0002 will now create the correct table.';
end
$$;
