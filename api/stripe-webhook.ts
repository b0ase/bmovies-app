/**
 * POST /api/stripe-webhook
 *
 * Receives Stripe webhook events (checkout.session.completed).
 * On successful payment:
 *   1. Extracts the film metadata from session.metadata
 *   2. Inserts a bct_pitches row (the same table the micro-payment
 *      PitchVerifier uses) with status='verified' so the swarm
 *      picks it up immediately without waiting for a WoC check
 *   3. The PitchVerifier on the runner converts it to a bct_offers
 *      row, and the producer agent dispatches the team
 *
 * Verifies the webhook signature using STRIPE_WEBHOOK_SECRET to
 * prevent spoofed events.
 *
 * Env:
 *   STRIPE_SECRET_KEY      — for Stripe SDK init
 *   STRIPE_WEBHOOK_SECRET  — for signature verification
 *   SUPABASE_URL           — for writing the pitch row
 *   SUPABASE_SERVICE_ROLE_KEY — bypasses RLS
 */

interface VercelRequest {
  method?: string;
  body?: string | Buffer;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  setHeader(name: string, value: string): void;
  send(body: string): void;
}

// Vercel needs the raw body for signature verification.
// This export tells Vercel not to parse the body.
export const config = {
  api: { bodyParser: false },
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeKey || !webhookSecret) {
    res.status(500).json({ error: 'Stripe env vars missing' });
    return;
  }
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase env vars missing' });
    return;
  }

  // Read raw body for signature verification
  let rawBody: string;
  if (typeof req.body === 'string') {
    rawBody = req.body;
  } else if (Buffer.isBuffer(req.body)) {
    rawBody = req.body.toString('utf8');
  } else {
    // Vercel sometimes passes undefined body when bodyParser is off
    // — read from the request stream
    const chunks: Buffer[] = [];
    const readable = req as unknown as NodeJS.ReadableStream;
    if (typeof readable.on === 'function') {
      await new Promise<void>((resolve, reject) => {
        readable.on('data', (chunk: Buffer) => chunks.push(chunk));
        readable.on('end', resolve);
        readable.on('error', reject);
      });
    }
    rawBody = Buffer.concat(chunks).toString('utf8');
  }

  // Import Stripe + verify signature
  let Stripe: typeof import('stripe').default;
  try {
    const mod = await import('stripe');
    Stripe = mod.default;
  } catch {
    res.status(500).json({ error: 'stripe package not installed' });
    return;
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-03-25.dahlia' });
  const sig = (req.headers['stripe-signature'] as string) || '';

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Stripe webhook signature verification failed:', msg);
    res.status(400).send(`Webhook Error: ${msg}`);
    return;
  }

  // Only handle checkout.session.completed
  if (event.type !== 'checkout.session.completed') {
    res.status(200).json({ received: true, skipped: event.type });
    return;
  }

  const session = event.data.object as unknown as {
    id: string;
    metadata?: {
      title?: string;
      ticker?: string;
      synopsis?: string;
      tier?: string;
      type?: string;
      offerId?: string;
      percentBought?: string;
      priceUsd?: string;
    };
    customer_email?: string;
    amount_total?: number;
    payment_status?: string;
  };

  if (session.payment_status !== 'paid') {
    res.status(200).json({ received: true, skipped: 'not paid' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const meta = session.metadata || {};
  const customerEmail = session.customer_email || '';

  // Find or create the user's bct_accounts row.
  // If an auth.users row exists for this email, link auth_user_id so
  // the account page can find the user's films after Google sign-in.
  async function resolveAccountId(email: string): Promise<string | null> {
    if (!email) return null;

    // Look up matching auth.users row by email via DB function
    const { data: authRow } = await supabase
      .rpc('get_auth_user_by_email', { lookup_email: email })
      .maybeSingle() as { data: { id: string } | null }
    const authUserId: string | null = authRow?.id ?? null

    const { data: existing } = await supabase
      .from('bct_accounts')
      .select('id, auth_user_id')
      .eq('email', email)
      .maybeSingle();
    if (existing) {
      // Backfill auth_user_id if missing
      if (!existing.auth_user_id && authUserId) {
        await supabase.from('bct_accounts').update({ auth_user_id: authUserId }).eq('id', existing.id)
      }
      return existing.id;
    }
    const { data: created } = await supabase
      .from('bct_accounts')
      .insert({
        email,
        display_name: email.split('@')[0],
        ...(authUserId ? { auth_user_id: authUserId } : {}),
      })
      .select('id')
      .single();
    return created?.id ?? null;
  }

  const accountId = await resolveAccountId(customerEmail);

  // Branch by checkout type
  const checkoutType = meta.type || 'commission';
  const product = (meta as { product?: string }).product;

  // ─── $bMovies platform token purchase ───
  if (product === 'bmovies-platform-token') {
    const purchaseAccountId = (meta as { accountId?: string }).accountId;
    const tokens = Number((meta as { tokens?: string }).tokens || 0);
    if (!purchaseAccountId || !tokens) {
      console.error('[stripe-webhook] platform token purchase missing metadata', meta);
      res.status(400).json({ error: 'missing platform token metadata' });
      return;
    }

    // Flip the pre-inserted pending row to completed
    const { error: updErr } = await supabase
      .from('bct_platform_investments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('stripe_session_id', session.id);

    if (updErr) {
      console.error('[stripe-webhook] platform investment update failed:', updErr);
      res.status(500).json({ error: 'investment update failed' });
      return;
    }

    // Bump sold_supply on the config row
    const { data: cfg } = await supabase
      .from('bct_platform_config')
      .select('sold_supply')
      .eq('id', 'platform')
      .maybeSingle();
    const newSold = Number(cfg?.sold_supply ?? 0) + tokens;
    await supabase
      .from('bct_platform_config')
      .update({ sold_supply: newSold, updated_at: new Date().toISOString() })
      .eq('id', 'platform');

    console.log(
      `[stripe-webhook] platform token purchase completed: ${tokens} $bMovies ` +
        `to account ${purchaseAccountId} (session ${session.id})`,
    );
    res.status(200).json({ received: true, product: 'platform-token', tokens, accountId: purchaseAccountId });
    return;
  }

  // ─── Pre-publication share listing buy (from /production.html draft view) ───
  if (checkoutType === 'share-listing-buy') {
    const listingIdRaw = (meta as { listingId?: string }).listingId;
    const listingId = listingIdRaw ? Number(listingIdRaw) : NaN;
    if (!Number.isFinite(listingId)) {
      res.status(400).json({ error: 'share-listing-buy missing listingId' });
      return;
    }
    // Mark the listing sold and stamp the buyer
    const { error: updateErr } = await supabase
      .from('bct_share_listings')
      .update({
        status: 'sold',
        buyer_account_id: accountId,
        stripe_session: session.id,
        sold_at: new Date().toISOString(),
      })
      .eq('id', listingId)
      .eq('status', 'open');
    if (updateErr) {
      console.error('[stripe-webhook] share-listing-buy update failed:', updateErr);
      res.status(500).json({ error: 'listing update failed' });
      return;
    }
    console.log(`[stripe-webhook] share listing ${listingId} → sold (buyer account ${accountId})`);
    res.status(200).json({ received: true, type: 'share-listing-buy', listingId });
    return;
  }

  // ─── Share purchase (from trade.html) ───
  if (checkoutType === 'share-purchase') {
    const offerId = meta.offerId;
    const percentBought = Number(meta.percentBought || 1);
    const priceUsd = Number(meta.priceUsd || 99);

    if (!offerId) {
      res.status(400).json({ error: 'share-purchase missing offerId' });
      return;
    }

    const { error } = await supabase.from('bct_share_sales').insert({
      offer_id: offerId,
      buyer_account: accountId,
      buyer_email: customerEmail || null,
      tranche: 1, // TODO: compute from current percent_sold
      percent_bought: percentBought,
      price_usd: priceUsd,
      stripe_session: session.id,
    });

    if (error) {
      console.error('[stripe-webhook] Share sale insert failed:', error);
      res.status(500).json({ error: 'share sale insert failed' });
      return;
    }

    console.log(`[stripe-webhook] Share sale: ${percentBought}% of ${offerId} for $${priceUsd} (account ${accountId})`);
    res.status(200).json({ received: true, type: 'share-purchase', offerId });
    return;
  }

  // ─── Ticket purchase (from watch.html) ───
  if (checkoutType === 'ticket') {
    const offerId = meta.offerId;
    if (!offerId) {
      res.status(400).json({ error: 'ticket missing offerId' });
      return;
    }

    const { error } = await supabase.from('bct_ticket_sales').insert({
      offer_id: offerId,
      buyer_account: accountId,
      buyer_email: customerEmail || null,
      price_usd: 2.99,
      stripe_session: session.id,
    });

    if (error) {
      console.error('[stripe-webhook] Ticket sale insert failed:', error);
      res.status(500).json({ error: 'ticket sale insert failed' });
      return;
    }

    console.log(`[stripe-webhook] Ticket sold: ${offerId} (account ${accountId})`);
    res.status(200).json({ received: true, type: 'ticket', offerId });
    return;
  }

  // ─── Default: commission (from commission.html / account.html) ───
  const title = meta.title || 'Untitled Film';
  const ticker = meta.ticker || 'BMOVX';
  const synopsis = meta.synopsis || '';
  const tier = (meta.tier || 'feature').toLowerCase();
  // Compute the commissioner's actual % by walking the parent chain.
  // The cascade only applies when an upstream work actually exists;
  // unallocated slots roll back to the film's own holders. Mirrors
  // bct_royalty_splits view in 0015_dynamic_royalty_splits.sql.
  const parentOfferIdForFeature = (meta as { parentOfferId?: string }).parentOfferId || null;
  let featureHasGrandparent = false;
  if (parentOfferIdForFeature) {
    const { data: parentRow } = await supabase
      .from('bct_offers')
      .select('parent_offer_id')
      .eq('id', parentOfferIdForFeature)
      .maybeSingle();
    if (parentRow?.parent_offer_id) featureHasGrandparent = true;
  }
  function computePercent(t: string, hasParent: boolean, hasGrandparent: boolean): number {
    if (t === 'trailer') return 99;
    if (t === 'short') return hasParent ? 89 : 99;
    if (t === 'feature') {
      if (!hasParent) return 99;
      if (!hasGrandparent) return 89;
      return 84;
    }
    return 99;
  }
  const commissionerPercent = Number(
    (meta as { commissioner_percent?: string }).commissioner_percent ||
    computePercent(tier, !!parentOfferIdForFeature, featureHasGrandparent),
  );
  const budgetSats = tier === 'trailer' ? 500 : tier === 'short' ? 5000 : 25000;
  const pitchReceiveAddress = process.env.PITCH_RECEIVE_ADDRESS || '';

  // Trailer + short tiers create the offer directly (no financier
  // cycle) and kick off the generation pipeline immediately.
  if (tier === 'trailer' || tier === 'short') {
    const offerId = `${tier}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const parentOfferId = (meta as { parentOfferId?: string }).parentOfferId || null;
    const { error: offerErr } = await supabase.from('bct_offers').insert({
      id: offerId,
      producer_id: `stripe-${tier}`,
      producer_address: pitchReceiveAddress || '15q3UKrYYNuXRSg3gtb52pEnbaeiGK4m7b',
      title,
      synopsis,
      required_sats: tier === 'short' ? 5000 : 1000,
      raised_sats: tier === 'short' ? 5000 : 1000,
      status: 'funded',
      token_ticker: ticker,
      tier,
      commissioner_percent: commissionerPercent,
      account_id: accountId,
      parent_offer_id: parentOfferId,
    });
    if (offerErr) {
      console.error(`[stripe-webhook] ${tier} offer insert failed:`, offerErr);
      res.status(500).json({ error: 'offer insert failed' });
      return;
    }

    console.log(`[stripe-webhook] ${tier} offer created: ${offerId} — "${title}" ($${ticker})`);

    // Kick off the generation pipeline in the background.
    const origin = 'https://bmovies.online';
    const endpoint = tier === 'short' ? '/api/short/generate' : '/api/trailer/generate';
    fetch(`${origin}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId }),
    }).catch(err => {
      console.error(`[stripe-webhook] failed to kick off ${tier} pipeline:`, err);
    });

    res.status(200).json({ received: true, tier, offerId, title, ticker });
    return;
  }

  // Pitch tier — the $0.99 impulse tier. Uses the same worker as feature
  // but runs the short 5-step PITCH_NEXT chain defined in feature-worker.ts:
  // producer.token_mint → writer.logline → writer.synopsis → storyboard.poster
  // → producer.draft_open. Target wall-clock ~90s.
  if (tier === 'pitch') {
    const offerId = `pitch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const parentOfferId = (meta as { parentOfferId?: string }).parentOfferId || null;

    const { data: producers } = await supabase
      .from('bct_agents')
      .select('id')
      .eq('role', 'producer')
      .limit(10);
    const producerId = producers && producers.length > 0
      ? producers[Math.floor(Math.random() * producers.length)].id
      : 'spielbergx';

    const { error: pitchErr } = await supabase.from('bct_offers').insert({
      id: offerId,
      producer_id: producerId,
      producer_address: pitchReceiveAddress || '15q3UKrYYNuXRSg3gtb52pEnbaeiGK4m7b',
      title,
      synopsis,
      required_sats: 100,
      raised_sats: 100,
      status: 'funded',
      token_ticker: ticker,
      tier: 'pitch',
      commissioner_percent: commissionerPercent,
      account_id: accountId,
      parent_offer_id: parentOfferId,
      production_phase: 'preproduction',
      current_step: 'producer.token_mint',
      next_step_at: new Date().toISOString(),
      pipeline_state: { source: 'stripe-webhook', stripeSessionId: session.id },
    });

    if (pitchErr) {
      console.error('[stripe-webhook] pitch offer insert failed:', pitchErr);
      res.status(500).json({ error: 'pitch offer insert failed' });
      return;
    }

    console.log(`[stripe-webhook] pitch pipeline queued: ${offerId} — "${title}" ($${ticker})`);
    res.status(200).json({
      received: true,
      tier: 'pitch',
      offerId,
      productionUrl: `https://bmovies.online/production.html?id=${encodeURIComponent(offerId)}`,
    });
    return;
  }

  // Feature tier — kick off the 24h cron-driven feature pipeline.
  // Inserts a bct_offers row in `funded` status with current_step set
  // to producer.token_mint and next_step_at=now() so the Hetzner-resident
  // feature-worker.ts picks it up on the next tick.
  if (tier === 'feature') {
    const offerId = `feature-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const parentOfferId = (meta as { parentOfferId?: string }).parentOfferId || null;

    // Pick a producer agent (random studio)
    const { data: producers } = await supabase
      .from('bct_agents')
      .select('id')
      .eq('role', 'producer')
      .limit(10);
    const producerId = producers && producers.length > 0
      ? producers[Math.floor(Math.random() * producers.length)].id
      : 'spielbergx';

    const { error: featureErr } = await supabase.from('bct_offers').insert({
      id: offerId,
      producer_id: producerId,
      producer_address: pitchReceiveAddress || '15q3UKrYYNuXRSg3gtb52pEnbaeiGK4m7b',
      title,
      synopsis,
      required_sats: 25000,
      raised_sats: 25000,
      status: 'funded',
      token_ticker: ticker,
      tier: 'feature',
      commissioner_percent: commissionerPercent,
      account_id: accountId,
      parent_offer_id: parentOfferId,
      production_phase: 'preproduction',
      current_step: 'producer.token_mint',
      next_step_at: new Date().toISOString(),
      pipeline_state: { source: 'stripe-webhook', stripeSessionId: session.id },
    });

    if (featureErr) {
      console.error('[stripe-webhook] feature offer insert failed:', featureErr);
      res.status(500).json({ error: 'feature offer insert failed' });
      return;
    }

    console.log(`[stripe-webhook] feature pipeline queued: ${offerId} — "${title}" ($${ticker}) — producer=${producerId}`);
    res.status(200).json({
      received: true,
      tier: 'feature',
      offerId,
      productionUrl: `https://bmovies.online/production.html?id=${encodeURIComponent(offerId)}`,
    });
    return;
  }

  // Fallback (other tiers) — pitch/financier path
  const { error: insertError } = await supabase.from('bct_pitches').insert({
    title,
    ticker,
    synopsis,
    budget_sats: budgetSats,
    payment_address: pitchReceiveAddress,
    payment_txid: session.id,
    pitcher_address: customerEmail || null,
    status: 'verified',
    account_id: accountId,
  });

  if (insertError) {
    console.error('Failed to insert Stripe-paid pitch:', insertError);
    res.status(500).json({ error: 'pitch insert failed' });
    return;
  }

  console.log(
    `[stripe-webhook] ${tier} pitch created for "${title}" ($${ticker}) — ${session.id}, ${session.amount_total ?? 0} cents`,
  );

  res.status(200).json({ received: true, tier, title, ticker });
}
