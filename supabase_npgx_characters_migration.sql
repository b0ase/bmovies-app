-- Migration to update user_npgx_characters table for finalized NPGX characters
-- Run this in your Supabase SQL editor

-- Add missing columns if they don't exist
ALTER TABLE user_npgx_characters 
ADD COLUMN IF NOT EXISTS codename TEXT,
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS development JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS generated_images JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS generated_prompts JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_npgx_characters_slug ON user_npgx_characters(slug);

-- Create index on attributes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_npgx_characters_attributes ON user_npgx_characters USING GIN (attributes);

-- Create index on generated_images for better query performance
CREATE INDEX IF NOT EXISTS idx_user_npgx_characters_generated_images ON user_npgx_characters USING GIN (generated_images);

-- Create index on generated_prompts for better query performance
CREATE INDEX IF NOT EXISTS idx_user_npgx_characters_generated_prompts ON user_npgx_characters USING GIN (generated_prompts);

-- Add comments to document the new columns
COMMENT ON COLUMN user_npgx_characters.codename IS 'Character codename/alias';
COMMENT ON COLUMN user_npgx_characters.attributes IS 'Character physical and personality attributes';
COMMENT ON COLUMN user_npgx_characters.development IS 'Character development details';
COMMENT ON COLUMN user_npgx_characters.generated_images IS 'Generated images for this character';
COMMENT ON COLUMN user_npgx_characters.generated_prompts IS 'Generated prompts for this character';
COMMENT ON COLUMN user_npgx_characters.slug IS 'URL-friendly character identifier';

-- Enable RLS if not already enabled
ALTER TABLE user_npgx_characters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own NPGX characters" ON user_npgx_characters;
DROP POLICY IF EXISTS "Users can insert their own NPGX characters" ON user_npgx_characters;
DROP POLICY IF EXISTS "Users can update their own NPGX characters" ON user_npgx_characters;
DROP POLICY IF EXISTS "Users can delete their own NPGX characters" ON user_npgx_characters;

-- Create new RLS policies
CREATE POLICY "Users can view their own NPGX characters" ON user_npgx_characters
    FOR SELECT USING (
        user_profile_id IN (
            SELECT id FROM user_profiles 
            WHERE user_id = current_setting('app.current_user_id', true)::text
        )
    );

-- Add policy for inserting new characters
CREATE POLICY "Users can insert their own NPGX characters" ON user_npgx_characters
    FOR INSERT WITH CHECK (
        user_profile_id IN (
            SELECT id FROM user_profiles 
            WHERE user_id = current_setting('app.current_user_id', true)::text
        )
    );

-- Add policy for updating characters
CREATE POLICY "Users can update their own NPGX characters" ON user_npgx_characters
    FOR UPDATE USING (
        user_profile_id IN (
            SELECT id FROM user_profiles 
            WHERE user_id = current_setting('app.current_user_id', true)::text
        )
    );

-- Add policy for deleting characters
CREATE POLICY "Users can delete their own NPGX characters" ON user_npgx_characters
    FOR DELETE USING (
        user_profile_id IN (
            SELECT id FROM user_profiles 
            WHERE user_id = current_setting('app.current_user_id', true)::text
        )
    ); 