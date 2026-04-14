import { NextRequest, NextResponse } from 'next/server'
import { ROSTER_BY_SLUG } from '@/lib/npgx-roster'
import { generateCanonicalIssue } from '@/lib/magazine/pipeline'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 min — 8 image gens + 9 text gens

export async function POST(req: NextRequest) {
  try {
    const { slug, issueNumber } = await req.json()

    if (!slug || !ROSTER_BY_SLUG[slug]) {
      return NextResponse.json(
        { error: `Unknown character slug: ${slug}` },
        { status: 400 },
      )
    }

    const char = ROSTER_BY_SLUG[slug]
    const letterIndex = char.letter.charCodeAt(0) - 64 // A=1, B=2, ...
    const issueNum = issueNumber || letterIndex

    // Build origin URL for internal API calls
    const proto = req.headers.get('x-forwarded-proto') || 'http'
    const host = req.headers.get('host') || 'localhost:5001'
    const origin = req.headers.get('origin') || `${proto}://${host}`

    console.log(`[CanonicalMag] Generating issue #${issueNum} for ${char.name} (${slug})`)

    const issue = await generateCanonicalIssue(slug, issueNum, origin)

    console.log(`[CanonicalMag] Done: ${issue.pageCount} pages`)

    return NextResponse.json({
      success: true,
      issue,
      stats: {
        pages: issue.pageCount,
        images: issue.pages.filter(p => p.image).length,
        textCalls: issue.pages.filter(p => p.type === 'article' || p.type === 'ad').length + 2, // +2 for plan + cover lines
        totalCost: issue.pages.filter(p => p.image).length * 0.07 + (issue.pages.filter(p => p.type === 'article').length + 3) * 0.01,
      },
    })
  } catch (error) {
    console.error('[CanonicalMag] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 },
    )
  }
}
