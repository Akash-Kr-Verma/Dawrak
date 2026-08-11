-- Add username to profiles for MILPill onboarding

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username text;

-- Existing users should skip onboarding, so we use their full_name as a fallback
UPDATE public.profiles
SET username = full_name
WHERE username IS NULL AND full_name IS NOT NULL;
