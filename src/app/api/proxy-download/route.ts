import { NextRequest, NextResponse } from 'next/server'

// Proxy download for cross-origin files (videos, images) that can't be
// downloaded directly from the browser due to CORS restrictions.
// Only allows whitelisted domains to prevent abuse.

const ALLOWED_HOSTS = ['vidgen.x.ai', 'api.x.ai']

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  try {
    const parsed = new URL(url)
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 })
    }

    const upstream = await fetch(url)
    if (!upstream.ok) {
      return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    const body = await upstream.arrayBuffer()

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'attachment',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Proxy fetch failed' }, { status: 500 })
  }
}
