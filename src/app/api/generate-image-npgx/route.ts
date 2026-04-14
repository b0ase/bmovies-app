import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadSoul, buildGenerationPrompt, getAllSoulSummaries, SOUL_SLUGS } from '@/lib/souls';
import { generateWithAtlas } from '@/lib/ai/atlas-image';
import { generateWithGrok } from '@/lib/ai/grok';
import { saveGeneratedImage } from '@/lib/supabase';
import { saveContent } from '@/lib/content-store';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID, createHash } from 'crypto';

export const dynamic = 'force-dynamic';

// SAFETY: Age + gender enforcement constants — injected into ALL prompts
const AGE_ENFORCE = 'adult woman, female, feminine, over 18 years old'
const AGE_NEGATIVE = 'child, minor, underage, young, teenager, teen, juvenile, infant, baby, adolescent, school girl, little girl, male, man, masculine, beard, stubble, adam\'s apple, flat chest male'

// Random expression/pose/scenario modifiers to ensure variety between generations
const EXPRESSIONS = [
  'confident smirk, looking directly at camera',
  'intense glare, battle-ready stance',
  'laughing, head tilted back, carefree moment',
  'mysterious side-eye, half-shadow on face',
  'fierce scowl, fists clenched',
  'serene calm, eyes closed, meditating',
  'playful wink, tongue slightly out',
  'brooding, looking away into distance',
  'wide grin, victorious pose',
  'cold stare, arms crossed',
  'caught mid-action, dynamic motion blur',
  'leaning against wall, casual attitude',
  'crouching in shadows, predatory stance',
  'standing on rooftop edge, wind in hair',
  'sitting cross-legged, sharpening blade',
  'walking toward camera, silhouette backlit',
];

const SCENARIOS = [
  'neon-lit alleyway, rain puddles reflecting red light',
  'rooftop at night, city skyline behind',
  'underground fight club, cage in background',
  'dark warehouse, single spotlight',
  'cyberpunk street market, holographic signs',
  'graffiti-covered subway tunnel',
  'abandoned parking garage, emergency lights',
  'nightclub VIP section, laser lights',
  'motorcycle parked nearby, highway overpass',
  'fire escape, smoking city below',
  'backstage at a punk concert',
  'rain-soaked intersection, neon reflections',
];

function getRandomVariety(): string {
  const expr = EXPRESSIONS[Math.floor(Math.random() * EXPRESSIONS.length)];
  const scene = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
  return `${expr}. ${scene}.`;
}

// Content rating classification — keyword-based with explicit override
type ContentRating = 'sfw' | 'x' | 'xx' | 'xxx'

function classifyRating(prompt: string, explicitRating?: string): ContentRating {
  if (explicitRating && ['sfw', 'x', 'xx', 'xxx'].includes(explicitRating)) {
    return explicitRating as ContentRating;
  }
  const lower = prompt.toLowerCase();
  if (/\b(nude|naked|genitals|sex|penetrat|explicit|spread|riding|orgasm|climax)\b/.test(lower)) return 'xxx';
  if (/\b(topless|nipple|breast|bare chest|small breasts|pierced nipples|exposed chest|boobs)\b/.test(lower)) return 'xx';
  if (/\b(lingerie|underwear|bikini|sheer|see-through|cleavage|thong|panties|bra only)\b/.test(lower)) return 'x';
  return 'sfw';
}

// Map rating to content folder
function ratingFolder(rating: ContentRating, isPortrait: boolean): string {
  if (rating === 'sfw') return isPortrait ? 'portrait' : 'landscape';
  return rating; // 'x', 'xx', or 'xxx'
}

// GET — return soul summaries for character pickers
export async function GET() {
  try {
    const summaries = await getAllSoulSummaries();
    return NextResponse.json({ souls: summaries });
  } catch (error) {
    console.error('Failed to load souls:', error);
    return NextResponse.json({ error: 'Failed to load souls' }, { status: 500 });
  }
}

