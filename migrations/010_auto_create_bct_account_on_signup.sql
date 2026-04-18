-- Migration 010: auto-create bct_accounts row on every new auth.users signup.
--
-- Problem this fixes: the existing handle_new_user() trigger only inserts
-- into public.user_profiles. Email-signup users therefore never got a
-- bct_accounts row, and every downstream endpoint that resolves the user
-- through bct_accounts (api/checkout, api/studio/create, api/feature/start,
-- /account dashboard film list) would either 403 or show zero state.
--
-- The BRC-100 wallet path already has a best-effort insert in
-- src/app/api/auth/brc100/verify/route.ts (line 250), but email signups
-- skip that path entirely — they go through Supabase's native magic-link
-- flow which only fires the DB trigger.
--
-- Fix: extend handle_new_user() to ALSO upsert into bct_accounts. ON
-- CONFLICT DO NOTHING keeps the trigger safe for users who already have
-- a row (e.g. from the BRC-100 insert) so re-running this migration or
-- re-triggering on existing users is a no-op.
--
-- Then: one-shot backfill for every auth.users row that currently has no
-- bct_accounts match. Idempotent — the NOT EXISTS clause is the guard.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Legacy: user_profiles row (kept for backward compatibility with
  -- pre-bMovies code paths that still read from this table).
  INSERT INTO public.user_profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;

  -- bMovies: bct_accounts row (the canonical owner ref for every
  -- commission, studio, agent hire, royalty holding, and KYC record).
  -- display_name falls back to the email's local part so the /account
  -- dashboard always has something human-readable to show.
  INSERT INTO public.bct_accounts (auth_user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (auth_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill every existing auth.users row that doesn't yet have a
-- bct_accounts partner. Idempotent — re-running is a no-op.
INSERT INTO public.bct_accounts (auth_user_id, email, display_name)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    split_part(u.email, '@', 1)
  )
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.bct_accounts a WHERE a.auth_user_id = u.id
)
ON CONFLICT (auth_user_id) DO NOTHING;
