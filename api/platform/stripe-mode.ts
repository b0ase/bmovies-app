/**
 * GET /api/platform/stripe-mode
 *
 * Cheap healthcheck that confirms which Stripe environment the
 * deployed function is loaded against — without ever returning the
 * key itself, and without doing anything billable. Run this once
 * after a Stripe key rotation to make sure Vercel's env actually
 * picked up the new values before you go fishing for a card to
 * smoke-test with.
 *
 * Response shape:
 * {
 *   publishable: { mode: "live" | "test" | "missing", prefix: "pk_live" | ... },
 *   secret:      { mode: "live" | "test" | "missing", prefix: "sk_live" | ... },
 *   webhook:     { mode: "live" | "test" | "missing" },
 *   match:       boolean,                 // do publishable+secret modes agree
 *   stripe_api:  "ok" | "error" | "skipped",
 *   stripe_account: { id, country, charges_enabled } | null,
 *   timestamp:   ISO string
 * }
 *
 * Security: never returns the key value. Only the prefix. The webhook
 * secret only returns its mode (whsec_ vs whsec_test_) — not even the
 * prefix, because the whsec_ prefix is the same in both modes and the
 * length isn't useful to an attacker.
 *
 * The stripe_api block does a single read-only `stripe.accounts.retrieve()`
 * call to prove the secret key is actually accepted by Stripe — that's
 * the difference between "key is loaded" and "key works". Skipped if
 * the secret is missing.
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
  res.setHeader('Cache-Control', 'no-store');
}

type Mode = 'live' | 'test' | 'missing';

function classifyStripeKey(key: string | undefined, expect: 'pk' | 'sk'): { mode: Mode; prefix: string } {
  if (!key) return { mode: 'missing', prefix: '' };
  if (key.startsWith(`${expect}_live_`)) return { mode: 'live', prefix: `${expect}_live` };
  if (key.startsWith(`${expect}_test_`)) return { mode: 'test', prefix: `${expect}_test` };
  return { mode: 'missing', prefix: '' };
}

function classifyWebhookSecret(key: string | undefined): { mode: Mode } {
  if (!key) return { mode: 'missing' };
  // Stripe live and test webhook secrets both start with `whsec_`.
  // The dashboard does not surface a "test/live" prefix on the secret,
  // so we cannot tell them apart from the value alone. We report the
  // mode as "test" if the secret is shorter than ~60 chars (CLI test
  // secrets tend to be) and "live" otherwise. This is best-effort —
  // the only authoritative way to tell is to send a webhook through
  // and see if it verifies. Treat this field as advisory.
  if (!key.startsWith('whsec_')) return { mode: 'missing' };
  return { mode: key.length > 60 ? 'live' : 'test' };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const publishable = classifyStripeKey(
    process.env.STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    'pk',
  );
  const secret = classifyStripeKey(process.env.STRIPE_SECRET_KEY, 'sk');
  const webhook = classifyWebhookSecret(process.env.STRIPE_WEBHOOK_SECRET);

  const knownModes = [publishable.mode, secret.mode].filter(m => m !== 'missing');
  const match = knownModes.length === 2 && knownModes[0] === knownModes[1];

  let stripeApi: 'ok' | 'error' | 'skipped' = 'skipped';
  let stripeAccount: { id: string; country: string | null; charges_enabled: boolean } | null = null;
  let stripeError: string | null = null;

  if (secret.mode !== 'missing' && process.env.STRIPE_SECRET_KEY) {
    try {
      const mod = await import('stripe');
      const Stripe = mod.default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' } as any);
      // Zero-arg retrieve() returns the platform's own account (no
      // connected-account ID needed). Some versions of the Stripe
      // type definitions require an explicit id, but the runtime
      // accepts no args. Cast to any to bypass the type check.
      const account = await (stripe.accounts as any).retrieve();
      stripeAccount = {
        id: account.id,
        country: account.country || null,
        charges_enabled: !!account.charges_enabled,
      };
      stripeApi = 'ok';
    } catch (err) {
      stripeApi = 'error';
      stripeError = (err as Error).message;
    }
  }

  res.status(200).json({
    publishable,
    secret,
    webhook,
    match,
    stripe_api: stripeApi,
    stripe_account: stripeAccount,
    stripe_error: stripeError,
    timestamp: new Date().toISOString(),
  });
}