// POST — soul-aware image generation: Grok → Stability → Replicate fallback
export async function POST(request: NextRequest) {
  // $402 paywall — micropayment required
  const { checkPaywall } = await import('@/lib/paywall');
  const { response: paywallResponse, payment } = await checkPaywall(request, 'image-gen');
  if (paywallResponse) return paywallResponse;

  try {
    const { slug, additionalPrompt, prompt: directPrompt, width, height, rating: explicitRating } = await request.json();

    // Accept either a slug (with soul file) or a direct prompt
    let gen: { prompt: string; negativePrompt: string; width: number; height: number; guidanceScale: number; steps: number };
    let characterName = slug || 'NPGX Character';
    let characterToken = '';

    if (slug && SOUL_SLUGS.includes(slug)) {
      try {
        const soul = await loadSoul(slug);
        characterName = soul.identity.name;
        characterToken = soul.identity.token;

        if (directPrompt) {
          // Direct prompt provided — use exactly as-is (caller controls everything)
          gen = {
            prompt: directPrompt,
            negativePrompt: soul.generation.negativePrompt,
            width: soul.generation.defaultWidth,
            height: soul.generation.defaultHeight,
            guidanceScale: soul.generation.guidanceScale,
            steps: soul.generation.steps,
          };
        } else if (additionalPrompt) {
          // Additional prompt — layer it with soul prefix for character consistency
          const soulPrefix = soul.generation.promptPrefix || '';
          const soulSuffix = soul.generation.promptSuffix || '';
          gen = {
            prompt: `${soulPrefix}, ${additionalPrompt}, ${soulSuffix}`.replace(/,\s*,/g, ',').trim(),
            negativePrompt: soul.generation.negativePrompt,
            width: soul.generation.defaultWidth,
            height: soul.generation.defaultHeight,
            guidanceScale: soul.generation.guidanceScale,
            steps: soul.generation.steps,
          };
        } else {
          // No prompt — build from soul data + random variety
          gen = buildGenerationPrompt(soul);
        }
      } catch {
        // Soul file missing — use whatever prompt was provided
        gen = {
          prompt: directPrompt || additionalPrompt || `NPGX ninja punk girl ${slug}`,
          negativePrompt: 'cartoon, anime, 3d render, low quality, blurry, text, watermark',
          width: 1024, height: 1024, guidanceScale: 7, steps: 30,
        };
      }
    } else if (directPrompt || additionalPrompt) {
      gen = {
        prompt: directPrompt || additionalPrompt,
        negativePrompt: 'cartoon, anime, 3d render, low quality, blurry, text, watermark',
        width: 1024, height: 1024, guidanceScale: 7, steps: 30,
      };
    } else {
      return NextResponse.json(
        { error: 'Provide a slug or prompt' },
        { status: 400 }
      );
    }

    // Override dimensions if provided
    const w = width || gen.width;
    const h = height || gen.height;

    // SAFETY: Enforce age in ALL prompts — no exceptions
    if (!gen.prompt.includes('over 18')) {
      gen.prompt = `${AGE_ENFORCE}, ${gen.prompt}`;
    }
    if (!gen.negativePrompt.includes('child')) {
      gen.negativePrompt = `${AGE_NEGATIVE}, ${gen.negativePrompt}`;
    }

    // Only inject random variety when using soul-only generation (no custom prompt)
    if (!directPrompt && !additionalPrompt) {
      const variety = getRandomVariety();
      gen.prompt = `${gen.prompt} ${variety}`;
    }

    // Get session for auto-save (non-blocking — no auth required to generate)
    let userId: string | undefined;
    try {
      const session = await getServerSession(authOptions);
      userId = (session?.user as any)?.id;
    } catch {
      // No session — skip save
    }

    // Detect content rating from prompt + explicit override
    const detectedRating = classifyRating(gen.prompt, explicitRating);

    // Save to content folder on disk — routes to correct folder by rating
    const saveToContentFolder = async (imageUrl: string): Promise<string | null> => {
      if (!slug || !SOUL_SLUGS.includes(slug)) return null;
      try {
        const isPortrait = h > w;
        const folder = ratingFolder(detectedRating, isPortrait);
        const dir = join(process.cwd(), 'public', 'content', slug, 'images', folder);
        await mkdir(dir, { recursive: true });
        const filename = `${slug}-${randomUUID().slice(0, 8)}.jpg`;
        let buf: Buffer;
        if (imageUrl.startsWith('data:image')) {
          buf = Buffer.from(imageUrl.split(',')[1], 'base64');
        } else {
          const res = await fetch(imageUrl);
          buf = Buffer.from(await res.arrayBuffer());
        }
        await writeFile(join(dir, filename), buf);
        const publicPath = `/content/${slug}/images/${folder}/${filename}`;
        console.log(`[ContentLib] Saved ${filename} → ${publicPath} (rating: ${detectedRating})`);
        return publicPath;
      } catch (err) {
        console.warn('[ContentLib] Save failed:', err);
        return null;
      }
    };

    // Get user handle for content attribution
    const userHandle = request.cookies.get('npgx_user_handle')?.value || null;

    // Auto-save helper — saves to content folder (awaited) + content store + Supabase (fire-and-forget)
    const autoSave = async (imageUrl: string, provider: string, cost: number): Promise<string | null> => {
      // Save to content folder and get public path (await so we can return URL)
      const publicPath = await saveToContentFolder(imageUrl);

      // Save to npgx_content store (fire-and-forget) — user attribution
      saveContent({
        slug: slug || 'unknown',
        type: 'image',
        title: `${characterName} — Image`,
        provider,
        status: 'done',
        url: publicPath || imageUrl,
        prompt: gen.prompt,
        cost,
        userHandle: userHandle || undefined,
        data: { rating: detectedRating },
      }).catch(err => console.warn('Content store save failed:', err));

      if (userId) {
        saveGeneratedImage({
          url: imageUrl,
          prompt: gen.prompt,
          options: { width: w, height: h, style: 'npgx' } as any,
          provider,
          cost,
          user_id: userId,
          metadata: {
            character_name: characterName,
            style: 'npgx',
            dimensions: { width: w, height: h },
            tags: ['npgx', characterName.toLowerCase(), provider],
          },
        }).catch(err => console.warn('Auto-save failed:', err));
      }

      return publicPath;
    };

    // Helper: compute SHA-256 content hash for on-chain attestation
    const hashContent = (imageUrl: string): string => {
      if (imageUrl.startsWith('data:')) {
        const b64 = imageUrl.split(',')[1]
        return createHash('sha256').update(Buffer.from(b64, 'base64')).digest('hex')
      }
      // URL-based — hash the URL as fallback (actual content hash happens client-side)
      return createHash('sha256').update(imageUrl).digest('hex')
    }

    // 1. Try Atlas Cloud (z-image/turbo — $0.01/image, same account as Wan video)
    try {
      const result = await generateWithAtlas({ prompt: gen.prompt, width: w, height: h });
      const publicPath = await autoSave(result.url, 'atlas', result.cost);
      return NextResponse.json({
        success: true,
        imageUrl: result.url,
        publicUrl: publicPath || result.sourceUrl || null,
        sourceUrl: result.sourceUrl || null,  // Atlas Cloud hosted URL — for Wan 2.2 animation
        contentHash: hashContent(result.url),
        rating: detectedRating,
        provider: 'atlas',
        model: result.model,
        cost: result.cost,
        character: characterName,
        token: characterToken,
      });
    } catch (atlasErr) {
      console.warn('Atlas Cloud failed, trying Grok:', atlasErr);
    }

    // 2. Try Grok (xAI) — fallback
    try {
      const isPortrait = h > w;
      const isSquare = h === w;
      const aspectHint = isPortrait
        ? 'portrait orientation, vertical composition, tall 2:3 aspect ratio, magazine page format'
        : isSquare
        ? 'square composition, 1:1 aspect ratio'
        : 'landscape orientation, wide 16:9 aspect ratio';
      const result = await generateWithGrok({ prompt: `${gen.prompt}, ${aspectHint}` });
      const publicPath = await autoSave(result.url, 'grok', result.cost);
      return NextResponse.json({
        success: true,
        imageUrl: result.url,
        publicUrl: publicPath || null,
        contentHash: hashContent(result.url),
        rating: detectedRating,
        revisedPrompt: result.revisedPrompt,
        provider: 'grok',
        cost: result.cost,
        character: characterName,
        token: characterToken,
      });
    } catch (grokErr) {
      console.warn('Grok failed, trying Stability:', grokErr);
    }

    // 3. Try Stability AI
    const stabilityKey = process.env.STABILITY_API_KEY;
    if (stabilityKey) {
      try {
        const stabResponse = await fetch(
          'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${stabilityKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text_prompts: [
                { text: gen.prompt, weight: 1 },
                { text: gen.negativePrompt, weight: -1 },
              ],
              cfg_scale: gen.guidanceScale,
              height: h,
              width: w,
              steps: gen.steps,
              samples: 1,
              style_preset: 'photographic',
            }),
          }
        );

        if (stabResponse.ok) {
          const stabResult = await stabResponse.json();
          if (stabResult.artifacts?.[0]?.base64) {
            const imageUrl = `data:image/png;base64,${stabResult.artifacts[0].base64}`;
            const publicPath = await autoSave(imageUrl, 'stability', 0.04);
            return NextResponse.json({
              success: true,
              imageUrl,
              publicUrl: publicPath || null,
              contentHash: hashContent(imageUrl),
              rating: detectedRating,
              provider: 'stability',
              cost: 0.04,
              character: characterName,
              token: characterToken,
            });
          }
        }
      } catch (stabErr) {
        console.warn('Stability failed, trying Replicate:', stabErr);
      }
    }

    // 4. Try Replicate
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (replicateToken) {
      try {
        const { default: Replicate } = await import('replicate');
        const replicate = new Replicate({ auth: replicateToken });

        const output = (await replicate.run(
          'black-forest-labs/flux-schnell',
          {
            input: {
              prompt: gen.prompt,
              num_outputs: 1,
              aspect_ratio: w > h ? '16:9' : h > w ? '9:16' : '1:1',
            },
          }
        )) as string[];

        if (output?.[0]) {
          const publicPath = await autoSave(output[0], 'replicate', 0.003);
          return NextResponse.json({
            success: true,
            imageUrl: output[0],
            publicUrl: publicPath || output[0],
            contentHash: hashContent(output[0]),
            rating: detectedRating,
            provider: 'replicate',
            cost: 0.003,
            character: characterName,
            token: characterToken,
          });
        }
      } catch (repErr) {
        console.warn('Replicate failed:', repErr);
      }
    }

    // 5. All providers failed — return error, not a fake success with broken path
    console.error(`[ImageGen] All providers failed for ${slug || 'unknown'}`)
    return NextResponse.json({
      success: false,
      error: 'All image providers failed. Check API keys and credit balances (Grok/Stability/Replicate).',
      provider: 'none',
      character: characterName,
      token: characterToken,
    }, { status: 503 });
  } catch (error) {
    console.error('generate-image-npgx error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
