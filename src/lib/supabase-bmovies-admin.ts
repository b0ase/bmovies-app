/**
 * bMovies Supabase admin client — SERVER-SIDE ONLY.
 *
 * Never import this from anything under `src/app/**\/page.tsx`,
 * `src/components/**`, or any 'use client' file. It uses the
 * service_role key and must stay on the server. The type checker
 * will not catch the leak — keep the imports clean by policy.
 *
 * Used by /api/auth/brc100/verify (and other auth-sensitive routes)
 * to bypass RLS, create auth.users rows, and mint sessions on behalf
 * of a verified BRC-100 wallet holder.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api.b0ase.com'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  // Fail fast on boot so the route crashes loudly in Vercel logs if
  // the env var wasn't pulled in. The client-side bmovies client
  // gracefully falls back to the anon key — we deliberately do NOT.
  console.warn('[supabase-admin] SUPABASE_SERVICE_ROLE_KEY is not set — admin calls will fail')
}

let _admin: SupabaseClient | null = null

export function getAdminClient(): SupabaseClient {
  if (_admin) return _admin
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured on this deployment')
  }
  _admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  return _admin
}
