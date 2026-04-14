// Grok xAI video generation provider
// Uses https://api.x.ai/v1/videos/generations (async with polling)

export interface GrokVideoResult {
  requestId: string;
  provider: 'grok';
}

export interface GrokVideoStatus {
  status: 'pending' | 'done' | 'expired';
  videoUrl: string | null;
  duration: number | null;
  provider: 'grok';
  error?: string;
}

/**
 * Start a Grok video generation job. Returns a request_id to poll.
 */
export async function startGrokVideo({
  prompt,
  duration = 10,
  aspectRatio = '9:16',
  resolution = '720p',
  imageUrl,
}: {
  prompt: string;
  duration?: number;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '2:3' | '3:2';
  resolution?: '480p' | '720p';
  imageUrl?: string;
}): Promise<GrokVideoResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('XAI_API_KEY not configured');
  }

  const body: Record<string, unknown> = {
    model: 'grok-imagine-video',
    prompt,
    duration: Math.min(Math.max(duration, 1), 15), // clamp 1-15
    aspect_ratio: aspectRatio,
    resolution,
  };

  if (imageUrl) {
    body.image_url = imageUrl;
  }

  const response = await fetch('https://api.x.ai/v1/videos/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Grok Video API error ${response.status}: ${errorText}`);
  }

  const result = await response.json() as { request_id: string };

  if (!result.request_id) {
    throw new Error('No request_id returned from Grok Video API');
  }

  return {
    requestId: result.request_id,
    provider: 'grok',
  };
}

/**
 * Poll a Grok video generation job for status.
 */
export async function pollGrokVideo(requestId: string): Promise<GrokVideoStatus> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('XAI_API_KEY not configured');
  }

  const url = `https://api.x.ai/v1/videos/${requestId}`;
  console.log(`[grok-video] Polling: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  const responseText = await response.text();
  console.log(`[grok-video] Poll response ${response.status}: ${responseText.slice(0, 500)}`);

  if (!response.ok) {
    // Content moderation rejection — return as error, don't throw
    if (response.status === 400 && responseText.includes('content moderation')) {
      return { status: 'expired', videoUrl: null, duration: null, provider: 'grok', error: 'Video rejected by content moderation' };
    }
    // 404 — video may have expired
    if (response.status === 404) {
      return { status: 'expired', videoUrl: null, duration: null, provider: 'grok' };
    }
    throw new Error(`Grok Video status error ${response.status}: ${responseText.slice(0, 200)}`);
  }

  let result: { status?: string; video?: { url: string; duration: number } };
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(`Grok Video returned invalid JSON: ${responseText.slice(0, 200)}`);
  }

  const status = result.status === 'done' ? 'done'
    : result.status === 'expired' ? 'expired'
    : 'pending';

  return {
    status,
    videoUrl: result.video?.url || null,
    duration: result.video?.duration || null,
    provider: 'grok',
  };
}
