-- NPGX $NPGX Staking Tables
-- Supports: $NPGX staking, KYC-gated dividend distribution

-- 1. NPGX Staking Positions
-- Tracks each $NPGX stake (immutable log of staking activity)
CREATE TABLE IF NOT EXISTS npgx_stakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_handle TEXT NOT NULL,
  staking_address TEXT NOT NULL, -- BSV address where $NPGX was staked
  amount_npgx BIGINT NOT NULL, -- Amount of $NPGX staked (in satoshis)
  status TEXT NOT NULL DEFAULT 'active', -- active, unstaking, unstaked

  -- Staking timeline
  staked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unstaking_started_at TIMESTAMPTZ,
  unstaked_at TIMESTAMPTZ,

  -- Dividend tracking
  total_dividends_paid_sat BIGINT DEFAULT 0, -- cumulative dividends claimed (in sats)
  last_dividend_claim_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB, -- arbitrary data (staking campaign, notes, etc.)

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_npgx_stakes_user_handle ON npgx_stakes(user_handle);
CREATE INDEX idx_npgx_stakes_status ON npgx_stakes(status);
CREATE INDEX idx_npgx_stakes_staking_address ON npgx_stakes(staking_address);

-- 2. Member Registry
-- Tracks KYC status and dividend payment details for each verified staker
CREATE TABLE IF NOT EXISTS npgx_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_handle TEXT NOT NULL UNIQUE,

  -- Identity linkage
  bit_sign_identity_id TEXT, -- Reference to bit_sign_identities.id (from bit-sign project)

  -- KYC Status
  kyc_status TEXT DEFAULT 'unverified', -- unverified, pending, verified, rejected
  kyc_provider TEXT, -- 'veriff', others
  kyc_session_id TEXT, -- Veriff session ID or equivalent
  kyc_verified_at TIMESTAMPTZ,

  -- Identity details (from Veriff after approval)
  first_name TEXT,
  last_name TEXT,
  date_of_birth TEXT,
  document_type TEXT,
  document_country TEXT,

  -- Email & notifications
  email TEXT,
  email_verified_at TIMESTAMPTZ,
  email_notifications_enabled BOOLEAN DEFAULT TRUE,

  -- Dividend payment address
  bsv_address TEXT, -- BSV address for receiving dividend payments
  bsv_address_verified_at TIMESTAMPTZ,

  -- Staking summary (denormalized for quick query)
  total_npgx_staked BIGINT DEFAULT 0, -- current total staked
  active_stake_count INT DEFAULT 0, -- number of active stakes
  total_dividends_received_sat BIGINT DEFAULT 0, -- cumulative from all stakes

  -- Preferences
  dividend_payment_method TEXT DEFAULT 'bsv', -- bsv, account_credit
  auto_claim_dividends BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_npgx_members_user_handle ON npgx_members(user_handle);
CREATE INDEX idx_npgx_members_kyc_status ON npgx_members(kyc_status);
CREATE INDEX idx_npgx_members_bsv_address ON npgx_members(bsv_address);
CREATE INDEX idx_npgx_members_email ON npgx_members(email);

-- 3. Dividend Distribution Log
-- Immutable record of all dividend calculations and distributions
CREATE TABLE IF NOT EXISTS npgx_dividend_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Distribution batch
  batch_id TEXT NOT NULL, -- e.g., "dividend-2026-03-q1"
  batch_number INT NOT NULL, -- ordinal number of this distribution

  -- Source
  source_amount_sat BIGINT NOT NULL, -- Total BSV available for distribution (in sats)
  source_reference TEXT, -- e.g., "content-revenue-Q1-2026"

  -- Snapshot used for calculation
  snapshot_block_height INT,
  snapshot_timestamp TIMESTAMPTZ NOT NULL,

  -- Recipients
  total_recipients INT NOT NULL, -- number of verified stakers who received a payment
  total_distributed_sat BIGINT NOT NULL, -- total amount actually distributed
  undistributed_sat BIGINT DEFAULT 0, -- amount that couldn't be distributed (rounding, invalid addresses, etc.)

  -- Status
  status TEXT DEFAULT 'calculated', -- calculated, approved, pending_execution, executed, failed
  executed_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_npgx_dividend_distributions_batch_id ON npgx_dividend_distributions(batch_id);
CREATE INDEX idx_npgx_dividend_distributions_status ON npgx_dividend_distributions(status);
CREATE INDEX idx_npgx_dividend_distributions_snapshot_timestamp ON npgx_dividend_distributions(snapshot_timestamp);

