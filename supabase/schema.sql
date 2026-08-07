-- supabase/schema.sql
-- Database Schema for "Play Your Part" Media and Information Literacy (MIL) App

-- Enable extensions
create extension if not exists "uuid-ossp";

-- =========================================================================
-- 1. PROFILES TABLE
-- =========================================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  total_points integer default 0 check (total_points >= 0),
  level integer default 1 check (level >= 1),
  created_at timestamp with time zone default now()
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

-- RLS Policies for profiles
create policy "Allow public read access to profiles"
  on public.profiles for select
  using (true);

create policy "Allow users to update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger to automatically create a profile after user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New Member'),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =========================================================================
-- 2. SCENARIOS TABLE
-- =========================================================================
create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body_context text,
  category text not null check (category in ('source_checking', 'deepfake', 'phishing', 'emotional_manipulation')),
  media_url text,
  verdict text not null check (verdict in ('real', 'fake')),
  is_community_submitted boolean default false,
  submitted_by_profile_id uuid references public.profiles(id) on delete set null,
  reports_count integer default 0 check (reports_count >= 0),
  is_hidden boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable RLS for scenarios
alter table public.scenarios enable row level security;

-- RLS Policies for scenarios
create policy "Allow public read access to non-hidden scenarios"
  on public.scenarios for select
  using (not is_hidden or auth.uid() = submitted_by_profile_id);

create policy "Allow authenticated users to insert scenarios"
  on public.scenarios for insert
  with check (auth.role() = 'authenticated');

create policy "Allow users to update their own submitted scenarios"
  on public.scenarios for update
  using (auth.uid() = submitted_by_profile_id)
  with check (auth.uid() = submitted_by_profile_id);

-- Trigger to automatically hide scenarios with 3 or more flags/reports
create or replace function public.check_reports_count()
returns trigger as $$
begin
  if new.reports_count >= 3 then
    new.is_hidden := true;
  else
    new.is_hidden := false;
  end if;
  return new;
end;
$$ language plpgsql;

create or replace trigger trigger_check_reports_count
  before insert or update of reports_count on public.scenarios
  for each row execute procedure public.check_reports_count();


-- =========================================================================
-- 3. ATTEMPTS TABLE
-- =========================================================================
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  scenario_id uuid references public.scenarios(id) on delete cascade not null,
  user_reasoning text not null,
  ai_score integer default 0 check (ai_score between 0 and 100),
  created_at timestamp with time zone default now()
);

-- Enable RLS for attempts
alter table public.attempts enable row level security;

-- RLS Policies for attempts
create policy "Allow public read access to attempts"
  on public.attempts for select
  using (true);

create policy "Allow users to record their own attempts"
  on public.attempts for insert
  with check (auth.uid() = user_id);


-- =========================================================================
-- 4. TAUGHT SESSIONS TABLE
-- =========================================================================
create table public.taught_sessions (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid references public.profiles(id) on delete cascade not null,
  scenario_id uuid references public.scenarios(id) on delete cascade not null,
  student_name text not null,
  proof_url text,
  visitor_explanation text,
  verified boolean default true,
  completed_at timestamp with time zone default now()
);

-- Enable RLS for taught_sessions
alter table public.taught_sessions enable row level security;

-- RLS Policies for taught_sessions
create policy "Allow public read access to taught sessions"
  on public.taught_sessions for select
  using (true);

create policy "Allow mentors to log sessions"
  on public.taught_sessions for insert
  with check (auth.uid() = mentor_id);
