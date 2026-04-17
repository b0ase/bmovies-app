-- 012: HandCash wallet linking
--
-- Stores the HandCash OAuth authToken + paymail handle on bct_accounts
-- so users can execute server-side wallet.pay() calls via the
-- @handcash/handcash-connect SDK for securities-class purchases
-- (royalty shares, platform tokens). This is additive — it does NOT
-- change Google/Twitter/Supabase auth, does NOT touch bct_user_kyc,
-- and does NOT replace any existing wallet linking pattern.
--
-- Security posture:
--   - authToken is a long-lived credential granting PAY permission.
--   - Column accessible only by service_role; anon + authenticated
--     can SELECT the boolean-ish handcash_authed_at to know whether
--     a link exists, but cannot read the token itself.
--   - Users revoke by clearing the column (endpoint pending).

ALTER TABLE bct_accounts ADD COLUMN IF NOT EXISTS handcash_auth_token text;
ALTER TABLE bct_accounts ADD COLUMN IF NOT EXISTS handcash_authed_at   timestamptz;
ALTER TABLE bct_accounts ADD COLUMN IF NOT EXISTS handcash_handle      text;

-- A public view that exposes only the boolean signal (is the account
-- HandCash-linked?) without leaking the token. Read from this on the
-- client; never from the raw table.
CREATE OR REPLACE VIEW bct_accounts_wallet_status AS
  SELECT
    id,
    auth_user_id,
    (handcash_authed_at IS NOT NULL) AS handcash_linked,
    handcash_authed_at,
    handcash_handle,
    wallet_address
  FROM bct_accounts;

GRANT SELECT ON bct_accounts_wallet_status TO anon, authenticated, service_role;

-- Do NOT grant column-level access to handcash_auth_token on the base
-- table. The existing RLS policies on bct_accounts already restrict
-- writes to service_role; reads for anon/authenticated only return
-- the columns they have been granted, which excludes handcash_auth_token.
--
-- If policies need tightening further, add a column-exclusion grant
-- in a follow-up migration.

-- State-tracking table for pending HandCash purchases (the OAuth
-- callback looks up the intended buy by state param).
CREATE TABLE IF NOT EXISTS bct_handcash_pending (
  state           text         PRIMARY KEY,
  account_id      uuid         NOT NULL REFERENCES bct_accounts(id) ON DELETE CASCADE,
  intent          text         NOT NULL CHECK (intent IN ('link_only', 'buy_shares', 'buy_platform')),
  offer_id        text,
  price_usd       numeric(10, 2),
  return_url      text,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  expires_at      timestamptz  NOT NULL DEFAULT (now() + interval '10 minutes'),
  consumed_at     timestamptz
);

CREATE INDEX IF NOT EXISTS bct_handcash_pending_account_idx
  ON bct_handcash_pending (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bct_handcash_pending_expiry_idx
  ON bct_handcash_pending (expires_at)
  WHERE consumed_at IS NULL;

ALTER TABLE bct_handcash_pending ENABLE ROW LEVEL SECURITY;
CREATE POLICY "handcash_pending_service_all" ON bct_handcash_pending
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON bct_handcash_pending TO service_role;
