// AI Image Generation Service for NPGX Platform
// Supports multiple providers for redundancy and cost optimization

import Replicate from 'replicate';

export interface GirlfriendOptions {
  // Physical attributes
  age?: number;
  hairColor?: 'blonde' | 'brunette' | 'redhead' | 'black' | 'colorful';
  eyeColor?: 'blue' | 'brown' | 'green' | 'hazel' | 'gray';
  ethnicity?: 'caucasian' | 'asian' | 'latina' | 'african' | 'mixed';
  bodyType?: 'petite' | 'athletic' | 'curvy' | 'slim' | 'plus-size';
  
  // Style & pose
  style?: 'realistic' | 'anime' | 'artistic' | 'photography';
  pose?: 'portrait' | 'full-body' | 'casual' | 'glamour' | 'lifestyle';
  clothing?: 'casual' | 'elegant' | 'sporty' | 'lingerie' | 'bikini' | 'custom';
  
  // Technical settings
  width?: number;
  height?: number;
  quality?: 'standard' | 'high' | 'ultra';
  nsfw?: boolean;
  
  // Custom prompt override
  customPrompt?: string;
}

export interface GeneratedImage {
  url: string;
  id: string;
  prompt: string;
  options: GirlfriendOptions;
  provider: string;
  cost: number;
  timestamp: Date;
}

class ImageGenerationService {
  private providers = {
    replicate: process.env.REPLICATE_API_TOKEN,
    leonardo: process.env.LEONARDO_API_KEY,
    stability: process.env.STABILITY_API_KEY,
  };

  constructor() {
    // Debug logging to check environment variables
    console.log('ImageGenerationService initialized with providers:');
    console.log('Replicate API Token:', process.env.REPLICATE_API_TOKEN ? 'Set' : 'Not set');
    console.log('Leonardo API Key:', process.env.LEONARDO_API_KEY ? 'Set' : 'Not set');
    console.log('Stability API Key:', process.env.STABILITY_API_KEY ? 'Set' : 'Not set');
    console.log('All env vars:', Object.keys(process.env).filter(key => key.includes('API') || key.includes('TOKEN')));
  }

  // Generate AI girlfriend image using best available provider
  async generateGirlfriend(options: GirlfriendOptions): Promise<GeneratedImage> {
    const prompt = this.buildPrompt(options);
    const negativePrompt = this.buildNegativePrompt();
    
    console.log('Available providers check:');
    console.log('Stability API Key:', this.providers.stability ? 'Set' : 'Not set');
    console.log('Replicate API Token:', this.providers.replicate ? 'Set' : 'Not set');
    console.log('Leonardo API Key:', this.providers.leonardo ? 'Set' : 'Not set');
    
    // Try each provider in order - prioritize Stability AI since we have a working key
    const providers = ['stability', 'replicate', 'leonardo'] as const;
    
    for (const provider of providers) {
      try {
        if (!this.providers[provider]) {
          console.warn(`Provider ${provider} not configured (no API key)`);
          continue;
        }
        
        console.log(`Trying provider: ${provider}`);
        
        switch (provider) {
          case 'stability':
            return await this.generateWithStability(prompt, negativePrompt, options);
          case 'replicate':
            return await this.generateWithReplicate(prompt, negativePrompt, options);
          case 'leonardo':
            return await this.generateWithLeonardo(prompt, negativePrompt, options);
        }
      } catch (error) {
        console.warn(`${provider} failed, trying next provider:`, error);
        continue;
      }
    }
    
    // If all providers fail, return a fallback image
    console.warn('All image generation providers failed or not configured, using fallback image');
    return this.generateFallbackImage(options);
  }

  // Build optimized prompt for AI girlfriend generation
  private buildPrompt(options: GirlfriendOptions): string {
    // If custom prompt is provided, use it directly
    if (options.customPrompt) {
      return options.customPrompt;
    }
    
    const {
      age = 22,
      hairColor = 'blonde',
      eyeColor = 'blue',
      ethnicity = 'caucasian',
      bodyType = 'athletic',
      style = 'realistic',
      pose = 'portrait',
      clothing = 'casual'
    } = options;

    const basePrompt = `beautiful woman, age ${age}, ${hairColor} hair, ${eyeColor} eyes, ${ethnicity}, ${bodyType} build`;
    const stylePrompt = this.getStylePrompt(style);
    const posePrompt = this.getPosePrompt(pose);
    const clothingPrompt = this.getClothingPrompt(clothing);
    
    return `${basePrompt}, ${stylePrompt}, ${posePrompt}, ${clothingPrompt}, high quality, detailed, professional photography`;
  }

