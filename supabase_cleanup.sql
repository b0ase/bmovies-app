-- Supabase Cleanup Script for NPGX Platform  
-- Database: fthpedywgwpygrfqliqf.supabase.co
-- Ticker: $NPGX
-- Use this to clean up existing tables if you need a fresh start
-- WARNING: This will delete ALL data in these tables!

-- Drop tables in reverse dependency order to avoid foreign key conflicts

-- Drop dependent tables first
DROP TABLE IF EXISTS multisig_signers CASCADE;
DROP TABLE IF EXISTS user_girlfriends CASCADE;
DROP TABLE IF EXISTS revenue_streams CASCADE;
DROP TABLE IF EXISTS brand_partnerships CASCADE;
DROP TABLE IF EXISTS affiliates CASCADE;
DROP TABLE IF EXISTS social_links CASCADE;
DROP TABLE IF EXISTS social_profiles CASCADE;
DROP TABLE IF EXISTS token_economics CASCADE;
DROP TABLE IF EXISTS music_tracks CASCADE;
DROP TABLE IF EXISTS sound_effects CASCADE;
DROP TABLE IF EXISTS voices CASCADE;
DROP TABLE IF EXISTS videos CASCADE;
DROP TABLE IF EXISTS generated_images CASCADE;
DROP TABLE IF EXISTS accessories CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS outfits CASCADE;
DROP TABLE IF EXISTS name_variants CASCADE;
DROP TABLE IF EXISTS wallet_addresses CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS target_audiences CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop main table last
DROP TABLE IF EXISTS npgx_characters CASCADE;

-- Drop any custom types that might exist
DROP TYPE IF EXISTS blockchain_type CASCADE;
DROP TYPE IF EXISTS platform_type CASCADE;
DROP TYPE IF EXISTS revenue_type CASCADE;

-- Note: Extensions like uuid-ossp are typically shared and shouldn't be dropped
-- unless you're sure no other applications are using them

COMMENT ON SCHEMA public IS 'Cleaned up schema - ready for fresh NPGX Platform installation'; 