import { NextResponse } from 'next/server'
import { buildManifest } from '@/lib/x402'

export const revalidate = 60 // cache 60s

export async function GET() {
  const manifest = buildManifest()
  return NextResponse.json(manifest, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Cache-Control': 'public, max-age=60, s-maxage=60',
    },
  })
}
