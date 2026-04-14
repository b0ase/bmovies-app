import { NextResponse } from 'next/server'
import { getRedirectUrl } from '@/lib/handcash'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const returnTo = url.searchParams.get('returnTo') || '/'

  try {
    const redirectUrl = getRedirectUrl(returnTo)
    return NextResponse.redirect(redirectUrl)
  } catch {
    // If HandCash not configured, redirect back with error
    const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin
    return NextResponse.redirect(`${origin}${returnTo}?error=handcash_not_configured`)
  }
}
