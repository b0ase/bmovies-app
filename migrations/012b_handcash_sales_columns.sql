-- 012b: Follow-on to 012_handcash_link.
--
-- The callback / buy-shares paths need to persist the settlement
-- provider + on-chain tx on bct_share_sales and
-- bct_platform_investments. The existing schemas only have
-- Stripe-shaped columns (stripe_session_id). Add provider-agnostic
-- settlement columns so HandCash / BRC-100 receipts fit cleanly.

ALTER TABLE bct_share_sales
  ADD COLUMN IF NOT EXISTS settlement_provider text,
  ADD COLUMN IF NOT EXISTS settlement_tx_id    text;

CREATE INDEX IF NOT EXISTS bct_share_sales_provider_idx
  ON bct_share_sales (settlement_provider, created_at DESC)
  WHERE settlement_provider IS NOT NULL;

ALTER TABLE bct_platform_investments
  ADD COLUMN IF NOT EXISTS settlement_provider text;
