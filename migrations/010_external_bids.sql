-- 010: External agent bidding + on-chain reputation
--
-- Exposes the job market to any BSV wallet that can BRC-77 (BSM) sign a
-- canonical bid payload. Bids land in the same bct_bids table as the
-- internal swarm's bids and compete for the same jobs — the signature
-- is the proof of authorship, the pubkey is the identity.
--
-- Reputation is tracked per-pubkey and signed by the platform key when
-- a delivery completes. The signed attestation is persisted here and
-- (in a follow-up) mirrored to an OP_RETURN on-chain so third parties
-- can verify a pubkey's track record without trusting our database.

-- ─── bct_agents: flag external agents + store their pubkey ─────
ALTER TABLE bct_agents ADD COLUMN IF NOT EXISTS is_external boolean NOT NULL DEFAULT false;
ALTER TABLE bct_agents ADD COLUMN IF NOT EXISTS pubkey text;
ALTER TABLE bct_agents ADD COLUMN IF NOT EXISTS jobs_failed integer NOT NULL DEFAULT 0;

-- Pubkey index: external agents are looked up by pubkey on every bid.
CREATE UNIQUE INDEX IF NOT EXISTS bct_agents_pubkey_idx
  ON bct_agents (pubkey)
  WHERE pubkey IS NOT NULL;

CREATE INDEX IF NOT EXISTS bct_agents_external_idx
  ON bct_agents (created_at DESC)
  WHERE is_external = true;

-- The role check on bct_agents currently only allows platform roles
-- (producer, writer, director, ...). External bidders fill those same
-- roles — they don't need a new constraint.

-- ─── bct_bids: signature + signed payload + tx hook ────────────
ALTER TABLE bct_bids ADD COLUMN IF NOT EXISTS signature text;
ALTER TABLE bct_bids ADD COLUMN IF NOT EXISTS signed_payload_hash text;
ALTER TABLE bct_bids ADD COLUMN IF NOT EXISTS delivery_seconds integer;
ALTER TABLE bct_bids ADD COLUMN IF NOT EXISTS is_external boolean NOT NULL DEFAULT false;
ALTER TABLE bct_bids ADD COLUMN IF NOT EXISTS bid_timestamp bigint;

CREATE INDEX IF NOT EXISTS bct_bids_external_idx
  ON bct_bids (created_at DESC)
  WHERE is_external = true;

-- ─── bct_reputation_attestations ──────────────────────────────
--
-- Platform-signed receipts of a completed job. Written atomically with
-- the job transition from 'review' -> 'completed'. Each row is the
-- authoritative record of "this pubkey delivered job X on date Y."
-- attestation_txid is filled later by a sweeper that writes these as
-- OP_RETURN to BSV mainnet. Queryable by pubkey for reputation lookups.
CREATE TABLE IF NOT EXISTS bct_reputation_attestations (
  id                 text         PRIMARY KEY,
  pubkey             text         NOT NULL,
  agent_id           text         NOT NULL REFERENCES bct_agents(id),
  job_id             text         NOT NULL REFERENCES bct_jobs(id),
  outcome            text         NOT NULL CHECK (outcome IN ('completed', 'failed')),
  delivered_at       timestamptz  NOT NULL DEFAULT now(),
  attestation_json   text         NOT NULL,
  platform_signature text         NOT NULL,
  platform_pubkey    text         NOT NULL,
  attestation_txid   text,
  created_at         timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bct_reputation_pubkey_idx
  ON bct_reputation_attestations (pubkey, delivered_at DESC);
CREATE INDEX IF NOT EXISTS bct_reputation_unmirrored_idx
  ON bct_reputation_attestations (created_at DESC)
  WHERE attestation_txid IS NULL;

ALTER TABLE bct_reputation_attestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rep_attestations_public_read" ON bct_reputation_attestations
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rep_attestations_service_all" ON bct_reputation_attestations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON bct_reputation_attestations TO anon, authenticated;
GRANT ALL    ON bct_reputation_attestations TO service_role;

-- ─── Reputation view ──────────────────────────────────────────
-- Public read of agent track record, computed from attestations.
CREATE OR REPLACE VIEW bct_agent_reputation AS
  SELECT
    a.id                                    AS agent_id,
    a.pubkey,
    a.name,
    a.is_external,
    a.jobs_completed,
    a.jobs_failed,
    CASE
      WHEN (a.jobs_completed + a.jobs_failed) = 0 THEN 0
      ELSE ROUND(100.0 * a.jobs_completed / (a.jobs_completed + a.jobs_failed), 1)
    END                                     AS success_pct,
    a.total_earned_sats,
    a.reputation                            AS reputation_score,
    a.created_at
  FROM bct_agents a;

GRANT SELECT ON bct_agent_reputation TO anon, authenticated, service_role;
