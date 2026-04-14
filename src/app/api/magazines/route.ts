import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/magazines — list saved magazines (optionally filter by slug)
export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const slug = req.nextUrl.searchParams.get('slug')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50')

  let query = supabase
    .from('npgx_magazines')
    .select('id, slug, issue_number, title, subtitle, cover_image, cover_lines, characters, page_count, total_cost, origin, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (slug) query = query.eq('slug', slug)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// POST /api/magazines — save a generated magazine
export async function POST(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const body = await req.json()
  const { issue } = body

  if (!issue || !issue.pages) {
    return NextResponse.json({ error: 'Missing issue data' }, { status: 400 })
  }

  // Strip base64 images from pages to keep DB payload manageable
  // Keep URL references, strip inline data URIs over 1KB
  const cleanPages = issue.pages.map((p: any) => {
    if (p.image && p.image.startsWith('data:') && p.image.length > 1024) {
      return { ...p, image: '[base64-stripped]' }
    }
    return p
  })

  const slug = issue.characters?.[0]?.toLowerCase().replace(/\s+/g, '-') || 'unknown'

  const { data, error } = await supabase
    .from('npgx_magazines')
    .insert({
      slug,
      issue_number: issue.issue || 1,
      title: issue.title || 'Untitled',
      subtitle: issue.subtitle || '',
      cover_image: issue.coverImage || '',
      cover_lines: issue.coverLines || [],
      characters: issue.characters || [],
      page_count: issue.pages.length,
      pages: cleanPages,
      total_cost: issue.totalCost || 0,
      origin: issue.origin || 'generated',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: data.id, saved: true })
}
