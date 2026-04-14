import { NextRequest, NextResponse } from 'next/server';
import { isTwitterConfigured, postTweet } from '@/lib/twitter';
import { pickContent, generateCaption } from '@/lib/tweet-generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isTwitterConfigured()) {
    return NextResponse.json({ error: 'Twitter not configured', demo: true }, { status: 200 });
  }

  try {
    const content = pickContent();
    if (!content) {
      return NextResponse.json({ error: 'No content available to post' }, { status: 200 });
    }

    const caption = generateCaption(content.name);

    const result = await postTweet(caption, content.imagePath);

    return NextResponse.json({
      posted: true,
      tweetId: result.id,
      character: content.slug,
      caption,
      image: content.publicPath,
    });
  } catch (error) {
    console.error('Twitter post failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
