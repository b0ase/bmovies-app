/**
 * /.well-known/x402.json
 *
 * Agent-discovery manifest for the bMovies platform. Agents hit this
 * once to enumerate every callable skill (writing, visual, audio,
 * video, production, query) along with price, params, and pay-to
 * address. Standard x402 contract — compatible with any x402 client.
 *
 * See src/lib/x402-skills.ts for the catalog.
 */

import { NextResponse } from 'next/server';
import { buildManifest } from '@/lib/x402-skills';

// Cache for 60s edge-side so repeated agent discovery isn't recomputing
// the manifest on every request.
export const revalidate = 60;

export async function GET() {
  const manifest = buildManifest();
  return NextResponse.json(manifest, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=60, s-maxage=60',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
