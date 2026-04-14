import { NextRequest, NextResponse } from 'next/server'
import { getContentForUser, getProductionsForUser } from '@/lib/content-store'

export async function GET(req: NextRequest) {
  const handle = req.cookies.get('npgx_user_handle')?.value
  if (!handle) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const type = req.nextUrl.searchParams.get('type') || undefined

  try {
    const [content, productions] = await Promise.all([
      getContentForUser(handle, type as any),
      type ? Promise.resolve([]) : getProductionsForUser(handle),
    ])

    // Group content by type for the account page
    const grouped: Record<string, any[]> = {}
    for (const item of content) {
      if (!grouped[item.type]) grouped[item.type] = []
      grouped[item.type].push({
        id: item.id,
        type: item.type,
        title: item.title,
        thumbnail: item.url || undefined,
        createdAt: item.createdAt,
        character: item.slug,
        provider: item.provider,
        cost: item.cost,
        url: item.url,
        data: item.data,
      })
    }

    // Add productions as their own category
    if (productions.length > 0) {
      grouped.productions = productions.map(p => ({
        id: p.id,
        type: 'production',
        title: `${p.format} — ${p.slug}`,
        createdAt: p.createdAt,
        character: p.slug,
        status: p.status,
        totalCost: p.totalCost,
        itemCount: p.items.length,
      }))
    }

    return NextResponse.json({
      handle,
      content: grouped,
      totalItems: content.length + productions.length,
    })
  } catch (err: any) {
    console.error('[user/content] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
  }
}
