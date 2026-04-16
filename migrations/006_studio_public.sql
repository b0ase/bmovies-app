-- 006: Add is_public toggle to bct_studios
-- Studios default to private. Platform-founded studios are public.
-- Users toggle visibility from their /account page.

ALTER TABLE bct_studios ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Platform-founded studios (no owner) should be public by default
UPDATE bct_studios SET is_public = true WHERE owner_account_id IS NULL;
-- User studios that have been upgraded (created_by = 'user') start public
UPDATE bct_studios SET is_public = true WHERE created_by = 'user';
