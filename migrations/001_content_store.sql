-- NPGX Unified Content Store
CREATE TABLE IF NOT EXISTS npgx_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'script', 'song', 'magazine', 'card', 'production')),
  title TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'done', 'error')),
  url TEXT,
  data JSONB,
  prompt TEXT,
  cost NUMERIC(10,4) NOT NULL DEFAULT 0,
  production_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_npgx_content_slug ON npgx_content(slug);
CREATE INDEX idx_npgx_content_type ON npgx_content(type);
CREATE INDEX idx_npgx_content_production ON npgx_content(production_id) WHERE production_id IS NOT NULL;
CREATE INDEX idx_npgx_content_created ON npgx_content(created_at DESC);

CREATE TABLE IF NOT EXISTS npgx_productions (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'done', 'error')),
  format TEXT NOT NULL DEFAULT 'short-film',
  brief TEXT,
  items TEXT[] DEFAULT '{}',
  total_cost NUMERIC(10,4) NOT NULL DEFAULT 0,
  errors TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_npgx_productions_slug ON npgx_productions(slug);
