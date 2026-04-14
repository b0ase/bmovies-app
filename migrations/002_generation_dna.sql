-- Generation DNA — Recursive IP Inscription System
-- Each generation extends a "tape" from its parent, building an immutable lineage chain.

CREATE TABLE IF NOT EXISTS npgx_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES npgx_generations(id),
  root_id UUID NOT NULL,
  character_slug TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video', 'music', 'magazine')),
  prompt TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  content_url TEXT NOT NULL,
  creator_address TEXT,
  attestation_txid TEXT,
  cost INTEGER NOT NULL DEFAULT 1,
  model TEXT NOT NULL DEFAULT 'unknown',
  provider TEXT NOT NULL DEFAULT 'unknown',
  width INTEGER NOT NULL DEFAULT 1024,
  height INTEGER NOT NULL DEFAULT 1536,
  duration REAL,
  tape JSONB NOT NULL DEFAULT '[]'::jsonb,
  tape_depth INTEGER NOT NULL DEFAULT 1,
  inscription_payload JSONB,
  platform_share INTEGER NOT NULL DEFAULT 0,
  creator_share INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_generations_root ON npgx_generations(root_id);
CREATE INDEX IF NOT EXISTS idx_generations_parent ON npgx_generations(parent_id);
CREATE INDEX IF NOT EXISTS idx_generations_slug ON npgx_generations(character_slug);
CREATE INDEX IF NOT EXISTS idx_generations_creator ON npgx_generations(creator_address);
CREATE INDEX IF NOT EXISTS idx_generations_hash ON npgx_generations(content_hash);
CREATE INDEX IF NOT EXISTS idx_generations_created ON npgx_generations(created_at DESC);

-- Enable RLS
ALTER TABLE npgx_generations ENABLE ROW LEVEL SECURITY;

-- Public read access — all generations are visible (NFTs are public)
CREATE POLICY "generations_public_read" ON npgx_generations
  FOR SELECT USING (true);

-- Insert for authenticated users or anonymous (server-side via anon key)
CREATE POLICY "generations_insert" ON npgx_generations
  FOR INSERT WITH CHECK (true);
