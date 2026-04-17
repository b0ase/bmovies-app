-- 007: Add is_swarm flag to bct_offers
--
-- The streaming swarm (pnpm agents:swarm) auto-creates offers with
-- id prefix 'offer-' for its producer/financier tick loops. These are
-- synthetic volume — platform-owned keys on both sides, used to drive
-- the BSVA TX target during the hackathon. They are NOT real user
-- commissions and must not appear on public pages (exchange, watch,
-- productions, index hero carousel).
--
-- Public pages already filter by status IN ('published', 'auto_published',
-- 'released'), which catches most swarm offers (they rarely progress
-- past 'funded'). This column is belt-and-braces: an explicit label
-- so the smell test is obvious from the schema, not derived from an
-- id-prefix convention.

ALTER TABLE bct_offers ADD COLUMN IF NOT EXISTS is_swarm boolean NOT NULL DEFAULT false;

-- Backfill: any historical offer with id prefix 'offer-' was
-- swarm-generated. Flip the flag.
UPDATE bct_offers SET is_swarm = true WHERE id LIKE 'offer-%' AND is_swarm = false;

-- Index for the public-page filter (is_swarm = false).
CREATE INDEX IF NOT EXISTS bct_offers_not_swarm_idx
  ON bct_offers (created_at DESC)
  WHERE is_swarm = false;
