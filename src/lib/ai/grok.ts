// Grok xAI image generation provider
// Uses OpenAI-compatible API at https://api.x.ai/v1/images/generations

export interface GrokImageResult {
  url: string;
  revisedPrompt: string;
  provider: 'grok';
  cost: number;
}

export async function generateWithGrok({
  prompt,
  n = 1,
  model = 'grok-imagine-image',
}: {
  prompt: string;
  n?: number;
  model?: string;
}): Promise<GrokImageResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('XAI_API_KEY not configured');
  }

  const response = await fetch('https://api.x.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      n,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Grok API error ${response.status}: ${errorText}`);
  }

  const result = await response.json() as {
    data: Array<{ url: string; revised_prompt?: string }>;
  };

  if (!result.data?.[0]?.url) {
    throw new Error('No image returned from Grok API');
  }

  const imageUrl = result.data[0].url;

  // Proxy the image to base64 to avoid CORS issues on client-side download
  try {
    const imgResponse = await fetch(imageUrl);
    if (imgResponse.ok) {
      const buffer = await imgResponse.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
      return {
        url: `data:${contentType};base64,${base64}`,
        revisedPrompt: result.data[0].revised_prompt || prompt,
        provider: 'grok' as const,
        cost: 0.07,
      };
    }
  } catch {
    // Fall back to raw URL if proxy fails
  }

  return {
    url: imageUrl,
    revisedPrompt: result.data[0].revised_prompt || prompt,
    provider: 'grok',
    cost: 0.07,
  };
}
