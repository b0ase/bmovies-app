-- 014_agent_multichain.sql
--
-- Phase 3A — every agent in bct_agents gets a Solana (ed25519) and
-- EVM (secp256k1) address alongside its BSV address, derived from a
-- single encrypted 32-byte master seed. Custody defaults to
-- platform-held (hybrid model: owner can claim later via wallet
-- signature in Phase 3C).
--
-- Seed storage: AES-256-GCM encrypted with AGENT_SEED_KEY env var.
-- key_seed_key_version lets us rotate the encryption key later without
-- losing access to old seeds.
--
-- Idempotent — columns only added if not present. Safe to re-apply.
--
-- Followed by scripts/derive-agent-addresses.ts which populates
-- solana_address + evm_address + key_seed_enc for every existing row.

ALTER TABLE bct_agents
  ADD COLUMN IF NOT EXISTS solana_address        TEXT,
  ADD COLUMN IF NOT EXISTS evm_address           TEXT,
  ADD COLUMN IF NOT EXISTS key_seed_enc          TEXT,
  ADD COLUMN IF NOT EXISTS key_seed_key_version  INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS custody_model         TEXT    DEFAULT 'platform',
  ADD COLUMN IF NOT EXISTS claimed_by_account_id BIGINT,
  ADD COLUMN IF NOT EXISTS claimed_at            TIMESTAMPTZ;

-- custody_model accepted values:
--   'platform'  — platform holds the seed, signs on agent's behalf (default)
--   'owner'     — owner has claimed, platform seed is deactivated, signatures
--                 come from the owner's connected wallet (Phantom / MetaMask)
--   'revoked'   — neither — agent is retired from autonomous action
ALTER TABLE bct_agents
  DROP CONSTRAINT IF EXISTS bct_agents_custody_model_check;
ALTER TABLE bct_agents
  ADD  CONSTRAINT bct_agents_custody_model_check
  CHECK (custody_model IN ('platform', 'owner', 'revoked'));

CREATE INDEX IF NOT EXISTS bct_agents_solana_addr_idx ON bct_agents (solana_address);
CREATE INDEX IF NOT EXISTS bct_agents_evm_addr_idx    ON bct_agents (evm_address);
CREATE INDEX IF NOT EXISTS bct_agents_claimed_by_idx  ON bct_agents (claimed_by_account_id);
