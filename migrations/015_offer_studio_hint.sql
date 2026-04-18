-- 015_offer_studio_hint.sql
--
-- Add an optional 'studio' column to bct_offers. When a commissioner
-- picks a studio at commission time (Bolt Disney, 21st Century Bot,
-- Clanker Bros, Dreamforge, NeuralScope, Paramountal AI) the chosen
-- studio's aesthetic is injected into the style bible prompt so the
-- generated film carries that studio's tonal DNA.
--
-- Nullable — commissioner can skip the picker and get a studio-agnostic
-- production. Text, not a FK, so removing a studio in the future doesn't
-- cascade-delete old offers.
--
-- Idempotent — safe to re-apply.

ALTER TABLE bct_offers
  ADD COLUMN IF NOT EXISTS studio TEXT;

CREATE INDEX IF NOT EXISTS bct_offers_studio_idx ON bct_offers (studio)
  WHERE studio IS NOT NULL;
