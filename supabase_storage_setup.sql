-- NPGX Image Storage Setup
-- Run this in your Supabase SQL editor

-- 1. Create storage bucket for NPGX images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'npgx-images',
  'npgx-images',
  true,
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- 2. Set up storage policies for public read access
CREATE POLICY "Public read access for npgx-images" ON storage.objects
FOR SELECT USING (bucket_id = 'npgx-images');

-- 3. Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload npgx-images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'npgx-images' 
  AND auth.role() = 'authenticated'
);

-- 4. Allow users to update their own images
CREATE POLICY "Users can update their own npgx-images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'npgx-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Allow users to delete their own images
CREATE POLICY "Users can delete their own npgx-images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'npgx-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 6. Update generated_images table to support metadata and storage
ALTER TABLE generated_images 
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_generated_images_metadata_character 
ON generated_images USING GIN ((metadata->>'character_name'));

CREATE INDEX IF NOT EXISTS idx_generated_images_metadata_style 
ON generated_images USING GIN ((metadata->>'style'));

CREATE INDEX IF NOT EXISTS idx_generated_images_storage_path 
ON generated_images (storage_path);

CREATE INDEX IF NOT EXISTS idx_generated_images_created_at 
ON generated_images (created_at DESC);

-- 8. Create a function to automatically clean up orphaned storage files
CREATE OR REPLACE FUNCTION cleanup_orphaned_images()
RETURNS void AS $$
DECLARE
  orphaned_file RECORD;
BEGIN
  -- Find files in storage that don't have corresponding database records
  FOR orphaned_file IN
    SELECT name 
    FROM storage.objects 
    WHERE bucket_id = 'npgx-images'
    AND name NOT IN (
      SELECT storage_path 
      FROM generated_images 
      WHERE storage_path IS NOT NULL
    )
  LOOP
    -- Delete orphaned file
    DELETE FROM storage.objects 
    WHERE bucket_id = 'npgx-images' 
    AND name = orphaned_file.name;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 9. Create a view for image statistics
CREATE OR REPLACE VIEW image_statistics AS
SELECT 
  COUNT(*) as total_images,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT provider) as providers_used,
  COUNT(DISTINCT metadata->>'character_name') as characters_generated,
  AVG(cost) as average_cost,
  SUM(cost) as total_cost,
  MIN(created_at) as first_generation,
  MAX(created_at) as latest_generation
FROM generated_images;

