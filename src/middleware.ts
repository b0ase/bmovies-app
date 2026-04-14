import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Routes that DON'T require sign-in
const PUBLIC_ROUTES = [
  '/auth',
  '/api',
  '/_next',
  '/favicon',
  '/music/',
  '/music-videos',
  '/content/',
  '/npgx-images/',
  '/landing-page-videos/',
  '/NPG-X-10/',
  '/NPGX-OG',
  '/og-image',
  '/robots.txt',
  '/sitemap.xml',
  '/watch',
  '/album',
  '/join',
  '/home',
  '/paywall',
  '/exchange',
  '/director',
  '/storyboard',
  '/motion-graphics',
  '/music-video-editor',
  '/graphic-design',
  '/docs/',
  '/title-clips/',
  '/og/',
  '/manifest.json',
  '/sw.js',
  '/icons/',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Dev mode — skip all auth
  if (process.env.NODE_ENV === 'development') return NextResponse.next()

  // Allow root (paywall renders here)
  if (pathname === '/') return NextResponse.next()

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) return NextResponse.next()

  // Allow static files
  if (pathname.includes('.') && !pathname.endsWith('/')) return NextResponse.next()

  // Check NextAuth JWT session (Google sign-in)
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development-only-change-in-production' })
  if (token) return NextResponse.next()

  // Check HandCash cookie
  const hasHandCash = request.cookies.get('npgx_handcash_token')?.value
  if (hasHandCash) return NextResponse.next()

  // Not signed in — redirect to sign-in
  const signInUrl = new URL('/auth/signin', request.url)
  signInUrl.searchParams.set('callbackUrl', pathname)
  return NextResponse.redirect(signInUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
