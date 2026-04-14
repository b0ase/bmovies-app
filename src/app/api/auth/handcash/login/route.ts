import { NextRequest, NextResponse } from 'next/server'
import { getRedirectUrl } from '@/lib/handcash'

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/'
  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin

  try {
    const redirectUrl = getRedirectUrl(returnTo)
    console.log('[HandCash Login] Redirecting to:', redirectUrl)
    return NextResponse.redirect(redirectUrl)
  } catch (err) {
    console.error('[HandCash Login] Failed:', err)
    return NextResponse.redirect(`${origin}/auth/signin?error=handcash_not_configured`)
  }
}
