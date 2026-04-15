/**
 * GET /api/platform/treasury-stats
 *
 * Aggregates the numbers that matter to the humans who eat: real
 * platform revenue, real compute cost, real margin, real distributions.
 *
 * Data sources:
 *   - Supabase                 — bct_offers, bct_x402_receipts, bct_platform_investments
 *   - Stripe                   — account balance + last 30d charges (optional, only if
 *                                STRIPE_SECRET_KEY is set)
 *
 * Response shape:
 * {
 *   revenue: {
 *     stripe_30d_cents: number,     // Stripe charges in the last 30 days
 *     x402_total_sats: number,      // all x402 payments settled (lifetime)
 *     x402_24h_sats:   number,
 *     platform_token_raised_cents: number,  // $bMovies platform token sales
 *   },
 *   costs: {
 *     compute_sats_estimate: number,  // placeholder until BSVAPI is wired
 *   },
 *   distributions: {
 *     platform_holders: { count, total_cents },
 *     film_shareholders: { count, total_sats },
 *   },
 *   catalog: {
 *     films_live: number,
 *     tokens_on_chain: number,    // canonical mints only
 *     studios: number,
 *     directors: number,
 *   }
 * }
 */

interface VercelRequest { method?: string; }
interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30');
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase env missing' });
    return;
  }
  const { createClient } = await import('@supabase/supabase-js');
  const supa = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();

  // ─── x402 totals ───
  const { data: x402All } = await supa
    .from('bct_x402_receipts')
    .select('amount_sats, created_at, offer_id, resource_type')
    .eq('verification_status', 'verified');

  const x402TotalSats = (x402All || []).reduce((s, r: any) => s + Number(r.amount_sats), 0);
  const x402_24h_sats = (x402All || [])
    .filter((r: any) => r.created_at > twentyFourHoursAgo)
    .reduce((s, r: any) => s + Number(r.amount_sats), 0);
  const filmShareholderEvents = new Set((x402All || []).map((r: any) => r.offer_id).filter(Boolean));

  // ─── Platform token (invest) revenue ───
  const { data: investments } = await supa
    .from('bct_platform_investments')
    .select('total_paid_cents, account_id')
    .eq('status', 'completed');
  const platform_token_raised_cents = (investments || []).reduce(
    (s, i: any) => s + Number(i.total_paid_cents),
    0,
  );
  const platformHolderCount = new Set((investments || []).map((i: any) => i.account_id)).size;

  // ─── Canonical on-chain mint counts ───
  // Excludes archived offers (films with dead xAI asset URLs that
  // were archived in migration 0025_archive_broken_films) so the
  // public count reflects films with working visuals.
  const { data: filmOffers } = await supa
    .from('bct_offers')
    .select('id, token_mint_txid')
    .in('tier', ['pitch', 'trailer', 'short', 'feature'])
    .is('archived_at', null);
  const canonicalFilmMints = (filmOffers || []).filter(
    (o: any) => o.token_mint_txid && /^[0-9a-f]{64}$/.test(o.token_mint_txid),
  ).length;
  const filmsLive = (filmOffers || []).filter(
    (o: any) => !/^(pitch-smoke|pitch-lock|pitch-x402|pitch-chain)/.test(o.id),
  ).length;

  const { data: studios } = await supa
    .from('bct_studios')
    .select('token_mint_txid');
  const { data: directors } = await supa
    .from('bct_directors')
    .select('token_mint_txid');
  const studiosCount = (studios || []).length;
  const directorsCount = (directors || []).length;

  // ─── Platform token ($bMovies) — the 33rd asset class ───
  // Single row in bct_platform_config. Count as one canonical token
  // if token_mint_txid is a hex64 value. Anything else means the
  // platform token hasn't been minted yet.
  const { data: platformCfg } = await supa
    .from('bct_platform_config')
    .select('token_mint_txid')
    .eq('id', 'platform')
    .maybeSingle();
  const platformTokenMinted =
    !!platformCfg?.token_mint_txid &&
    /^[0-9a-f]{64}$/.test((platformCfg as any).token_mint_txid);
  const platformTokenCount = platformTokenMinted ? 1 : 0;

  // ─── Stripe charges ───
  // Best-effort. If the key isn't configured we return nulls for this block.
  let stripe_30d_cents: number | null = null;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    try {
      const mod = await import('stripe');
      const Stripe = mod.default;
      const stripe = new Stripe(stripeKey, { apiVersion: '2026-03-25.dahlia' } as any);
      const since = Math.floor(new Date(thirtyDaysAgo).getTime() / 1000);
      const charges = await stripe.charges.list({
        limit: 100,
        created: { gte: since },
      });
      stripe_30d_cents = charges.data
        .filter((c: any) => c.status === 'succeeded' && !c.refunded)
        .reduce((sum: number, c: any) => sum + c.amount, 0);
    } catch (err) {
      console.warn('[treasury] stripe fetch failed:', (err as Error).message);
    }
  }

  // ─── Compute cost estimate ───
  // Placeholder: we don't track per-call xAI cost yet. When the BSVAPI
  // switch ships (Phase 2 plan), this will read real BSV paid to
  // BSVAPI from bct_x402_receipts where resource_type='compute'.
  const compute_sats_estimate = (x402All || [])
    .filter((r: any) => r.resource_type === 'compute')
    .reduce((s, r: any) => s + Number(r.amount_sats), 0);

  res.status(200).json({
    revenue: {
      stripe_30d_cents,
      x402_total_sats: x402TotalSats,
      x402_24h_sats,
      platform_token_raised_cents,
    },
    costs: {
      compute_sats_estimate,
    },
    distributions: {
      platform_holders: {
        count: platformHolderCount,
        total_cents: platform_token_raised_cents, // haven't distributed yet
      },
      film_shareholders: {
        count: filmShareholderEvents.size,
        total_sats: x402TotalSats,
      },
    },
    catalog: {
      films_live: filmsLive,
      tokens_on_chain:
        canonicalFilmMints + studiosCount + directorsCount + platformTokenCount,
      films_canonical_mints: canonicalFilmMints,
      studios: studiosCount,
      directors: directorsCount,
      platform_token: platformTokenMinted
        ? (platformCfg as any).token_mint_txid
        : null,
    },
  });
}