-- 10. Create a function to get character-specific statistics
CREATE OR REPLACE FUNCTION get_character_stats(character_name TEXT)
RETURNS TABLE(
  character_name TEXT,
  total_images BIGINT,
  average_cost NUMERIC,
  total_cost NUMERIC,
  first_generation TIMESTAMPTZ,
  latest_generation TIMESTAMPTZ,
  styles_used TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gi.metadata->>'character_name' as character_name,
    COUNT(*) as total_images,
    AVG(gi.cost) as average_cost,
    SUM(gi.cost) as total_cost,
    MIN(gi.created_at) as first_generation,
    MAX(gi.created_at) as latest_generation,
    ARRAY_AGG(DISTINCT gi.metadata->>'style') as styles_used
  FROM generated_images gi
  WHERE gi.metadata->>'character_name' ILIKE '%' || character_name || '%'
  GROUP BY gi.metadata->>'character_name';
END;
$$ LANGUAGE plpgsql;

-- 11. Enable Row Level Security on generated_images table
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for generated_images
CREATE POLICY "Users can view all generated images" ON generated_images
FOR SELECT USING (true);

CREATE POLICY "Users can insert their own images" ON generated_images
FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own images" ON generated_images
FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own images" ON generated_images
FOR DELETE USING (auth.uid()::text = user_id);

-- 13. Create a function to migrate existing images to storage
CREATE OR REPLACE FUNCTION migrate_existing_images_to_storage()
RETURNS void AS $$
DECLARE
  image_record RECORD;
  new_storage_path TEXT;
  new_url TEXT;
BEGIN
  -- Find images that don't have storage_path set
  FOR image_record IN
    SELECT * FROM generated_images 
    WHERE storage_path IS NULL 
    AND url NOT LIKE '%supabase.co%'
  LOOP
    -- Generate storage path
    new_storage_path := 'generated-images/migrated/' || 
                       image_record.id || '-' || 
                       EXTRACT(EPOCH FROM image_record.created_at) || '.png';
    
    -- Update the record (actual file upload would need to be done via application)
    UPDATE generated_images 
    SET storage_path = new_storage_path
    WHERE id = image_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 14. Create a trigger to automatically update metadata on insert
CREATE OR REPLACE FUNCTION update_image_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract character name from prompt if not already set
  IF NEW.metadata->>'character_name' IS NULL THEN
    NEW.metadata := NEW.metadata || 
      jsonb_build_object(
        'character_name', 
        COALESCE(
          (SELECT (regexp_match(NEW.prompt, '([A-Z][a-z]+)\s*\('))[1], 
          'Unknown'
        )
      );
  END IF;
  
  -- Set generation date if not set
  IF NEW.metadata->>'generation_date' IS NULL THEN
    NEW.metadata := NEW.metadata || 
      jsonb_build_object('generation_date', NEW.created_at);
  END IF;
  
  -- Set model version if not set
  IF NEW.metadata->>'model_version' IS NULL THEN
    NEW.metadata := NEW.metadata || 
      jsonb_build_object('model_version', 'v1.0');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_image_metadata
  BEFORE INSERT ON generated_images
  FOR EACH ROW
  EXECUTE FUNCTION update_image_metadata();

-- 15. Create a function to get recent activity
CREATE OR REPLACE FUNCTION get_recent_activity(hours_back INTEGER DEFAULT 24)
RETURNS TABLE(
  character_name TEXT,
  images_generated BIGINT,
  total_cost NUMERIC,
  latest_generation TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gi.metadata->>'character_name' as character_name,
    COUNT(*) as images_generated,
    SUM(gi.cost) as total_cost,
    MAX(gi.created_at) as latest_generation
  FROM generated_images gi
  WHERE gi.created_at >= NOW() - INTERVAL '1 hour' * hours_back
  GROUP BY gi.metadata->>'character_name'
  ORDER BY images_generated DESC;
END;
$$ LANGUAGE plpgsql;

-- 16. Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- 17. Create a function to get storage usage statistics
CREATE OR REPLACE FUNCTION get_storage_usage()
RETURNS TABLE(
  bucket_name TEXT,
  total_files BIGINT,
  total_size BIGINT,
  average_file_size BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.name as bucket_name,
    COUNT(o.id) as total_files,
    SUM(o.metadata->>'size')::BIGINT as total_size,
    AVG(o.metadata->>'size')::BIGINT as average_file_size
  FROM storage.buckets b
  LEFT JOIN storage.objects o ON b.id = o.bucket_id
  WHERE b.id = 'npgx-images'
  GROUP BY b.id, b.name;
END;
$$ LANGUAGE plpgsql;

-- 18. Create a function to backup image metadata
CREATE OR REPLACE FUNCTION backup_image_metadata()
RETURNS TABLE(
  backup_date TIMESTAMPTZ,
  total_images BIGINT,
  backup_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    NOW() as backup_date,
    COUNT(*) as total_images,
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'url', url,
        'prompt', prompt,
        'metadata', metadata,
        'created_at', created_at
      )
    ) as backup_data
  FROM generated_images;
END;
$$ LANGUAGE plpgsql;

-- 19. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_generated_images_provider 
ON generated_images (provider);

CREATE INDEX IF NOT EXISTS idx_generated_images_user_id 
ON generated_images (user_id);

CREATE INDEX IF NOT EXISTS idx_generated_images_cost 
ON generated_images (cost);

-- 20. Create a function to get trending characters
CREATE OR REPLACE FUNCTION get_trending_characters(days_back INTEGER DEFAULT 7)
RETURNS TABLE(
  character_name TEXT,
  recent_generations BIGINT,
  total_generations BIGINT,
  growth_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_stats AS (
    SELECT 
      gi.metadata->>'character_name' as character_name,
      COUNT(*) as recent_count
    FROM generated_images gi
    WHERE gi.created_at >= NOW() - INTERVAL '1 day' * days_back
    GROUP BY gi.metadata->>'character_name'
  ),
  total_stats AS (
    SELECT 
      gi.metadata->>'character_name' as character_name,
      COUNT(*) as total_count
    FROM generated_images gi
    GROUP BY gi.metadata->>'character_name'
  )
  SELECT 
    rs.character_name,
    rs.recent_count as recent_generations,
    ts.total_count as total_generations,
    CASE 
      WHEN ts.total_count > 0 THEN 
        (rs.recent_count::NUMERIC / ts.total_count::NUMERIC) * 100
      ELSE 0 
    END as growth_rate
  FROM recent_stats rs
  JOIN total_stats ts ON rs.character_name = ts.character_name
  ORDER BY rs.recent_count DESC;
END;
$$ LANGUAGE plpgsql;

-- 21. Final setup verification
DO $$
BEGIN
  -- Verify storage bucket exists
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'npgx-images') THEN
    RAISE EXCEPTION 'Storage bucket npgx-images was not created successfully';
  END IF;
  
  -- Verify table structure
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'generated_images' 
                 AND column_name = 'metadata') THEN
    RAISE EXCEPTION 'Generated_images table does not have metadata column';
  END IF;
  
  RAISE NOTICE 'NPGX storage setup completed successfully!';
END $$; 