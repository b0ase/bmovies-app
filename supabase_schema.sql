-- NPGX PLATFORM - COMPREHENSIVE DATABASE SCHEMA
-- Created: 2025-01-21
-- Description: Complete database structure for NPGX platform
-- Database: fthpedywgwpygrfqliqf.supabase.co
-- Ticker: $NPGX

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USER PROFILES TABLE
-- =============================================

-- User profiles table to store additional user information
CREATE TABLE user_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    display_name VARCHAR(100),
    username VARCHAR(50) UNIQUE,
    bio TEXT,
    avatar_url TEXT,
    website_url TEXT,
    location VARCHAR(100),
    subscription_tier VARCHAR(20) DEFAULT 'free', -- free, pro, enterprise
    total_earnings DECIMAL(12,2) DEFAULT 0,
    total_npgx_characters INTEGER DEFAULT 0,
    total_content_created INTEGER DEFAULT 0,
    total_followers INTEGER DEFAULT 0,
    platforms_connected INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_active_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- CORE AI GIRLFRIEND TABLES
-- =============================================

-- Main NPGX Characters table
CREATE TABLE npgx_characters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    age INTEGER CHECK (age >= 18 AND age <= 35),
    personality TEXT,
    bio TEXT,
    hair_color VARCHAR(50),
    eye_color VARCHAR(50),
    ethnicity VARCHAR(50),
    body_type VARCHAR(50),
    height VARCHAR(20),
    location VARCHAR(100),
    interests TEXT[],
    relationship_status VARCHAR(50),
    occupation VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_premium BOOLEAN DEFAULT false,
    popularity_score INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Name variants for each NPGX character
