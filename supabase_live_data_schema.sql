-- Live Data Schema for NPGX Platform
-- Run this in your Supabase SQL editor

-- Table for live ninja punk girl rankings
CREATE TABLE IF NOT EXISTS ninja_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ticker TEXT UNIQUE NOT NULL, -- e.g., $RAVEN, $CYBER
  slug TEXT UNIQUE NOT NULL, -- URL-friendly version
  image_url TEXT,
  category TEXT NOT NULL, -- 'Elite Assassin', 'Cyber Warrior', etc.
  verified BOOLEAN DEFAULT false,
  
  -- Performance Metrics
  current_rank INTEGER NOT NULL DEFAULT 0,
  previous_rank INTEGER DEFAULT 0,
  rank_change INTEGER DEFAULT 0, -- calculated field: current - previous
  
  -- Financial Data
  market_cap DECIMAL(15,2) DEFAULT 0,
  volume_24h DECIMAL(15,2) DEFAULT 0,
  price DECIMAL(10,4) DEFAULT 0,
  price_change_24h DECIMAL(5,2) DEFAULT 0, -- percentage
  liquidity DECIMAL(15,2) DEFAULT 0,
  cost DECIMAL(10,2) DEFAULT 0,
  holders INTEGER DEFAULT 0,
  
  -- Engagement Metrics
  total_views BIGINT DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  unique_fans INTEGER DEFAULT 0,
  content_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_price_update TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for live ticker tape messages
CREATE TABLE IF NOT EXISTS ticker_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_text TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('alert', 'price', 'news', 'update')),
  color_class TEXT, -- CSS class for color (e.g., 'text-punk-electric')
  priority INTEGER DEFAULT 1, -- 1-5, higher = more important
  is_active BOOLEAN DEFAULT true,
  
  -- Auto-generated or manual
  is_auto_generated BOOLEAN DEFAULT false,
  source_type TEXT, -- 'price_change', 'rank_change', 'volume_spike', 'manual'
  source_id UUID, -- reference to ninja_rankings.id if applicable
  
  -- Display settings
  display_duration INTEGER DEFAULT 300, -- seconds to show (5 minutes default)
  max_displays INTEGER DEFAULT 100, -- how many times to show before retiring
  current_displays INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  last_displayed TIMESTAMP WITH TIME ZONE
);

