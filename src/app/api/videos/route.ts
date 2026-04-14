import { NextResponse } from 'next/server';

// Video manifest is now served as a static file at /NPG-X-10/manifest.json
// No filesystem access = no Vercel serverless function size issues.

interface ManifestItem {
  uuid: string;
  image?: string;
  video?: string;
  width?: number;
  height?: number;
  orientation?: string;
}

interface Collection {
  name: string;
  token: string;
  items: ManifestItem[];
}

interface Manifest {
  collections: Record<string, Collection>;
}

export async function GET(request: Request) {
  try {
    const origin = new URL(request.url).origin;
    const res = await fetch(`${origin}/NPG-X-10/manifest.json`);
    const manifest: Manifest = await res.json();

    const videos = Object.values(manifest.collections)
      .flatMap((c) => c.items)
      .filter((item) => item.video)
      .map((item, i) => ({
        id: `npgx-${i + 1}`,
        name: item.uuid,
        url: `/NPG-X-10/${item.video}`,
        width: item.width || 464,
        height: item.height || 688,
        orientation: item.orientation || 'portrait',
      }));

    const landscape = videos.filter((v) => v.orientation === 'landscape');
    const portrait = videos.filter((v) => v.orientation === 'portrait');

    return NextResponse.json({
      videos,
      landscape,
      portrait,
      counts: {
        total: videos.length,
        landscape: landscape.length,
        portrait: portrait.length,
      },
    });
  } catch {
    return NextResponse.json({
      videos: [],
      landscape: [],
      portrait: [],
      counts: { total: 0, landscape: 0, portrait: 0 },
    });
  }
}