  private buildNegativePrompt(): string {
    return 'blurry, low quality, distorted, deformed, ugly, bad anatomy, extra limbs, bad hands, bad face, watermark, signature, text, logo, multiple people, crowd, background characters, inappropriate content, NSFW, adult content';
  }

  private getStylePrompt(style: string): string {
    const styles = {
      realistic: 'photorealistic, natural lighting, DSLR quality',
      anime: 'anime style, illustrated, vibrant colors',
      artistic: 'artistic style, painterly, creative',
      photography: 'professional photography, studio lighting, magazine quality'
    };
    return styles[style as keyof typeof styles] || styles.realistic;
  }

  private getPosePrompt(pose: string): string {
    const poses = {
      portrait: 'headshot, portrait, looking at camera',
      'full-body': 'full body shot, standing pose',
      casual: 'casual pose, natural expression',
      glamour: 'glamour pose, confident expression',
      lifestyle: 'lifestyle photography, candid moment'
    };
    return poses[pose as keyof typeof poses] || poses.portrait;
  }

  private getClothingPrompt(clothing: string): string {
    const clothingStyles = {
      casual: 'casual clothing, everyday wear',
      elegant: 'elegant dress, formal attire',
      sporty: 'athletic wear, sportswear',
      lingerie: 'lingerie, intimate apparel',
      bikini: 'bikini, swimwear',
      custom: ''
    };
    return clothingStyles[clothing as keyof typeof clothingStyles] || clothingStyles.casual;
  }

  // Replicate API implementation
  private async generateWithReplicate(
    prompt: string, 
    negativePrompt: string, 
    options: GirlfriendOptions
  ): Promise<GeneratedImage> {
    if (!this.providers.replicate) {
      throw new Error('Replicate API token not configured');
    }

    const replicate = new Replicate({
      auth: this.providers.replicate,
    });

    const output = await replicate.run(
      "stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478",
      {
        input: {
          prompt,
          negative_prompt: negativePrompt,
          width: options.width || 1024,
          height: options.height || 1024,
          guidance_scale: 7.5,
          num_inference_steps: options.quality === 'ultra' ? 80 : 50,
          scheduler: "DPMSolverMultistep",
          chaos: 0
        }
      }
    ) as string[];

    return {
      url: output[0],
      id: crypto.randomUUID(),
      prompt,
      options,
      provider: 'replicate',
      cost: 0.01, // Approximate cost
      timestamp: new Date()
    };
  }

