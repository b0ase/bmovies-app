import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { paths } = await request.json();

    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: 'paths array required' }, { status: 400 });
    }

    // Validate all paths are under /content/
    for (const p of paths) {
      if (typeof p !== 'string' || !p.startsWith('/content/') || p.includes('..')) {
        return NextResponse.json({ error: `Invalid path: ${p}` }, { status: 400 });
      }
    }

    const results: { path: string; deleted: boolean; error?: string }[] = [];

    for (const p of paths) {
      const fullPath = join(process.cwd(), 'public', p);
      try {
        await unlink(fullPath);
        results.push({ path: p, deleted: true });
      } catch (err) {
        results.push({ path: p, deleted: false, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    const deleted = results.filter(r => r.deleted).length;
    return NextResponse.json({ deleted, total: paths.length, results });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
