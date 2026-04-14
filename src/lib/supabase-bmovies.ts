/**
 * bMovies Supabase client.
 *
 * Separate from the legacy `supabase.ts` (which is NPGX-era and wired
 * to `generated_images` / `npg_*` tables). This client is the single
 * entry point for every new bMovies feature that reads from the
 * `bct_*` table family:
 *
 *   - bct_offers          — films/pitches/trailers/shorts/features
 *   - bct_artifacts       — text/image/video/audio outputs per step
 *   - bct_studios         — 6 founding studios
 *   - bct_directors       — 6 directors
 *   - bct_agents          — 58 named agents
 *   - bct_accounts        — user accounts
 *   - bct_platform_config — $bMovies platform token config
 *   - bct_share_sales     — primary-market royalty share sales
 *   - bct_share_listings  — secondary-market listings
 *   - bct_user_kyc        — Veriff KYC records
 *   - bct_user_wallets    — linked BRC-100 wallets per user
 *
 * Both bmovies.online (the static marketing site) and
 * app.bmovies.online (this Next.js app) share the same self-hosted
 * Supabase at api.b0ase.com, so auth sessions carry across.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api.b0ase.com'
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  // Fallback to the public anon JWT baked into bmovies.online's static
  // pages. This is the same key the public site uses — safe to expose
  // because every sensitive write goes through RLS policies.
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY3Mzk3ODYzLCJleHAiOjE5MjUwNzc4NjN9.dJlnc64RLPA1jwDaPk8gA1suwnBn7r0I5L5eojM3Iig'

// Keep a single client instance across HMR reloads so useEffect doesn't
// churn sessions during dev.
const globalAny = globalThis as any
export const bmovies: SupabaseClient =
  globalAny.__bmovies_supabase__ ??
  (globalAny.__bmovies_supabase__ = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Share the storage key with bmovies.online so a sign-in on the
      // marketing site carries into the app without a second login.
      storageKey: 'bmovies-auth',
    },
  }))

// ─── Types ───

export type OfferTier = 'pitch' | 'trailer' | 'short' | 'feature'
export type OfferStatus =
  | 'open'
  | 'funded'
  | 'in_progress'
  | 'producing'
  | 'draft'
  | 'published'
  | 'auto_published'
  | 'released'
  | 'archived'

export interface BctOffer {
  id: string
  producer_id: string | null
  producer_address: string | null
  title: string
  synopsis: string | null
  tier: OfferTier
  status: OfferStatus
  token_ticker: string | null
  token_mint_txid: string | null
  commissioner_percent: number
  parent_offer_id: string | null
  production_phase: string | null
  current_step: string | null
  created_at: string
  archived_at: string | null
}

export interface BctArtifact {
  id: number
  offer_id: string
  role: string | null
  kind: 'text' | 'image' | 'video' | 'audio'
  url: string
  model: string | null
  prompt: string | null
  step_id: string | null
  agent_id: string | null
  payment_txid: string | null
  version: number
  superseded_by: number | null
  created_at: string
}

export interface BctStudio {
  id: string
  name: string
  token_ticker: string
  token_mint_txid: string | null
  treasury_address: string
  bio: string | null
  logo_url: string | null
  founded_year: number
  aesthetic: string | null
}

export interface BctDirector {
  id: string
  studio_id: string | null
  name: string
  token_ticker: string
  token_mint_txid: string | null
  headshot_url: string | null
  bio: string | null
}

export interface BctPlatformConfig {
  id: string
  total_supply: number
  sold_supply: number
  platform_fee_percent: number
  current_tranche_price_cents: number
  treasury_address: string | null
  token_mint_txid: string | null
  updated_at: string
}

// ─── Query helpers (used from server components + server actions) ───

export async function fetchMyFilms(producerId: string) {
  const { data, error } = await bmovies
    .from('bct_offers')
    .select(
      `id, title, synopsis, tier, status, token_ticker, token_mint_txid,
       commissioner_percent, created_at, archived_at,
       bct_artifacts ( id, kind, role, url, step_id, superseded_by )`,
    )
    .eq('producer_id', producerId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as any[]
}

export async function fetchFilmById(offerId: string) {
  const { data, error } = await bmovies
    .from('bct_offers')
    .select(
      `id, title, synopsis, tier, status, token_ticker, token_mint_txid,
       commissioner_percent, producer_address, parent_offer_id, created_at,
       bct_artifacts ( id, kind, role, url, step_id, agent_id, payment_txid, superseded_by )`,
    )
    .eq('id', offerId)
    .maybeSingle()
  if (error) throw error
  return data as any
}

export async function fetchPlatformConfig() {
  const { data, error } = await bmovies
    .from('bct_platform_config')
    .select('*')
    .eq('id', 'platform')
    .maybeSingle()
  if (error) throw error
  return data as BctPlatformConfig | null
}
