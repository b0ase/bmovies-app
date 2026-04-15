/**
 * POST /api/feature/list-shares
 *
 * Two actions in one endpoint:
 *
 *   POST /api/feature/list-shares?action=create
 *     Body: { offerId, sharesOffered, pricePerShareCents, accountId? }
 *     Creates a row in bct_share_listings with status='open'.
 *     Only valid while the offer is in 'draft' status.
 *
 *   POST /api/feature/list-shares?action=buy
 *     Body: { listingId, email? }
 *     Generates a Stripe checkout session for the listing's full price.
 *     The Stripe webhook ('share-listing-buy' metadata type) flips the
 *     listing to 'sold' on payment.
 *
 * Listings are public-readable — the production page polls them and
 * renders the active ones below the timeline. A future BSV-21 transfer
 * worker will settle each sold listing on-chain by moving the right
 * number of tokens from the seller's address to the buyer's address.
 *
 * Env:
 *   SUPABASE_URL                  required
 *   SUPABASE_SERVICE_ROLE_KEY     required
 *   STRIPE_SECRET_KEY             required for action=buy
 */

interface VercelRequest {
  method?: string;
  body?: unknown;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  setHeader(name: string, value: string): void;
}

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const SHARES_PER_PERCENT = 10_000_000;     // 1B / 100
const MIN_SHARES = 100_000;                // smallest listing: 0.01% of supply
const MAX_PRICE_PER_SHARE_CENTS = 1_000_00; // $1,000 per share absolute ceiling

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase env vars missing' });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Record<string, unknown>) ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const queryAction = typeof req.query?.action === 'string' ? req.query.action : Array.isArray(req.query?.action) ? req.query.action[0] : undefined;
  const action = queryAction || (typeof body.action === 'string' ? body.action : 'create');

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  if (action === 'create') {
    const offerId = String(body.offerId || '').trim();
    const sharesOffered = Math.floor(Number(body.sharesOffered ?? 0));
    const pricePerShareCents = Math.round(Number(body.pricePerShareCents ?? 0));

    if (!offerId) { res.status(400).json({ error: 'offerId required' }); return; }
    if (!Number.isFinite(sharesOffered) || sharesOffered < MIN_SHARES) {
      res.status(400).json({ error: `sharesOffered must be at least ${MIN_SHARES} (0.01% of supply)` });
      return;
    }
    if (!Number.isFinite(pricePerShareCents) || pricePerShareCents < 1 || pricePerShareCents > MAX_PRICE_PER_SHARE_CENTS) {
      res.status(400).json({ error: `pricePerShareCents must be between 1 and ${MAX_PRICE_PER_SHARE_CENTS}` });
      return;
    }

    // Offer must be in draft status with presale_open=true
    const { data: offer } = await supabase
      .from('bct_offers')
      .select('id, status, presale_open, account_id, commissioner_percent, token_ticker, title')
      .eq('id', offerId)
      .maybeSingle();
    if (!offer) { res.status(404).json({ error: 'offer not found' }); return; }
    if (offer.status !== 'draft' || !offer.presale_open) {
      res.status(409).json({ error: `offer is not currently in presale (status=${offer.status}, presale_open=${offer.presale_open})` });
      return;
    }

    // Soft auth: if accountId supplied, must match the commissioner
    if (body.accountId && offer.account_id && body.accountId !== offer.account_id) {
      res.status(403).json({ error: 'only the commissioner can list shares for sale' });
      return;
    }

    // Cap: cannot list more shares than the commissioner holds
    const commissionerShares = Math.floor((Number(offer.commissioner_percent || 99) / 100) * 1_000_000_000);
    if (sharesOffered > commissionerShares) {
      res.status(400).json({ error: `sharesOffered exceeds commissioner balance (${commissionerShares})` });
      return;
    }

    const totalPriceCents = BigInt(sharesOffered) * BigInt(pricePerShareCents);
    if (totalPriceCents > BigInt(Number.MAX_SAFE_INTEGER)) {
      res.status(400).json({ error: 'total price exceeds safe integer range' });
      return;
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('bct_share_listings')
      .insert({
        offer_id: offerId,
        seller_account_id: body.accountId || offer.account_id || null,
        shares_offered: sharesOffered,
        price_per_share_cents: pricePerShareCents,
        total_price_cents: Number(totalPriceCents),
        status: 'open',
      })
      .select('id, total_price_cents')
      .single();
    if (insertErr || !inserted) {
      console.error('[list-shares.create] insert failed:', insertErr);
      res.status(500).json({ error: 'failed to create listing', detail: insertErr?.message });
      return;
    }

    const percent = (sharesOffered / 1_000_000_000) * 100;
    console.log(`[list-shares.create] listing ${inserted.id}: ${sharesOffered} shares (${percent.toFixed(4)}%) of ${offerId} at ${pricePerShareCents}¢/share = $${(inserted.total_price_cents / 100).toFixed(2)}`);
    res.status(200).json({
      ok: true,
      listingId: inserted.id,
      sharesOffered,
      pricePerShareCents,
      totalPriceCents: inserted.total_price_cents,
      percent,
    });
    return;
  }

  if (action === 'buy') {
    const listingId = Number(body.listingId);
    if (!Number.isFinite(listingId) || listingId <= 0) {
      res.status(400).json({ error: 'listingId required' });
      return;
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) { res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' }); return; }

    // Load the listing + offer
    const { data: listing } = await supabase
      .from('bct_share_listings')
      .select('id, offer_id, shares_offered, price_per_share_cents, total_price_cents, status')
      .eq('id', listingId)
      .maybeSingle();
    if (!listing) { res.status(404).json({ error: 'listing not found' }); return; }
    if (listing.status !== 'open') {
      res.status(409).json({ error: `listing is ${listing.status}, not open` });
      return;
    }

    const { data: offer } = await supabase
      .from('bct_offers')
      .select('title, token_ticker, status')
      .eq('id', listing.offer_id)
      .maybeSingle();
    if (!offer) { res.status(404).json({ error: 'offer not found' }); return; }

    let Stripe: typeof import('stripe').default;
    try {
      const mod = await import('stripe');
      Stripe = mod.default;
    } catch {
      res.status(500).json({ error: 'stripe package not installed' });
      return;
    }
    const stripe = new Stripe(stripeKey, { apiVersion: '2026-03-25.dahlia' });

    const percent = (listing.shares_offered / 1_000_000_000) * 100;

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${listing.shares_offered.toLocaleString()} royalty shares — "${offer.title}"`,
                description: `${percent.toFixed(4)}% of $${offer.token_ticker} · pre-publication market · listing #${listing.id}`,
              },
              unit_amount: Number(listing.total_price_cents),
            },
            quantity: 1,
          },
        ],
        customer_email: typeof body.email === 'string' ? body.email : undefined,
        success_url: `https://bmovies.online/production.html?id=${encodeURIComponent(listing.offer_id)}&purchase=success`,
        cancel_url: `https://bmovies.online/production.html?id=${encodeURIComponent(listing.offer_id)}&purchase=cancelled`,
        metadata: {
          type: 'share-listing-buy',
          listingId: String(listing.id),
          offerId: listing.offer_id,
          shares: String(listing.shares_offered),
          ticker: offer.token_ticker,
        },
      });

      res.status(200).json({ url: session.url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[list-shares.buy] stripe failed:', msg);
      res.status(500).json({ error: msg });
    }
    return;
  }

  if (action === 'cancel') {
    const listingId = Number(body.listingId);
    if (!Number.isFinite(listingId)) { res.status(400).json({ error: 'listingId required' }); return; }
    const { data: listing } = await supabase
      .from('bct_share_listings')
      .select('id, status, seller_account_id')
      .eq('id', listingId)
      .maybeSingle();
    if (!listing) { res.status(404).json({ error: 'listing not found' }); return; }
    if (listing.status !== 'open') { res.status(409).json({ error: `cannot cancel listing in status ${listing.status}` }); return; }
    if (body.accountId && listing.seller_account_id && body.accountId !== listing.seller_account_id) {
      res.status(403).json({ error: 'only the seller can cancel a listing' });
      return;
    }
    await supabase.from('bct_share_listings').update({ status: 'cancelled' }).eq('id', listingId);
    res.status(200).json({ ok: true, listingId });
    return;
  }

  res.status(400).json({ error: `unknown action "${action}"` });
}