CREATE TABLE name_variants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    npgx_character_id UUID REFERENCES npgx_characters(id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL,
    nickname VARCHAR(50),
    use_frequency INTEGER DEFAULT 1, -- How often to use this variant
    context VARCHAR(100), -- When to use this name (social, intimate, professional)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Outfits and clothing options
CREATE TABLE outfits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- casual, formal, lingerie, swimwear, etc.
    description TEXT,
    style_tags TEXT[],
    season VARCHAR(20), -- spring, summer, fall, winter, all
    occasion VARCHAR(50), -- date, workout, beach, office, etc.
    color_scheme VARCHAR(50),
    is_premium BOOLEAN DEFAULT false,
    cost_to_generate DECIMAL(8,4) DEFAULT 0,
    popularity_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Outfit variants (different colors, styles of same outfit)
CREATE TABLE outfit_variants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    outfit_id UUID REFERENCES outfits(id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL,
    color VARCHAR(50),
    material VARCHAR(50),
    fit VARCHAR(30), -- tight, loose, regular
    style_modifier VARCHAR(100), -- shorter, longer, cropped, etc.
    additional_cost DECIMAL(8,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Locations and settings
CREATE TABLE locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- indoor, outdoor, fantasy, etc.
    description TEXT,
    mood VARCHAR(50), -- romantic, cozy, energetic, mysterious
    lighting VARCHAR(50), -- natural, studio, neon, candlelit
    style VARCHAR(50), -- modern, vintage, minimalist, luxury
    is_premium BOOLEAN DEFAULT false,
    cost_to_generate DECIMAL(8,4) DEFAULT 0,
    popularity_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Location variants
CREATE TABLE location_variants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL,
    time_of_day VARCHAR(20), -- morning, afternoon, evening, night
    weather VARCHAR(30), -- sunny, cloudy, rainy, snowy
    season VARCHAR(20),
    crowd_level VARCHAR(20), -- empty, busy, intimate
    additional_details TEXT,
    additional_cost DECIMAL(8,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Accessories and props
CREATE TABLE accessories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- jewelry, tech, sports, lifestyle
    description TEXT,
    style VARCHAR(50),
    color VARCHAR(50),
    brand VARCHAR(50),
    is_premium BOOLEAN DEFAULT false,
    cost_to_generate DECIMAL(8,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- CONTENT ASSETS TABLES
-- =============================================

-- All generated content (images, videos, voices, etc.)
CREATE TABLE content_assets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    npgx_character_id UUID REFERENCES npgx_characters(id) ON DELETE CASCADE,
    asset_type VARCHAR(20) NOT NULL, -- image, video, voice, sound_fx, music
    file_url TEXT NOT NULL,
    file_size BIGINT,
    duration INTEGER, -- for audio/video in seconds
    resolution VARCHAR(20), -- for images/videos
    format VARCHAR(10), -- jpg, mp4, wav, etc.
    quality VARCHAR(20), -- standard, high, ultra
    prompt_used TEXT,
    generation_settings JSONB,
    provider VARCHAR(50), -- stability, replicate, leonardo, etc.
    generation_cost DECIMAL(8,4),
    storage_cost DECIMAL(8,4),
    outfit_id UUID REFERENCES outfits(id),
    location_id UUID REFERENCES locations(id),
    accessories_used UUID[],
    mood_tags TEXT[],
    nsfw_rating INTEGER CHECK (nsfw_rating >= 0 AND nsfw_rating <= 5),
    is_public BOOLEAN DEFAULT false,
    is_premium BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    revenue_generated DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Generated images specific data
CREATE TABLE generated_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    content_asset_id UUID REFERENCES content_assets(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    options JSONB NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model_version VARCHAR(100),
    seed INTEGER,
    steps INTEGER,
    guidance_scale DECIMAL(4,2),
    cost DECIMAL(8,4) NOT NULL,
    generation_time INTEGER, -- seconds
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- SOCIAL MEDIA & WEB PRESENCE
-- =============================================

-- Social media profiles for each girlfriend
CREATE TABLE social_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    girlfriend_id UUID REFERENCES ai_girlfriends(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- onlyfans, instagram, tiktok, x, facebook, youtube
    username VARCHAR(100) NOT NULL,
    profile_url TEXT NOT NULL,
    bio TEXT,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    auto_post_enabled BOOLEAN DEFAULT false,
    posting_schedule JSONB, -- {"daily": 3, "times": ["9:00", "15:00", "21:00"]}
    content_style VARCHAR(50), -- casual, professional, seductive, playful
    revenue_generated DECIMAL(10,2) DEFAULT 0,
    last_post_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(girlfriend_id, platform)
);

-- All links and websites
CREATE TABLE links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    girlfriend_id UUID REFERENCES ai_girlfriends(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    url TEXT NOT NULL,
    link_type VARCHAR(50) NOT NULL, -- linktree, website, onlyfans, social, affiliate, merchandise
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    click_count INTEGER DEFAULT 0,
    revenue_generated DECIMAL(10,2) DEFAULT 0,
    position INTEGER DEFAULT 0, -- for ordering
    icon_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- BLOCKCHAIN & WALLETS
-- =============================================

-- Wallet addresses for different blockchains
CREATE TABLE wallet_addresses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    girlfriend_id UUID REFERENCES ai_girlfriends(id) ON DELETE CASCADE,
    blockchain VARCHAR(50) NOT NULL, -- ethereum, bitcoin, solana, polygon, bsc, etc.
    wallet_address TEXT NOT NULL,
    wallet_type VARCHAR(50) NOT NULL, -- multisig, single, smart_contract
    is_multisig BOOLEAN DEFAULT false,
    required_signatures INTEGER, -- for multisig wallets
    signers TEXT[], -- array of signer addresses
    wallet_name VARCHAR(100),
    purpose VARCHAR(100), -- payments, nft_royalties, governance, etc.
    is_active BOOLEAN DEFAULT true,
    balance_usd DECIMAL(15,2) DEFAULT 0,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- BUSINESS & MARKETING
-- =============================================

-- Affiliate programs and partnerships
CREATE TABLE affiliates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    company VARCHAR(200),
    category VARCHAR(100) NOT NULL, -- health, supplements, tech, lifestyle
    product_type VARCHAR(100), -- ED_treatment, hair_loss, sleep_aids, etc.
    commission_rate DECIMAL(5,2) NOT NULL, -- percentage
    commission_type VARCHAR(20) NOT NULL, -- percentage, fixed
    minimum_payout DECIMAL(10,2) DEFAULT 50,
    payment_schedule VARCHAR(50), -- weekly, monthly, quarterly
    affiliate_link TEXT NOT NULL,
    tracking_code VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    target_demographic VARCHAR(100), -- "lonely_males_18_45", "health_conscious", etc.
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Brand partnerships
CREATE TABLE brands (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    industry VARCHAR(100),
    website TEXT,
    contact_email VARCHAR(255),
    partnership_type VARCHAR(50), -- sponsorship, collaboration, affiliate
    contract_value DECIMAL(12,2),
    contract_start_date DATE,
    contract_end_date DATE,
    deliverables TEXT,
    is_active BOOLEAN DEFAULT true,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Target audience segments
CREATE TABLE target_audiences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    demographics JSONB, -- {"age_range": "18-45", "gender": "male", "income": "50k+"}
    psychographics JSONB, -- {"interests": [], "behaviors": [], "pain_points": []}
    size_estimate INTEGER, -- estimated audience size
    spending_power DECIMAL(10,2), -- average monthly spending
    acquisition_cost DECIMAL(8,2), -- cost to acquire one customer
    lifetime_value DECIMAL(10,2), -- customer lifetime value
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- SERVICES & INFRASTRUCTURE
-- =============================================

-- All services and tools we're using
CREATE TABLE services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL, -- ai_generation, hosting, database, automation, analytics
    description TEXT,
    website TEXT,
    pricing_model VARCHAR(50), -- subscription, usage_based, one_time, freemium
    current_plan VARCHAR(100),
    monthly_cost DECIMAL(10,2) DEFAULT 0,
    usage_based_cost DECIMAL(10,6) DEFAULT 0, -- cost per unit
    cost_unit VARCHAR(50), -- per_image, per_gb, per_request, etc.
    billing_cycle VARCHAR(20), -- monthly, yearly, usage
    is_active BOOLEAN DEFAULT true,
    is_critical BOOLEAN DEFAULT false, -- mission critical service
    setup_date DATE,
    contract_end_date DATE,
    usage_limits JSONB, -- {"images_per_month": 10000, "storage_gb": 500}
    current_usage JSONB, -- {"images_this_month": 2500, "storage_used_gb": 125}
    api_key_env_var VARCHAR(100), -- environment variable name for API key
    documentation_url TEXT,
    support_contact TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- FINANCIAL TRACKING
-- =============================================

-- All expenses and costs
CREATE TABLE expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    service_id UUID REFERENCES services(id),
    girlfriend_id UUID REFERENCES ai_girlfriends(id), -- if expense is specific to a girlfriend
    expense_type VARCHAR(50) NOT NULL, -- service_subscription, generation_cost, storage, marketing, etc.
    category VARCHAR(100) NOT NULL, -- infrastructure, content_generation, marketing, operations
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    billing_period VARCHAR(20), -- one_time, monthly, yearly, usage
    expense_date DATE NOT NULL,
    paid_date DATE,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(50), -- monthly, yearly, weekly
    next_billing_date DATE,
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, overdue, cancelled
    payment_method VARCHAR(50),
    invoice_number VARCHAR(100),
    vendor VARCHAR(200),
    budget_category VARCHAR(100),
    is_tax_deductible BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Burn rate tracking
CREATE TABLE burn_rate_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_expenses DECIMAL(12,2) NOT NULL,
    total_revenue DECIMAL(12,2) NOT NULL,
    net_burn_rate DECIMAL(12,2) NOT NULL, -- negative means profit
    monthly_recurring_revenue DECIMAL(12,2) DEFAULT 0,
    customer_acquisition_cost DECIMAL(8,2) DEFAULT 0,
    lifetime_value DECIMAL(10,2) DEFAULT 0,
    runway_months INTEGER, -- how many months until we run out of money
    cash_balance DECIMAL(12,2),
    active_users INTEGER DEFAULT 0,
    paying_users INTEGER DEFAULT 0,
    churn_rate DECIMAL(5,2) DEFAULT 0,
    growth_rate DECIMAL(5,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Joe's concerns and notes
CREATE TABLE concerns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    status VARCHAR(20) DEFAULT 'open', -- open, in_progress, resolved, dismissed
    category VARCHAR(50), -- technical, business, financial, legal, strategic
    tags TEXT[], -- array of tags for organization
    created_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Joe's research notes and ChatGPT outputs
CREATE TABLE joe_research (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    research_type VARCHAR(50) NOT NULL, -- chatgpt_output, market_research, competitor_analysis, industry_report, user_feedback
    source VARCHAR(100), -- chatgpt-4, claude, gemini, manual_research, survey, etc.
    content TEXT NOT NULL,
    key_insights TEXT[], -- array of key takeaways
    action_items TEXT[], -- array of actionable items
    tags TEXT[], -- array of tags for organization
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    status VARCHAR(20) DEFAULT 'active', -- active, archived, implemented
    research_date DATE DEFAULT CURRENT_DATE,
    follow_up_date DATE,
    attachments JSONB, -- file paths, links, etc.
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Investor and partner tracking
CREATE TABLE joe_contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    contact_type VARCHAR(50) NOT NULL, -- investor, partner, affiliate, sponsor, advisor, customer
    company VARCHAR(200),
    position VARCHAR(150),
    email VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url VARCHAR(500),
    twitter_url VARCHAR(500),
    website VARCHAR(500),
    investment_range VARCHAR(100), -- for investors: 10k-50k, 100k-500k, 1M+
    investment_stage VARCHAR(50), -- seed, series_a, series_b, growth
    industry_focus TEXT[], -- array of industries they focus on
    geographic_focus VARCHAR(100), -- US, EU, Global, etc.
    last_contact_date DATE,
    next_follow_up DATE,
    relationship_status VARCHAR(50) DEFAULT 'prospect', -- prospect, contacted, meeting_scheduled, negotiating, committed, rejected
    notes TEXT,
    deal_size DECIMAL(15,2), -- potential investment or partnership value
    probability INTEGER DEFAULT 0, -- 0-100% chance of success
    referral_source VARCHAR(200),
    tags TEXT[],
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SWOT Analysis system
CREATE TABLE joe_swot (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    swot_type VARCHAR(20) NOT NULL, -- strength, weakness, opportunity, threat
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    impact_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    timeframe VARCHAR(50), -- immediate, short_term, medium_term, long_term
    category VARCHAR(100), -- technology, market, financial, operational, competitive, regulatory
    supporting_research TEXT, -- links to research, data sources
    action_plan TEXT, -- what to do about this item
    metrics TEXT[], -- how to measure progress
    status VARCHAR(30) DEFAULT 'identified', -- identified, researching, planning, implementing, completed
    priority_score INTEGER DEFAULT 5, -- 1-10 priority ranking
    last_reviewed DATE DEFAULT CURRENT_DATE,
    review_frequency VARCHAR(20) DEFAULT 'monthly', -- weekly, monthly, quarterly
    assigned_to VARCHAR(100), -- who is responsible
    deadline DATE,
    progress_notes TEXT,
    attachments JSONB, -- supporting documents, links
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Joe's daily action items and tasks
CREATE TABLE joe_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL, -- daily_recurring, weekly_recurring, one_time, milestone
    category VARCHAR(50), -- investor_relations, sales, marketing, development, research, admin
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, cancelled, blocked
    due_date DATE,
    estimated_hours DECIMAL(4,2),
    actual_hours DECIMAL(4,2),
    completion_percentage INTEGER DEFAULT 0, -- 0-100
    recurring_pattern VARCHAR(50), -- daily, weekly, monthly, quarterly
    next_occurrence DATE,
    dependencies TEXT[], -- array of task IDs this depends on
    tags TEXT[],
    notes TEXT,
    completed_at TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Revenue tracking
CREATE TABLE revenue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    girlfriend_id UUID REFERENCES ai_girlfriends(id),
    affiliate_id UUID REFERENCES affiliates(id),
    revenue_type VARCHAR(50) NOT NULL, -- subscription, affiliate, advertising, merchandise, tips
    source VARCHAR(100) NOT NULL, -- onlyfans, affiliate_program, google_ads, etc.
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    revenue_date DATE NOT NULL,
    processing_fee DECIMAL(8,2) DEFAULT 0,
    net_amount DECIMAL(12,2) NOT NULL,
    customer_id TEXT,
    transaction_id TEXT,
    platform_fee DECIMAL(8,2) DEFAULT 0,
    payout_date DATE,
    is_recurring BOOLEAN DEFAULT false,
    subscription_period VARCHAR(20), -- monthly, yearly
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User profiles indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active);

-- Core girlfriend indexes
CREATE INDEX idx_ai_girlfriends_slug ON ai_girlfriends(slug);
CREATE INDEX idx_ai_girlfriends_active ON ai_girlfriends(is_active);
CREATE INDEX idx_ai_girlfriends_popularity ON ai_girlfriends(popularity_score DESC);

-- Content assets indexes
CREATE INDEX idx_content_assets_girlfriend ON content_assets(girlfriend_id);
CREATE INDEX idx_content_assets_type ON content_assets(asset_type);
CREATE INDEX idx_content_assets_public ON content_assets(is_public);
CREATE INDEX idx_generated_images_provider ON generated_images(provider);

-- Social profiles indexes
CREATE INDEX idx_social_profiles_girlfriend ON social_profiles(girlfriend_id);
CREATE INDEX idx_social_profiles_platform ON social_profiles(platform);
CREATE INDEX idx_social_profiles_active ON social_profiles(is_active);

-- Financial indexes
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX idx_expenses_service ON expenses(service_id);
CREATE INDEX idx_revenue_date ON revenue(revenue_date DESC);
CREATE INDEX idx_revenue_girlfriend ON revenue(girlfriend_id);

-- Concerns indexes
CREATE INDEX idx_concerns_status ON concerns(status);
CREATE INDEX idx_concerns_priority ON concerns(priority);
CREATE INDEX idx_concerns_category ON concerns(category);
CREATE INDEX idx_concerns_created_by ON concerns(created_by);
CREATE INDEX idx_concerns_created_at ON concerns(created_at DESC);

-- Joe's research indexes
CREATE INDEX idx_joe_research_type ON joe_research(research_type);
CREATE INDEX idx_joe_research_status ON joe_research(status);
CREATE INDEX idx_joe_research_priority ON joe_research(priority);
CREATE INDEX idx_joe_research_date ON joe_research(research_date DESC);
CREATE INDEX idx_joe_research_created_by ON joe_research(created_by);

-- Joe's contacts indexes
CREATE INDEX idx_joe_contacts_type ON joe_contacts(contact_type);
CREATE INDEX idx_joe_contacts_status ON joe_contacts(relationship_status);
CREATE INDEX idx_joe_contacts_follow_up ON joe_contacts(next_follow_up);
CREATE INDEX idx_joe_contacts_probability ON joe_contacts(probability DESC);
CREATE INDEX idx_joe_contacts_created_by ON joe_contacts(created_by);

-- SWOT indexes
CREATE INDEX idx_joe_swot_type ON joe_swot(swot_type);
CREATE INDEX idx_joe_swot_impact ON joe_swot(impact_level);
CREATE INDEX idx_joe_swot_status ON joe_swot(status);
CREATE INDEX idx_joe_swot_priority ON joe_swot(priority_score DESC);
CREATE INDEX idx_joe_swot_reviewed ON joe_swot(last_reviewed DESC);
CREATE INDEX idx_joe_swot_created_by ON joe_swot(created_by);

-- Joe's tasks indexes
CREATE INDEX idx_joe_tasks_type ON joe_tasks(task_type);
CREATE INDEX idx_joe_tasks_category ON joe_tasks(category);
CREATE INDEX idx_joe_tasks_status ON joe_tasks(status);
CREATE INDEX idx_joe_tasks_priority ON joe_tasks(priority);
CREATE INDEX idx_joe_tasks_due_date ON joe_tasks(due_date);
CREATE INDEX idx_joe_tasks_created_by ON joe_tasks(created_by);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on sensitive tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_girlfriends ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE concerns ENABLE ROW LEVEL SECURITY;
ALTER TABLE joe_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE joe_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE joe_swot ENABLE ROW LEVEL SECURITY;
ALTER TABLE joe_tasks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- INITIAL DATA SEEDING
-- =============================================

-- Insert initial services
INSERT INTO services (name, category, description, pricing_model, current_plan, monthly_cost, is_active, is_critical) VALUES
('Stability AI', 'ai_generation', 'AI image generation service', 'usage_based', 'Pay-per-use', 0, true, true),
('Replicate', 'ai_generation', 'AI model hosting and inference', 'usage_based', 'Pay-per-prediction', 0, true, true),
('Leonardo AI', 'ai_generation', 'AI image generation with premium models', 'subscription', 'Professional', 29.99, true, true),
('Google AI Studio', 'ai_generation', 'Google AI services and models', 'usage_based', 'Pay-per-use', 0, true, true),
('VEO3', 'ai_generation', 'AI video generation service', 'usage_based', 'Pay-per-video', 0, true, false),
('Bloatato', 'automation', 'Content automation platform', 'subscription', 'Pro', 49.99, true, false),
('Supabase', 'database', 'PostgreSQL database and backend services', 'usage_based', 'Pro', 25.00, true, true),
('n8n', 'automation', 'Workflow automation platform', 'subscription', 'Cloud', 20.00, true, true),
('Vercel', 'hosting', 'Web hosting and deployment platform', 'usage_based', 'Pro', 20.00, true, true),
('Cloudinary', 'storage', 'Image and video storage/optimization', 'usage_based', 'Plus', 89.00, true, true),
('Stripe', 'payments', 'Payment processing platform', 'usage_based', 'Standard', 0, true, true),
('Google Analytics', 'analytics', 'Web analytics platform', 'freemium', 'Free', 0, true, false),
('Mixpanel', 'analytics', 'Product analytics platform', 'subscription', 'Growth', 89.00, true, false),
('Discord', 'communication', 'Community and support platform', 'freemium', 'Free', 0, true, false),
('Notion', 'productivity', 'Documentation and project management', 'subscription', 'Team', 16.00, true, false);

-- Insert initial expense categories
INSERT INTO expenses (expense_type, category, description, amount, billing_period, expense_date, is_recurring, recurrence_pattern, next_billing_date, payment_status) VALUES
('service_subscription', 'infrastructure', 'Supabase Pro Plan', 25.00, 'monthly', CURRENT_DATE, true, 'monthly', CURRENT_DATE + INTERVAL '1 month', 'paid'),
('service_subscription', 'automation', 'n8n Cloud Plan', 20.00, 'monthly', CURRENT_DATE, true, 'monthly', CURRENT_DATE + INTERVAL '1 month', 'paid'),
('service_subscription', 'hosting', 'Vercel Pro Plan', 20.00, 'monthly', CURRENT_DATE, true, 'monthly', CURRENT_DATE + INTERVAL '1 month', 'paid'),
('service_subscription', 'ai_generation', 'Leonardo AI Professional', 29.99, 'monthly', CURRENT_DATE, true, 'monthly', CURRENT_DATE + INTERVAL '1 month', 'paid'),
('service_subscription', 'storage', 'Cloudinary Plus Plan', 89.00, 'monthly', CURRENT_DATE, true, 'monthly', CURRENT_DATE + INTERVAL '1 month', 'paid');

-- Insert target audiences
INSERT INTO target_audiences (name, description, demographics, psychographics, size_estimate, spending_power, acquisition_cost, lifetime_value, is_primary) VALUES
('Lonely Males 18-45', 'Primary target: Lonely men seeking companionship', 
 '{"age_range": "18-45", "gender": "male", "income": "30k-100k", "location": "global"}',
 '{"interests": ["gaming", "anime", "technology"], "behaviors": ["online_spending", "social_media_heavy"], "pain_points": ["loneliness", "lack_of_confidence", "social_anxiety"]}',
 50000000, 500.00, 25.00, 2400.00, true),
('Health Conscious Males', 'Men interested in health and fitness supplements',
 '{"age_range": "25-50", "gender": "male", "income": "50k+", "location": "US/EU"}',
 '{"interests": ["fitness", "health", "supplements"], "behaviors": ["online_shopping", "health_research"], "pain_points": ["ED", "hair_loss", "low_energy"]}',
 20000000, 800.00, 45.00, 3600.00, true),
('Crypto Enthusiasts', 'Cryptocurrency and blockchain interested users',
 '{"age_range": "20-40", "gender": "mixed", "income": "40k+", "location": "global"}',
 '{"interests": ["crypto", "nfts", "defi"], "behaviors": ["high_risk_tolerance", "tech_early_adopter"], "pain_points": ["FOMO", "investment_anxiety"]}',
 15000000, 1200.00, 60.00, 4800.00, false);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_girlfriends_updated_at BEFORE UPDATE ON ai_girlfriends FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_assets_updated_at BEFORE UPDATE ON content_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_social_profiles_updated_at BEFORE UPDATE ON social_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_concerns_updated_at BEFORE UPDATE ON concerns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_joe_research_updated_at BEFORE UPDATE ON joe_research FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_joe_contacts_updated_at BEFORE UPDATE ON joe_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_joe_swot_updated_at BEFORE UPDATE ON joe_swot FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_joe_tasks_updated_at BEFORE UPDATE ON joe_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate burn rate
CREATE OR REPLACE FUNCTION calculate_burn_rate(start_date DATE, end_date DATE)
RETURNS TABLE (
    total_exp DECIMAL(12,2),
    total_rev DECIMAL(12,2),
    net_burn DECIMAL(12,2),
    daily_burn DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(e.amount), 0) as total_exp,
        COALESCE(SUM(r.amount), 0) as total_rev,
        COALESCE(SUM(e.amount), 0) - COALESCE(SUM(r.amount), 0) as net_burn,
        (COALESCE(SUM(e.amount), 0) - COALESCE(SUM(r.amount), 0)) / GREATEST(end_date - start_date, 1) as daily_burn
    FROM expenses e
    FULL OUTER JOIN revenue r ON DATE_TRUNC('day', e.expense_date) = DATE_TRUNC('day', r.revenue_date)
    WHERE e.expense_date BETWEEN start_date AND end_date
       OR r.revenue_date BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEWS FOR REPORTING
-- =============================================

-- Girlfriend performance summary
CREATE VIEW girlfriend_performance AS
SELECT 
    g.id,
    g.name,
    g.popularity_score,
    COUNT(DISTINCT ca.id) as total_content,
    COUNT(DISTINCT sp.id) as active_socials,
    COALESCE(SUM(r.amount), 0) as total_revenue,
    COALESCE(AVG(ca.view_count), 0) as avg_views,
    COALESCE(AVG(sp.engagement_rate), 0) as avg_engagement
FROM ai_girlfriends g
LEFT JOIN content_assets ca ON g.id = ca.girlfriend_id
LEFT JOIN social_profiles sp ON g.id = sp.girlfriend_id AND sp.is_active = true
LEFT JOIN revenue r ON g.id = r.girlfriend_id
WHERE g.is_active = true
GROUP BY g.id, g.name, g.popularity_score;

-- Monthly financial summary
CREATE VIEW monthly_financials AS
SELECT 
    DATE_TRUNC('month', expense_date)::DATE as month,
    SUM(CASE WHEN expense_type = 'service_subscription' THEN amount ELSE 0 END) as subscription_costs,
    SUM(CASE WHEN expense_type = 'generation_cost' THEN amount ELSE 0 END) as generation_costs,
    SUM(CASE WHEN category = 'marketing' THEN amount ELSE 0 END) as marketing_costs,
    SUM(amount) as total_expenses
FROM expenses
GROUP BY DATE_TRUNC('month', expense_date)
ORDER BY month DESC;

COMMIT; 