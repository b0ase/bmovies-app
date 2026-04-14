import { NextRequest, NextResponse } from 'next/server';
import { imageGenerator, GirlfriendOptions } from '@/lib/ai/imageGeneration';
import { saveGeneratedImage } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('Image generation API called');
    
    const options: GirlfriendOptions = await request.json();
    console.log('Received options:', options);
    
    // Validate required fields
    if (!options || typeof options !== 'object') {
      console.error('Invalid options provided:', options);
      return NextResponse.json(
        { error: 'Invalid options provided' },
        { status: 400 }
      );
    }

    // Set defaults for safety
    const safeOptions: GirlfriendOptions = {
      age: Math.max(18, options.age || 22), // Ensure 18+
      hairColor: options.hairColor || 'blonde',
      eyeColor: options.eyeColor || 'blue',
      ethnicity: options.ethnicity || 'caucasian',
      bodyType: options.bodyType || 'athletic',
      style: options.style || 'realistic',
      pose: options.pose || 'portrait',
      clothing: options.clothing || 'casual',
      width: options.width || 1024,
      height: options.height || 1024,
      quality: options.quality || 'standard',
      nsfw: options.nsfw || false,
      customPrompt: options.customPrompt // Pass through custom prompt if provided
    };

    console.log('Safe options:', safeOptions);

    // Estimate cost before generation
    const estimatedCost = imageGenerator.estimateCost(safeOptions);
    console.log('Estimated cost:', estimatedCost);
    
    // Generate the image
    console.log('Starting image generation...');
    const result = await imageGenerator.generateGirlfriend(safeOptions);
    console.log('Image generation result:', result);
    
    // Save to database
    try {
      await saveGeneratedImage({
        url: result.url,
        prompt: result.prompt,
        options: result.options,
        provider: result.provider,
        cost: result.cost,
        user_id: undefined // TODO: Get user ID from session
      });
      console.log('Image saved to database');
    } catch (dbError) {
      console.warn('Failed to save to database:', dbError);
      // Continue anyway - don't fail the API call
    }
    
    return NextResponse.json({
      success: true,
      image: result,
      estimatedCost,
      message: 'AI girlfriend image generated successfully'
    });

  } catch (error) {
    console.error('Image generation failed:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to generate image',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Batch generation endpoint
export async function PUT(request: NextRequest) {
  try {
    const { options: optionsList }: { options: GirlfriendOptions[] } = await request.json();
    
    if (!Array.isArray(optionsList) || optionsList.length === 0) {
      return NextResponse.json(
        { error: 'Invalid options array provided' },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    if (optionsList.length > 10) {
      return NextResponse.json(
        { error: 'Batch size limited to 10 images' },
        { status: 400 }
      );
    }

    // Ensure all options are safe
    const safeOptionsList = optionsList.map(options => ({
      age: Math.max(18, options.age || 22),
      hairColor: options.hairColor || 'blonde',
      eyeColor: options.eyeColor || 'blue',
      ethnicity: options.ethnicity || 'caucasian',
      bodyType: options.bodyType || 'athletic',
      style: options.style || 'realistic',
      pose: options.pose || 'portrait',
      clothing: options.clothing || 'casual',
      width: options.width || 1024,
      height: options.height || 1024,
      quality: options.quality || 'standard',
      nsfw: options.nsfw || false,
      customPrompt: options.customPrompt // Pass through custom prompt if provided
    }));

    const results = await imageGenerator.generateBatch(safeOptionsList);
    const totalCost = results.reduce((sum, result) => sum + result.cost, 0);

    return NextResponse.json({
      success: true,
      images: results,
      totalCost,
      message: `Generated ${results.length} AI girlfriend images`
    });

  } catch (error) {
    console.error('Batch image generation failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate batch images',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get pricing information
export async function GET() {
  const pricing = {
    standard: 0.01,
    high: 0.015,
    ultra: 0.025,
    providers: {
      replicate: 'Most reliable, ~$0.01 per image',
      leonardo: 'Best quality, ~$0.02 per image',
      stability: 'Fastest, ~$0.015 per image'
    },
    features: {
      customization: 'Full appearance control',
      styles: ['realistic', 'anime', 'artistic', 'photography'],
      poses: ['portrait', 'full-body', 'casual', 'glamour', 'lifestyle'],
      clothing: ['casual', 'elegant', 'sporty', 'lingerie', 'bikini']
    }
  };

  return NextResponse.json(pricing);
} 