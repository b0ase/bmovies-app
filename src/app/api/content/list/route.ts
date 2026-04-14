import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { SOUL_SLUGS } from '@/lib/souls';

export const dynamic = 'force-dynamic';

interface ContentItem {
  type: 'image' | 'video' | 'music';
  orientation: 'portrait' | 'landscape';
  path: string;
  filename: string;
  size: number;
}

async function listDir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');

  if (!slug || !SOUL_SLUGS.includes(slug as any)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
  }

  const contentDir = join(process.cwd(), 'public', 'content', slug);
  const items: ContentItem[] = [];

  // Scan all image subdirectories (avatar, bw, color, glam, punk, rock, street, etc.)
  const imageBaseDir = join(contentDir, 'images');
  const imageSubdirs = await listDir(imageBaseDir);
  for (const subdir of imageSubdirs) {
    const dir = join(imageBaseDir, subdir);
    const dirStat = await stat(dir).catch(() => null);
    if (!dirStat?.isDirectory()) continue;
    const files = await listDir(dir);
    for (const f of files) {
      if (/\.(jpg|jpeg|png|webp)$/i.test(f)) {
        const s = await stat(join(dir, f)).catch(() => null);
        const orientation = subdir === 'landscape' ? 'landscape' : 'portrait';
        items.push({
          type: 'image',
          orientation,
          path: `/content/${slug}/images/${subdir}/${f}`,
          filename: f,
          size: s?.size || 0,
        });
      }
    }
  }

  // Scan videos
  for (const orientation of ['portrait', 'landscape'] as const) {
    const dir = join(contentDir, 'videos', orientation);
    const files = await listDir(dir);
    for (const f of files) {
      if (/\.(mp4|webm|mov)$/i.test(f)) {
        const s = await stat(join(dir, f)).catch(() => null);
        items.push({
          type: 'video',
          orientation,
          path: `/content/${slug}/videos/${orientation}/${f}`,
          filename: f,
          size: s?.size || 0,
        });
      }
    }
  }

  // Scan music
  const musicDir = join(contentDir, 'music');
  const musicFiles = await listDir(musicDir);
  for (const f of musicFiles) {
    if (/\.(mp3|wav|ogg|flac)$/i.test(f)) {
      const s = await stat(join(musicDir, f)).catch(() => null);
      items.push({
        type: 'music',
        orientation: 'landscape', // n/a for music
        path: `/content/${slug}/music/${f}`,
        filename: f,
        size: s?.size || 0,
      });
    }
  }

  return NextResponse.json({
    slug,
    total: items.length,
    images: items.filter(i => i.type === 'image').length,
    videos: items.filter(i => i.type === 'video').length,
    music: items.filter(i => i.type === 'music').length,
    items,
  });
}
