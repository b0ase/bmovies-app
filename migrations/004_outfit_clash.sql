-- NPGX Outfit Clash — Card Inventory, Players, Matches
-- Migration 004: Game economy tables

-- ── Player Profiles ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS npgx_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL UNIQUE,              -- HandCash handle or local ID
  display_name TEXT,
  avatar_url TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0,
  total_losses INTEGER NOT NULL DEFAULT 0,
  total_draws INTEGER NOT NULL DEFAULT 0,
  character_mastery JSONB NOT NULL DEFAULT '{}',   -- { "aria-voidstrike": 5, "luna-cyberblade": 12 }
  daily_challenge_date TEXT,                        -- ISO date of last daily challenge completed
  weekly_progress INTEGER NOT NULL DEFAULT 0,       -- 0-5 daily challenges this week
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_players_handle ON npgx_players(handle);
CREATE INDEX IF NOT EXISTS idx_players_level ON npgx_players(level DESC);
CREATE INDEX IF NOT EXISTS idx_players_wins ON npgx_players(total_wins DESC);

-- ── Card Inventory ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS npgx_card_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_handle TEXT NOT NULL,                       -- HandCash handle
  card_id TEXT NOT NULL,                            -- catalogue card ID (e.g. "top-corset")
  instance_id UUID NOT NULL DEFAULT gen_random_uuid(), -- unique instance (same card can exist multiple times)
  rarity TEXT NOT NULL,                             -- common/uncommon/rare/epic/legendary
  acquired_via TEXT NOT NULL DEFAULT 'pack',        -- pack_starter/pack_booster/pack_premium/pack_legendary/trade/battle_win/daily
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pack_tx_id TEXT,                                  -- HandCash transaction ID (if bought)
  is_locked BOOLEAN NOT NULL DEFAULT false,         -- locked during active battle stake
  listed_price_sats INTEGER,                        -- if listed on marketplace (NULL = not listed)
  metadata JSONB DEFAULT '{}',
  CONSTRAINT fk_inventory_owner FOREIGN KEY (owner_handle) REFERENCES npgx_players(handle) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inventory_owner ON npgx_card_inventory(owner_handle);
CREATE INDEX IF NOT EXISTS idx_inventory_card ON npgx_card_inventory(card_id);
CREATE INDEX IF NOT EXISTS idx_inventory_rarity ON npgx_card_inventory(rarity);
CREATE INDEX IF NOT EXISTS idx_inventory_listed ON npgx_card_inventory(listed_price_sats) WHERE listed_price_sats IS NOT NULL;

-- ── Match History ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS npgx_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id TEXT NOT NULL,                       -- challenge card ID
  stake_level TEXT NOT NULL DEFAULT 'casual',       -- casual/ante/high_stakes
  player_a_handle TEXT NOT NULL,
  player_b_handle TEXT,                             -- NULL for AI opponent
  player_a_character TEXT NOT NULL,                 -- character slug
  player_b_character TEXT NOT NULL,
  player_a_score INTEGER NOT NULL,
  player_b_score INTEGER NOT NULL,
  winner TEXT NOT NULL,                             -- 'a' / 'b' / 'draw'
  player_a_loadout JSONB NOT NULL,                  -- full loadout snapshot
  player_b_loadout JSONB NOT NULL,
  player_a_synergies JSONB,                         -- synergy bonuses triggered
  player_b_synergies JSONB,
  ai_difficulty TEXT,                               -- easy/medium/hard/boss (NULL if PvP)
  xp_awarded_a INTEGER NOT NULL DEFAULT 0,
  xp_awarded_b INTEGER NOT NULL DEFAULT 0,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matches_player_a ON npgx_matches(player_a_handle);
CREATE INDEX IF NOT EXISTS idx_matches_player_b ON npgx_matches(player_b_handle);
CREATE INDEX IF NOT EXISTS idx_matches_played ON npgx_matches(played_at DESC);

-- ── Card Trades ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS npgx_card_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_instance_id UUID NOT NULL,
  seller_handle TEXT NOT NULL,
  buyer_handle TEXT,                                -- NULL until purchased
  price_sats INTEGER NOT NULL,
  tx_id TEXT,                                       -- HandCash transaction ID
  platform_fee_sats INTEGER NOT NULL DEFAULT 0,     -- 5% platform cut
  status TEXT NOT NULL DEFAULT 'listed',             -- listed/sold/cancelled
  listed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trades_seller ON npgx_card_trades(seller_handle);
CREATE INDEX IF NOT EXISTS idx_trades_status ON npgx_card_trades(status) WHERE status = 'listed';
CREATE INDEX IF NOT EXISTS idx_trades_card ON npgx_card_trades(card_instance_id);

-- ── Functions ──────────────────────────────────────────────────────────────

-- Auto-update updated_at on player profile changes
CREATE OR REPLACE FUNCTION update_player_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_player_updated ON npgx_players;
CREATE TRIGGER trg_player_updated
  BEFORE UPDATE ON npgx_players
  FOR EACH ROW EXECUTE FUNCTION update_player_timestamp();

-- Calculate player level from XP (100 XP per level)
CREATE OR REPLACE FUNCTION calc_player_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN GREATEST(1, FLOOR(xp / 100.0)::INTEGER + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
