-- Clean Start for NPGX User Profiles Schema
-- This drops everything and starts fresh to avoid conflicts

-- Drop all existing tables (in correct order due to foreign keys)
-- CASCADE will automatically drop any dependent policies
DROP TABLE IF EXISTS user_earnings CASCADE;
DROP TABLE IF EXISTS user_npgx_characters CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Now create everything fresh

-- Create user profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT DEFAULT 'AI Creator',
    username TEXT UNIQUE DEFAULT '@creator',
    avatar_url TEXT,
    bio TEXT,
    member_since TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subscription_plan TEXT DEFAULT 'free',
    total_earnings DECIMAL(12,2) DEFAULT 0.00,
    monthly_revenue DECIMAL(12,2) DEFAULT 0.00,
    total_followers INTEGER DEFAULT 0,
    npgx_characters_count INTEGER DEFAULT 0,
    content_created_count INTEGER DEFAULT 0,
    platforms_connected INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create NPGX Characters table
CREATE TABLE user_npgx_characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image_url TEXT,
    monthly_earnings DECIMAL(10,2) DEFAULT 0.00,
    followers INTEGER DEFAULT 0,
    content_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    platforms TEXT[] DEFAULT '{}',
    personality_traits TEXT[] DEFAULT '{}',
    token_symbol TEXT UNIQUE,
    token_price DECIMAL(10,6) DEFAULT 0.000000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create earnings table
CREATE TABLE user_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    npgx_character_id UUID REFERENCES user_npgx_characters(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    transaction_type TEXT NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_npgx_characters_user_profile_id ON user_npgx_characters(user_profile_id);
CREATE INDEX idx_user_earnings_user_profile_id ON user_earnings(user_profile_id);
CREATE INDEX idx_user_earnings_npgx_character_id ON user_earnings(npgx_character_id);
CREATE INDEX idx_user_earnings_transaction_date ON user_earnings(transaction_date);

-- Create update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_npgx_characters_updated_at 
    BEFORE UPDATE ON user_npgx_characters 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO user_profiles (
    user_id, 
    email, 
    display_name, 
    username, 
    total_earnings, 
    monthly_revenue, 
    total_followers, 
    npgx_characters_count, 
    content_created_count, 
    platforms_connected,
    subscription_plan
) VALUES 
(
    'user_b0ase', 
    'ninjapunkgirlsx@gmail.com', 
    'b0ase', 
    '@b0ase', 
    47230.00, 
    12450.00, 
    284000, 
    3, 
    156, 
    4,
    'pro'
);

-- Insert sample NPGX characters
INSERT INTO user_npgx_characters (
    user_profile_id,
    name,
    image_url,
    monthly_earnings,
    followers,
    content_count,
    platforms,
    personality_traits,
    token_symbol,
    token_price
) 
SELECT 
    up.id,
    girlfriend.name,
    girlfriend.image_url,
    girlfriend.monthly_earnings,
    girlfriend.followers,
    girlfriend.content_count,
    girlfriend.platforms,
    girlfriend.personality_traits,
    girlfriend.token_symbol,
    girlfriend.token_price
FROM user_profiles up
CROSS JOIN (
    VALUES 
    ('Sophia', '/npgx-images/characters/luna-cyberblade-1.jpg', 15230.00, 94000, 127, ARRAY['OnlyFans', 'Instagram', 'TikTok'], ARRAY['Sweet', 'Adventurous'], 'SOPHIA', 0.023400),
('Luna', '/npgx-images/characters/raven-shadowblade-1.jpg', 18650.00, 112000, 203, ARRAY['OnlyFans', 'X.com', 'Instagram'], ARRAY['Mysterious', 'Night'], 'LUNA', 0.048900),
('Maya', '/npgx-images/characters/phoenix-darkfire-1.jpg', 13350.00, 78000, 89, ARRAY['OnlyFans', 'TikTok'], ARRAY['Tropical', 'Sunny'], 'MAYA', 0.022300)
) AS girlfriend(name, image_url, monthly_earnings, followers, content_count, platforms, personality_traits, token_symbol, token_price)
WHERE up.user_id = 'user_b0ase';

-- Success message
SELECT 'Tables created successfully! Now run the migration file to add additional columns.' as status; 