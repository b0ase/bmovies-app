import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile, PLATFORM_HANDLE } from '@/lib/handcash'

// Handles that get free access (admin/platform accounts)
const FREE_HANDLES = new Set(
  (process.env.FREE_HANDCASH_HANDLES || '')
    .split(',')
    .map(h => h.trim().toLowerCase())
    .filter(Boolean)
)

function isFreeHandle(handle: string): boolean {
  const lower = handle.toLowerCase()
  return lower === PLATFORM_HANDLE.toLowerCase() || FREE_HANDLES.has(lower)
}

export async function GET(request: NextRequest) {
  const authToken = request.nextUrl.searchParams.get('authToken')
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/'
  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin

  if (!authToken) {
    return NextResponse.redirect(`${origin}${returnTo}?error=no_token`)
  }

  try {
    const profile = await getUserProfile(authToken)

    const response = NextResponse.redirect(`${origin}${returnTo}`)

    // httpOnly cookie for auth token (server-side only)
    response.cookies.set('npgx_handcash_token', authToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    })

    // Client-readable cookie for handle
    response.cookies.set('npgx_user_handle', profile.handle, {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    })

    // Admin/platform handles bypass paywall
    if (isFreeHandle(profile.handle)) {
      response.cookies.set('npgx_paid', 'true', {
        path: '/',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      })
    }

    return response
  } catch {
    return NextResponse.redirect(`${origin}${returnTo}?error=auth_failed`)
  }
}
