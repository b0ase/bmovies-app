-- Safe Supabase Schema for NPGX Platform
-- Database: fthpedywgwpygrfqliqf.supabase.co
-- Ticker: $NPGX
-- This version uses IF NOT EXISTS to avoid conflicts with existing tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core NPGX Characters table
CREATE TABLE IF NOT EXISTS npgx_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  personality_traits JSONB DEFAULT '{}',
  physical_attributes JSONB DEFAULT '{}',
  age INTEGER CHECK (age >= 18),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  creator_id UUID,
  token_symbol VARCHAR(20),
  token_address VARCHAR(255),
  blockchain VARCHAR(50) DEFAULT 'ethereum'
);

-- Name variants for NPGX Characters
CREATE TABLE IF NOT EXISTS name_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  npgx_character_id UUID REFERENCES npgx_characters(id) ON DELETE CASCADE,
  variant_name VARCHAR(100) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Outfits and clothing options
CREATE TABLE IF NOT EXISTS outfits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  npgx_character_id UUID REFERENCES npgx_characters(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  style_tags TEXT[],
  image_url TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locations where NPGX characters can be placed
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  location_type VARCHAR(50), -- 'indoor', 'outdoor', 'studio', etc.
  background_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accessories for NPGX characters
CREATE TABLE IF NOT EXISTS accessories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  accessory_type VARCHAR(50), -- 'jewelry', 'props', 'makeup', etc.
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated images tracking
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  npgx_character_id UUID REFERENCES npgx_characters(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  prompt TEXT,
  generation_params JSONB DEFAULT '{}',
  provider VARCHAR(50), -- 'stability', 'leonardo', 'replicate'
  cost_usd DECIMAL(10,4),
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT false,
  user_id UUID
);

-- Video content for NPGX Characters
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  npgx_character_id UUID REFERENCES npgx_characters(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title VARCHAR(200),
  description TEXT,
  duration_seconds INTEGER,
  video_type VARCHAR(50), -- 'intro', 'dance', 'conversation', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT false,
  user_id UUID
);

-- Voice samples and audio
CREATE TABLE IF NOT EXISTS voices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  npgx_character_id UUID REFERENCES npgx_characters(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  text_content TEXT,
  voice_type VARCHAR(50), -- 'greeting', 'conversation', 'flirty', etc.
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sound effects library
CREATE TABLE IF NOT EXISTS sound_effects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  audio_url TEXT NOT NULL,
  category VARCHAR(50), -- 'ambient', 'reaction', 'music', etc.
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Background music tracks
CREATE TABLE IF NOT EXISTS music_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  artist VARCHAR(100),
  audio_url TEXT NOT NULL,
  genre VARCHAR(50),
  mood VARCHAR(50), -- 'romantic', 'energetic', 'chill', etc.
  duration_seconds INTEGER,
  is_royalty_free BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social media profiles for NPGX Characters
CREATE TABLE IF NOT EXISTS social_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  npgx_character_id UUID REFERENCES npgx_characters(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'instagram', 'tiktok', 'onlyfans', etc.
  username VARCHAR(100),
  profile_url TEXT,
  follower_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social media links and Linktree management
CREATE TABLE IF NOT EXISTS social_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  npgx_character_id UUID REFERENCES npgx_characters(id) ON DELETE CASCADE,
  link_title VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  platform VARCHAR(50),
  click_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blockchain wallet addresses
CREATE TABLE IF NOT EXISTS wallet_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  npgx_character_id UUID REFERENCES npgx_characters(id) ON DELETE CASCADE,
  blockchain VARCHAR(50) NOT NULL, -- 'ethereum', 'solana', 'bitcoin', etc.
  address VARCHAR(255) NOT NULL,
  is_multisig BOOLEAN DEFAULT false,
  multisig_threshold INTEGER,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Multisig wallet signers
CREATE TABLE IF NOT EXISTS multisig_signers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallet_addresses(id) ON DELETE CASCADE,
  signer_address VARCHAR(255) NOT NULL,
  signer_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Affiliate marketing programs
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  npgx_character_id UUID REFERENCES npgx_characters(id) ON DELETE CASCADE,
  program_name VARCHAR(100) NOT NULL,
  affiliate_url TEXT NOT NULL,
  commission_rate DECIMAL(5,2), -- percentage
  product_category VARCHAR(100),
  target_demographic VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Brand partnerships and sponsorships
CREATE TABLE IF NOT EXISTS brand_partnerships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  npgx_character_id UUID REFERENCES npgx_characters(id) ON DELETE CASCADE,
  brand_name VARCHAR(100) NOT NULL,
  partnership_type VARCHAR(50), -- 'sponsorship', 'affiliate', 'collaboration'
  contract_value DECIMAL(12,2),
  start_date DATE,
  end_date DATE,
  deliverables JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Target audience segments
CREATE TABLE IF NOT EXISTS target_audiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  age_range VARCHAR(20), -- '18-25', '26-35', etc.
  gender VARCHAR(20),
  interests TEXT[],
  spending_power VARCHAR(50),
  platforms TEXT[], -- preferred social platforms
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Revenue tracking
CREATE TABLE IF NOT EXISTS revenue_streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ai_girlfriend_id UUID REFERENCES ai_girlfriends(id) ON DELETE CASCADE,
  revenue_type VARCHAR(50) NOT NULL, -- 'subscription', 'tips', 'affiliate', 'sponsorship'
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  platform VARCHAR(50),
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform expenses tracking
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_category VARCHAR(100) NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  billing_cycle VARCHAR(20), -- 'monthly', 'yearly', 'one-time'
  expense_date DATE NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token economics and pricing
CREATE TABLE IF NOT EXISTS token_economics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ai_girlfriend_id UUID REFERENCES ai_girlfriends(id) ON DELETE CASCADE,
  token_symbol VARCHAR(20) NOT NULL,
  total_supply BIGINT,
  current_price DECIMAL(18,8),
  market_cap DECIMAL(18,2),
  holder_count INTEGER DEFAULT 0,
  blockchain VARCHAR(50) NOT NULL,
  contract_address VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User accounts and authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE,
  full_name VARCHAR(200),
  avatar_url TEXT,
  subscription_tier VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- User-owned AI girlfriends
CREATE TABLE IF NOT EXISTS user_girlfriends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ai_girlfriend_id UUID REFERENCES ai_girlfriends(id) ON DELETE CASCADE,
  ownership_type VARCHAR(50) DEFAULT 'creator', -- 'creator', 'subscriber', 'token_holder'
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, ai_girlfriend_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_npgx_characters_slug ON npgx_characters(slug);
CREATE INDEX IF NOT EXISTS idx_npgx_characters_token_symbol ON npgx_characters(token_symbol);
CREATE INDEX IF NOT EXISTS idx_generated_images_npgx_character ON generated_images(npgx_character_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_user ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_social_profiles_platform ON social_profiles(platform);
CREATE INDEX IF NOT EXISTS idx_wallet_addresses_blockchain ON wallet_addresses(blockchain);
CREATE INDEX IF NOT EXISTS idx_revenue_streams_date ON revenue_streams(transaction_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(expense_category);
CREATE INDEX IF NOT EXISTS idx_token_economics_symbol ON token_economics(token_symbol);

-- Enable Row Level Security (RLS)
ALTER TABLE npgx_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_girlfriends ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public NPGX characters are viewable by everyone" ON npgx_characters;
DROP POLICY IF EXISTS "Users can view their own generated images" ON generated_images;
DROP POLICY IF EXISTS "Users can insert their own generated images" ON generated_images;

-- Create new policies
CREATE POLICY "Public NPGX characters are viewable by everyone"
ON npgx_characters FOR SELECT
USING (is_active = true);

CREATE POLICY "Users can view their own generated images" 
ON generated_images FOR SELECT 
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert their own generated images" 
ON generated_images FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Insert some demo NPGX characters
INSERT INTO npgx_characters (name, slug, description, age, token_symbol, blockchain) VALUES
('Luna', 'luna', 'A mysterious and alluring NPGX character with a passion for technology', 22, 'LUNA', 'ethereum'),
('Aria', 'aria', 'Sweet and caring NPGX character who loves music and art', 24, 'ARIA', 'ethereum'),
('Zara', 'zara', 'Confident and ambitious NPGX character with a love for adventure', 25, 'ZARA', 'ethereum'),
('Nova', 'nova', 'Intelligent and witty NPGX character who enjoys deep conversations', 23, 'NOVA', 'ethereum'),
('Raven', 'raven', 'Edgy and creative NPGX character with a dark sense of humor', 26, 'RAVEN', 'ethereum')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample target audiences
INSERT INTO target_audiences (name, description, age_range, gender, interests, spending_power, platforms) VALUES
('Lonely Males 18-35', 'Primary demographic for AI girlfriend content', '18-35', 'male', ARRAY['gaming', 'anime', 'technology', 'adult content'], 'medium-high', ARRAY['reddit', 'discord', 'twitter', 'onlyfans']),
('Tech Enthusiasts', 'Early adopters interested in AI technology', '25-45', 'mixed', ARRAY['AI', 'crypto', 'technology', 'innovation'], 'high', ARRAY['twitter', 'linkedin', 'youtube']),
('Crypto Investors', 'People interested in token investments', '20-50', 'mixed', ARRAY['cryptocurrency', 'defi', 'nfts', 'investing'], 'high', ARRAY['twitter', 'telegram', 'discord'])
ON CONFLICT DO NOTHING;

-- Insert sample expense categories for tracking
INSERT INTO expenses (expense_category, service_name, amount, billing_cycle, expense_date, description, is_recurring) VALUES
('AI Generation', 'Stability AI', 29.99, 'monthly', CURRENT_DATE, 'Image generation API', true),
('Hosting', 'Vercel Pro', 20.00, 'monthly', CURRENT_DATE, 'Website hosting and deployment', true),
('Database', 'Supabase Pro', 25.00, 'monthly', CURRENT_DATE, 'Database and authentication', true),
('Storage', 'Cloudinary', 99.00, 'monthly', CURRENT_DATE, 'Image and video storage', true),
('Analytics', 'Mixpanel', 89.00, 'monthly', CURRENT_DATE, 'User analytics and tracking', true)
ON CONFLICT DO NOTHING;

-- Comments explaining the schema
COMMENT ON DATABASE postgres IS 'NPGX Platform - Next-generation virtual character platform with $NPGX token integration';
COMMENT ON TABLE npgx_characters IS 'Core table storing NPGX character profiles and metadata';
COMMENT ON TABLE generated_images IS 'Tracks all AI-generated images for NPGX characters with associated costs';
COMMENT ON TABLE videos IS 'Video content library for NPGX characters including promotional and interactive videos';
COMMENT ON TABLE voices IS 'Audio samples and voice clips for NPGX characters';
COMMENT ON TABLE social_profiles IS 'Social media presence tracking for NPGX characters across platforms';
COMMENT ON TABLE social_links IS 'Linktree-style social media links for NPGX characters';
COMMENT ON TABLE affiliates IS 'Affiliate marketing program integrations for monetization';
COMMENT ON TABLE brand_partnerships IS 'Brand sponsorship and partnership tracking with revenue metrics and costs';
COMMENT ON TABLE wallet_addresses IS 'Multi-blockchain wallet addresses for token management'; 