  // Leonardo AI implementation
  private async generateWithLeonardo(
    prompt: string, 
    negativePrompt: string, 
    options: GirlfriendOptions
  ): Promise<GeneratedImage> {
    const response = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.providers.leonardo}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: negativePrompt,
        modelId: "6bef9f1b-29cb-40c7-b9df-32b51c1f67d3", // Leonardo Signature model
        width: options.width || 1024,
        height: options.height || 1024,
        guidance_scale: 7,
        num_images: 1,
        presetStyle: "CINEMATIC"
      })
    });

    const generation = await response.json();
    
    // Poll for completion
    let result;
    do {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const statusResponse = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${generation.sdGenerationJob.generationId}`, {
        headers: { 'Authorization': `Bearer ${this.providers.leonardo}` }
      });
      result = await statusResponse.json();
    } while (result.generations_by_pk.status === 'PENDING');

    const imageUrl = result.generations_by_pk.generated_images[0].url;

    return {
      url: imageUrl,
      id: generation.sdGenerationJob.generationId,
      prompt,
      options,
      provider: 'leonardo',
      cost: 0.02,
      timestamp: new Date()
    };
  }

  // Stability AI implementation
  private async generateWithStability(
    prompt: string, 
    negativePrompt: string, 
    options: GirlfriendOptions
  ): Promise<GeneratedImage> {
    console.log('Calling Stability AI with prompt:', prompt);
    
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.providers.stability}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text_prompts: [
          { text: prompt, weight: 1 },
          { text: negativePrompt, weight: -1 }
        ],
        cfg_scale: 7,
        height: options.height || 1024,
        width: options.width || 1024,
        steps: options.quality === 'ultra' ? 50 : 30,
        samples: 1,
        style_preset: "photographic"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Stability AI API error:', response.status, errorText);
      throw new Error(`Stability AI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Stability AI response:', result);
    
    if (!result.artifacts || !result.artifacts[0]) {
      throw new Error('No image generated by Stability AI');
    }
    
    const imageData = result.artifacts[0].base64;
    
    // For now, return the base64 data URL directly
    // In production, you'd upload to S3/Cloudinary and return a URL
    const imageUrl = `data:image/png;base64,${imageData}`;

    return {
      url: imageUrl,
      id: crypto.randomUUID(),
      prompt,
      options,
      provider: 'stability',
      cost: 0.015,
      timestamp: new Date()
    };
  }

  // Upload base64 image to cloud storage (implement based on your storage provider)
  private async uploadBase64Image(base64Data: string): Promise<string> {
    // TODO: Implement upload to AWS S3, Cloudinary, or other storage
    // For now, return a placeholder
    return `data:image/png;base64,${base64Data}`;
  }

  // Batch generation for efficiency
  async generateBatch(optionsList: GirlfriendOptions[]): Promise<GeneratedImage[]> {
    const results = await Promise.allSettled(
      optionsList.map(options => this.generateGirlfriend(options))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<GeneratedImage> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  // Cost estimation
  estimateCost(options: GirlfriendOptions): number {
    const baseCost = 0.01;
    const qualityMultiplier = {
      standard: 1,
      high: 1.5,
      ultra: 2.5
    };
    
    return baseCost * (qualityMultiplier[options.quality || 'standard']);
  }

  // Generate a fallback image using character-specific placeholder
  private generateFallbackImage(options: GirlfriendOptions): GeneratedImage {
    const characterName = options.customPrompt?.toLowerCase().includes('luna') ? 'luna' :
                         options.customPrompt?.toLowerCase().includes('nova') ? 'nova' :
                         options.customPrompt?.toLowerCase().includes('raven') ? 'raven' :
                         options.customPrompt?.toLowerCase().includes('phoenix') ? 'phoenix' :
                         options.customPrompt?.toLowerCase().includes('storm') ? 'storm' :
                         options.customPrompt?.toLowerCase().includes('vega') ? 'vega' :
                         options.customPrompt?.toLowerCase().includes('zara') ? 'zara' :
                         options.customPrompt?.toLowerCase().includes('scarlett') ? 'scarlett' :
                         options.customPrompt?.toLowerCase().includes('nyx') ? 'nyx' :
                         options.customPrompt?.toLowerCase().includes('jade') ? 'jade' :
                         options.customPrompt?.toLowerCase().includes('echo') ? 'echo' : 'default';

    // Use character-specific placeholder images
    const fallbackImages = {
      luna: '/npgx-images/characters/luna-cyberblade-1.jpg',
      nova: '/npgx-images/characters/nova-bloodmoon-1.jpg', 
      raven: '/npgx-images/characters/raven-shadowblade-1.jpg',
      phoenix: '/npgx-images/characters/phoenix-darkfire-1.jpg',
      storm: '/npgx-images/characters/storm-razorclaw-1.jpg',
      vega: '/npgx-images/heroes/hero-1.jpg',
      zara: '/npgx-images/heroes/hero-2.jpg',
      scarlett: '/npgx-images/heroes/hero-3.jpg',
      nyx: '/npgx-images/gallery/gallery-1.jpg',
      jade: '/npgx-images/backgrounds/bg-1.jpg',
      echo: '/npgx-images/backgrounds/bg-2.jpg',
      default: '/npgx-images/characters/luna-cyberblade-1.jpg'
    };

    return {
      url: fallbackImages[characterName as keyof typeof fallbackImages] || fallbackImages.default,
      id: crypto.randomUUID(),
      prompt: this.buildPrompt(options),
      options,
      provider: 'fallback',
      cost: 0,
      timestamp: new Date()
    };
  }
}

export const imageGenerator = new ImageGenerationService(); 