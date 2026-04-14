import { TwitterApi } from 'twitter-api-v2';
import { readFileSync } from 'fs';
import { join } from 'path';

let client: TwitterApi | null = null;

function getClient(): TwitterApi {
  if (client) return client;

  const apiKey = process.env.TWITTER_CONSUMER_KEY;
  const apiSecret = process.env.TWITTER_CONSUMER_KEY_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error('Twitter credentials not configured');
  }

  client = new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret,
  });

  return client;
}

export function isTwitterConfigured(): boolean {
  return !!(
    process.env.TWITTER_CONSUMER_KEY &&
    process.env.TWITTER_CONSUMER_KEY_SECRET &&
    process.env.TWITTER_ACCESS_TOKEN &&
    process.env.TWITTER_ACCESS_TOKEN_SECRET
  );
}

export async function postTweet(text: string, imagePath?: string): Promise<{ id: string; text: string }> {
  const tw = getClient();

  let mediaId: string | undefined;

  if (imagePath) {
    const fullPath = imagePath.startsWith('/')
      ? imagePath
      : join(process.cwd(), 'public', imagePath);

    const buffer = readFileSync(fullPath);
    mediaId = await tw.v1.uploadMedia(buffer, { mimeType: 'image/jpeg' });
  }

  const result = await tw.v2.tweet({
    text,
    ...(mediaId ? { media: { media_ids: [mediaId] } } : {}),
  });

  return { id: result.data.id, text: result.data.text };
}