-- 4. Dividend Allocation (per member)
-- Individual allocation record for each member in a distribution batch
CREATE TABLE IF NOT EXISTS npgx_dividend_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  distribution_id UUID NOT NULL REFERENCES npgx_dividend_distributions(id),
  user_handle TEXT NOT NULL,
  bsv_address TEXT NOT NULL,

  -- Calculation
  total_npgx_staked_at_snapshot BIGINT NOT NULL, -- NPGX amount at snapshot time
  allocation_percentage NUMERIC(10, 8), -- e.g., 0.05000000 = 5%
  amount_allocated_sat BIGINT NOT NULL, -- allocated amount in sats

  -- Payment status
  payment_status TEXT DEFAULT 'pending', -- pending, sent, confirmed, failed
  payment_txid TEXT, -- BSV transaction ID if sent
  payment_sent_at TIMESTAMPTZ,
  payment_confirmed_at TIMESTAMPTZ,

  -- Fallback
  fallback_claimed BOOLEAN DEFAULT FALSE,
  fallback_claimed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_npgx_dividend_allocations_distribution_id ON npgx_dividend_allocations(distribution_id);
CREATE INDEX idx_npgx_dividend_allocations_user_handle ON npgx_dividend_allocations(user_handle);
CREATE INDEX idx_npgx_dividend_allocations_payment_status ON npgx_dividend_allocations(payment_status);

-- 5. Dividend Claims (user self-service)
-- Allows members to claim allocations that were not automatically sent
CREATE TABLE IF NOT EXISTS npgx_dividend_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  allocation_id UUID NOT NULL REFERENCES npgx_dividend_allocations(id),
  user_handle TEXT NOT NULL,

  -- Claim details
  status TEXT DEFAULT 'pending', -- pending, approved, sent, rejected
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,

  -- Payment
  payment_txid TEXT,
  payment_sent_at TIMESTAMPTZ,
  payment_confirmed_at TIMESTAMPTZ,

  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_npgx_dividend_claims_user_handle ON npgx_dividend_claims(user_handle);
CREATE INDEX idx_npgx_dividend_claims_status ON npgx_dividend_claims(status);

-- 6. Staking Revenue Pool
-- Tracks incoming revenue designated for dividend distribution
CREATE TABLE IF NOT EXISTS npgx_revenue_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source_type TEXT NOT NULL, -- 'content_sales', 'magazine_sales', 'ticket_redemption', etc.
  source_reference TEXT, -- reference to the source transaction

  amount_sat BIGINT NOT NULL, -- amount in sats
  amount_usd NUMERIC(12, 2), -- amount in USD (for reporting)

  status TEXT DEFAULT 'pending', -- pending, allocated, distributed
  allocated_to_distribution_id UUID REFERENCES npgx_dividend_distributions(id),

  -- Source transaction
  source_txid TEXT,
  source_payment_address TEXT,

  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_npgx_revenue_pool_status ON npgx_revenue_pool(status);
CREATE INDEX idx_npgx_revenue_pool_created_at ON npgx_revenue_pool(created_at);

-- 7. KYC Sessions (Veriff integration)
-- Tracks Veriff verification sessions and decisions
CREATE TABLE IF NOT EXISTS npgx_kyc_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_handle TEXT NOT NULL,
  veriff_session_id TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending', -- pending, approved, declined
  veriff_response JSONB,
  decision_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_npgx_kyc_sessions_user_handle ON npgx_kyc_sessions(user_handle);
CREATE INDEX idx_npgx_kyc_sessions_status ON npgx_kyc_sessions(status);
CREATE INDEX idx_npgx_kyc_sessions_veriff_session_id ON npgx_kyc_sessions(veriff_session_id);

-- RBAC (for dashboard queries)
GRANT SELECT ON npgx_stakes TO authenticated;
GRANT SELECT ON npgx_members TO authenticated;
GRANT SELECT ON npgx_dividend_distributions TO authenticated;
GRANT SELECT ON npgx_dividend_allocations TO authenticated;
GRANT SELECT ON npgx_revenue_pool TO authenticated;

GRANT SELECT, INSERT, UPDATE ON npgx_stakes TO service_role;
GRANT SELECT, INSERT, UPDATE ON npgx_members TO service_role;
GRANT SELECT, INSERT, UPDATE ON npgx_dividend_distributions TO service_role;
GRANT SELECT, INSERT, UPDATE ON npgx_dividend_allocations TO service_role;
GRANT SELECT, INSERT, UPDATE ON npgx_dividend_claims TO service_role;
GRANT SELECT, INSERT, UPDATE ON npgx_revenue_pool TO service_role;
GRANT SELECT, INSERT, UPDATE ON npgx_kyc_sessions TO service_role;