-- Table for live market data (for $NPGX token)
CREATE TABLE IF NOT EXISTS market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL DEFAULT 'NPGX',
  price DECIMAL(10,6) NOT NULL,
  price_change_24h DECIMAL(5,2) DEFAULT 0,
  volume_24h DECIMAL(15,2) DEFAULT 0,
  market_cap DECIMAL(15,2) DEFAULT 0,
  circulating_supply BIGINT DEFAULT 0,
  total_supply BIGINT DEFAULT 0,
  
  -- Platform metrics
  total_users INTEGER DEFAULT 0,
  active_users_24h INTEGER DEFAULT 0,
  total_characters_created INTEGER DEFAULT 0,
  characters_created_24h INTEGER DEFAULT 0,
  total_revenue_24h DECIMAL(15,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking ninja performance history
CREATE TABLE IF NOT EXISTS ninja_performance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ninja_id UUID REFERENCES ninja_rankings(id) ON DELETE CASCADE,
  rank_position INTEGER NOT NULL,
  market_cap DECIMAL(15,2),
  volume_24h DECIMAL(15,2),
  price DECIMAL(10,4),
  total_views BIGINT,
  total_revenue DECIMAL(15,2),
  unique_fans INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ninja_rankings_rank ON ninja_rankings(current_rank);
CREATE INDEX IF NOT EXISTS idx_ninja_rankings_ticker ON ninja_rankings(ticker);
CREATE INDEX IF NOT EXISTS idx_ninja_rankings_category ON ninja_rankings(category);
CREATE INDEX IF NOT EXISTS idx_ninja_rankings_updated ON ninja_rankings(updated_at);

CREATE INDEX IF NOT EXISTS idx_ticker_active ON ticker_messages(is_active, priority DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticker_type ON ticker_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_ticker_expires ON ticker_messages(expires_at);

CREATE INDEX IF NOT EXISTS idx_market_data_created ON market_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_ninja_time ON ninja_performance_history(ninja_id, recorded_at DESC);

-- Function to automatically update rank changes
CREATE OR REPLACE FUNCTION update_rank_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate rank change
  NEW.rank_change = COALESCE(NEW.previous_rank, NEW.current_rank) - NEW.current_rank;
  NEW.updated_at = NOW();
  
  -- Insert into performance history
  INSERT INTO ninja_performance_history (
    ninja_id, rank_position, market_cap, volume_24h, price, 
    total_views, total_revenue, unique_fans
  ) VALUES (
    NEW.id, NEW.current_rank, NEW.market_cap, NEW.volume_24h, NEW.price,
    NEW.total_views, NEW.total_revenue, NEW.unique_fans
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update rank changes
DROP TRIGGER IF EXISTS trigger_update_rank_changes ON ninja_rankings;
CREATE TRIGGER trigger_update_rank_changes
  BEFORE UPDATE ON ninja_rankings
  FOR EACH ROW
  EXECUTE FUNCTION update_rank_changes();

-- Function to auto-generate ticker messages from data changes
CREATE OR REPLACE FUNCTION generate_ticker_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate ticker for significant rank changes
  IF ABS(NEW.rank_change) >= 5 THEN
    INSERT INTO ticker_messages (
      message_text,
      message_type,
      color_class,
      priority,
      is_auto_generated,
      source_type,
      source_id
    ) VALUES (
      CASE 
        WHEN NEW.rank_change > 0 THEN 
          NEW.name || ' climbs ' || NEW.rank_change || ' ranks to #' || NEW.current_rank || ' 📈'
        ELSE 
          NEW.name || ' drops ' || ABS(NEW.rank_change) || ' ranks to #' || NEW.current_rank || ' 📉'
      END,
      'news',
      CASE WHEN NEW.rank_change > 0 THEN 'text-punk-electric' ELSE 'text-punk-blood' END,
      CASE WHEN ABS(NEW.rank_change) >= 10 THEN 4 ELSE 3 END,
      true,
      'rank_change',
      NEW.id
    );
  END IF;
  
  -- Generate ticker for price changes > 10%
  IF ABS(NEW.price_change_24h) >= 10 THEN
    INSERT INTO ticker_messages (
      message_text,
      message_type,
      color_class,
      priority,
      is_auto_generated,
      source_type,
      source_id
    ) VALUES (
      NEW.ticker || ': $' || NEW.price || ' (' || 
      CASE WHEN NEW.price_change_24h > 0 THEN '+' ELSE '' END ||
      NEW.price_change_24h || '%) ' ||
      CASE WHEN NEW.price_change_24h > 0 THEN '🚀' ELSE '💥' END,
      'price',
      CASE WHEN NEW.price_change_24h > 0 THEN 'text-punk-electric' ELSE 'text-punk-blood' END,
      4,
      true,
      'price_change',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticker messages
DROP TRIGGER IF EXISTS trigger_generate_ticker ON ninja_rankings;
CREATE TRIGGER trigger_generate_ticker
  AFTER UPDATE ON ninja_rankings
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticker_message();

-- Function to clean up expired ticker messages
CREATE OR REPLACE FUNCTION cleanup_expired_tickers()
RETURNS void AS $$
BEGIN
  DELETE FROM ticker_messages 
  WHERE expires_at < NOW() 
     OR (max_displays > 0 AND current_displays >= max_displays);
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE ninja_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticker_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ninja_performance_history ENABLE ROW LEVEL SECURITY;

-- Public read access for rankings and ticker data
CREATE POLICY "Public read access for ninja rankings" ON ninja_rankings
  FOR SELECT USING (true);

CREATE POLICY "Public read access for ticker messages" ON ticker_messages
  FOR SELECT USING (is_active = true AND expires_at > NOW());

CREATE POLICY "Public read access for market data" ON market_data
  FOR SELECT USING (true);

CREATE POLICY "Public read access for performance history" ON ninja_performance_history
  FOR SELECT USING (true);

-- Admin insert/update policies (you'll need to set up admin roles)
CREATE POLICY "Admin can manage ninja rankings" ON ninja_rankings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = current_setting('app.current_user_id', true)
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin can manage ticker messages" ON ticker_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = current_setting('app.current_user_id', true)
      AND role = 'admin'
    )
  );

-- Comments for documentation
COMMENT ON TABLE ninja_rankings IS 'Live rankings data for Ninja Punk Girls';
COMMENT ON TABLE ticker_messages IS 'Real-time ticker tape messages';
COMMENT ON TABLE market_data IS 'Live market data for $NPGX token and platform metrics';
COMMENT ON TABLE ninja_performance_history IS 'Historical performance tracking for analytics';

COMMENT ON COLUMN ninja_rankings.rank_change IS 'Calculated: previous_rank - current_rank (positive = moved up)';
COMMENT ON COLUMN ticker_messages.priority IS '1-5 scale, higher = more important, affects display order';
COMMENT ON COLUMN ticker_messages.display_duration IS 'How long to show this message in seconds'; 