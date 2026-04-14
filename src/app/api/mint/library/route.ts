import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';

export const dynamic = 'force-dynamic';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const VIDEO_EXT = new Set(['.mp4', '.mov', '.webm']);
const AUDIO_EXT = new Set(['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a']);
const ALL_EXT = new Set([...IMAGE_EXT, ...VIDEO_EXT, ...AUDIO_EXT]);

type MediaType = 'image' | 'video' | 'audio';

interface MediaFile {
  name: string;
  path: string;       // public URL path
  mediaType: MediaType;
  size: number;
}

async function scanDir(fsDir: string, urlPrefix: string, results: MediaFile[]): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(fsDir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(fsDir, entry);
    const s = await stat(fullPath).catch(() => null);
    if (!s) continue;

    if (s.isDirectory()) {
      await scanDir(fullPath, `${urlPrefix}/${entry}`, results);
    } else {
      const ext = extname(entry).toLowerCase();
      if (!ALL_EXT.has(ext)) continue;
      const mediaType: MediaType = IMAGE_EXT.has(ext) ? 'image' : VIDEO_EXT.has(ext) ? 'video' : 'audio';
      results.push({
        name: entry,
        path: `${urlPrefix}/${entry}`,
        mediaType,
        size: s.size,
      });
    }
  }
}

export async function GET() {
  const publicDir = join(process.cwd(), 'public');
  const results: MediaFile[] = [];

  // Scan key directories
  const dirs = ['adult-content', 'content', 'landing-page-videos'];
  for (const dir of dirs) {
    await scanDir(join(publicDir, dir), `/${dir}`, results);
  }

  return NextResponse.json({
    total: results.length,
    images: results.filter(f => f.mediaType === 'image').length,
    videos: results.filter(f => f.mediaType === 'video').length,
    audio: results.filter(f => f.mediaType === 'audio').length,
    files: results,
  });
}
