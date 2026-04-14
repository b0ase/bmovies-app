import { createClient } from '@supabase/supabase-js'
import { GirlfriendOptions } from './ai/imageGeneration'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Only create client if environment variables are available
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null

// Database schema types
export interface GeneratedImageRecord {
  id: string
  url: string
  prompt: string
  options: GirlfriendOptions // JSON field for GirlfriendOptions
  provider: string
  cost: number
  created_at: string
  user_id?: string
  storage_path?: string
  metadata?: {
    character_name?: string
    style?: string
    dimensions?: { width: number; height: number }
    tags?: string[]
    generation_date?: string
    model_version?: string
    grade?: string
    model?: string
  }
}

export interface User {
  id: string
  email: string
  name?: string
  credits: number
  created_at: string
  updated_at: string
}

// Image storage operations
export const uploadImageToStorage = async (
  imageData: string, 
  fileName: string, 
  metadata: any = {}
): Promise<string> => {
  if (!supabase) {
    console.warn('Supabase not configured - returning original URL');
    return imageData;
  }

  try {
    // Convert data URL to blob if needed
    let blob: Blob;
    if (imageData.startsWith('data:')) {
      const response = await fetch(imageData);
      blob = await response.blob();
    } else {
      // If it's already a URL, fetch it
      const response = await fetch(imageData);
      blob = await response.blob();
    }

    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueFileName = `${timestamp}-${fileName}`;
    const storagePath = `generated-images/${uniqueFileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('npgx-images')
      .upload(storagePath, blob, {
        contentType: 'image/png',
        upsert: false,
        metadata: {
          ...metadata,
          uploaded_at: new Date().toISOString(),
          original_filename: fileName
        }
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('npgx-images')
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Failed to upload image to storage:', error);
    // Return original URL as fallback
    return imageData;
  }
};

// Enhanced save function with automatic storage
export const saveGeneratedImage = async (image: Omit<GeneratedImageRecord, 'id' | 'created_at'>) => {
  if (!supabase) {
    console.warn('Supabase not configured - skipping database save');
    return null;
  }

  try {
    // Extract character name from prompt for metadata
    const characterMatch = image.prompt.match(/([A-Z][a-z]+)\s+\(([^)]+)\)/);
    const characterName = characterMatch ? characterMatch[1] : 'Unknown';
    const characterCodename = characterMatch ? characterMatch[2] : 'Unknown';

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${characterName.toLowerCase()}-${timestamp}.png`;

    // Upload image to storage if it's not already a Supabase URL
    let finalUrl = image.url;
    let storagePath = undefined;

    if (!image.url.includes('supabase.co') && !image.url.includes('api.b0ase.com') && !image.url.startsWith('data:')) {
      // It's an external URL, download and store it
      finalUrl = await uploadImageToStorage(image.url, fileName, {
        character_name: characterName,
        character_codename: characterCodename,
        provider: image.provider,
        prompt: image.prompt,
        style: image.options.style,
        dimensions: { width: image.options.width, height: image.options.height }
      });
      storagePath = `generated-images/${fileName}`;
    } else if (image.url.startsWith('data:')) {
      // It's a base64 data URL, store it
      finalUrl = await uploadImageToStorage(image.url, fileName, {
        character_name: characterName,
        character_codename: characterCodename,
        provider: image.provider,
        prompt: image.prompt,
        style: image.options.style,
        dimensions: { width: image.options.width, height: image.options.height }
      });
      storagePath = `generated-images/${fileName}`;
    }

    // Prepare metadata
    const metadata = {
      character_name: characterName,
      character_codename: characterCodename,
      style: image.options.style,
      dimensions: { 
        width: image.options.width || 1024, 
        height: image.options.height || 1024 
      },
      tags: [
        'npgx',
        'generated',
        characterName.toLowerCase(),
        image.options.style || 'realistic',
        image.provider
      ],
      generation_date: new Date().toISOString(),
      model_version: 'v1.0'
    };

    // Save to database with enhanced metadata
    const { data, error } = await supabase
      .from('generated_images')
      .insert({
        ...image,
        url: finalUrl,
        storage_path: storagePath,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Database save error:', error);
      throw error;
    }

    console.log('Image saved successfully:', data.id);
    return data;
  } catch (error) {
    console.error('Failed to save generated image:', error);
    throw error;
  }
};

// Get images with filtering and pagination
export const getGeneratedImages = async (
  filters: {
    userId?: string;
    characterName?: string;
    style?: string;
    provider?: string;
    limit?: number;
    offset?: number;
  } = {}
) => {
  if (!supabase) {
    console.warn('Supabase not configured - returning empty array');
    return [];
  }

  try {
    let query = supabase
      .from('generated_images')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.provider) {
      query = query.eq('provider', filters.provider);
    }
    if (filters.characterName) {
      query = query.ilike('metadata->character_name', `%${filters.characterName}%`);
    }
    if (filters.style) {
      query = query.eq('metadata->style', filters.style);
    }

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to get generated images:', error);
    return [];
  }
};

// Get images by character
export const getImagesByCharacter = async (characterName: string, limit = 20) => {
  return getGeneratedImages({ characterName, limit });
};

// Get recent images
export const getRecentImages = async (limit = 10) => {
  return getGeneratedImages({ limit });
};

// Delete image (with storage cleanup)
export const deleteGeneratedImage = async (imageId: string) => {
  if (!supabase) {
    console.warn('Supabase not configured - cannot delete image');
    return false;
  }

  try {
    // Get image record first
    const { data: image, error: fetchError } = await supabase
      .from('generated_images')
      .select('*')
      .eq('id', imageId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage if it exists
    if (image.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('npgx-images')
        .remove([image.storage_path]);

      if (storageError) {
        console.warn('Failed to delete from storage:', storageError);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('generated_images')
      .delete()
      .eq('id', imageId);

    if (deleteError) throw deleteError;

    return true;
  } catch (error) {
    console.error('Failed to delete image:', error);
    return false;
  }
};

// Get storage statistics
export const getStorageStats = async () => {
  if (!supabase) {
    return { totalImages: 0, totalSize: 0, characters: {} };
  }

  try {
    const { data: images } = await supabase
      .from('generated_images')
      .select('metadata, created_at');

    if (!images) return { totalImages: 0, totalSize: 0, characters: {} };

    const stats = {
      totalImages: images.length,
      totalSize: 0, // Would need to calculate from storage
      characters: {} as Record<string, number>,
      recentActivity: images.filter(img => {
        const createdAt = new Date(img.created_at);
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return createdAt > oneWeekAgo;
      }).length
    };

    // Count by character
    images.forEach(img => {
      const characterName = img.metadata?.character_name || 'Unknown';
      stats.characters[characterName] = (stats.characters[characterName] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Failed to get storage stats:', error);
    return { totalImages: 0, totalSize: 0, characters: {} };
  }
};

export const getUserImages = async (userId: string) => {
  return getGeneratedImages({ userId });
}

export const updateUserCredits = async (userId: string, credits: number) => {
  if (!supabase) {
    console.warn('Supabase not configured - skipping credits update');
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .update({ credits })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
} 