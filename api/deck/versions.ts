/**
 * GET /api/deck/versions?offerId=<id>&kind=deck|pack
 *
 * Lists the pinned snapshots for a project. The commissioner sees
 * everything; anyone else hitting this endpoint unauthenticated gets
 * only the versions that have been explicitly shared (share_token
 * set). The commissioner uses this to pick which version to view,
 * download, or send.
 *
 * Response:
 *   { versions: [
 *     { version, kind, note, pinned_at, share_token, share_url }
 *   ] }
 */

interface VercelRequest {
  method?: string;
  query?: Record<string, string | string[]>;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  setHeader(name: string, value: string): void;
}

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).json({}); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase env vars missing' });
    return;
  }

  const url = new URL(req.url || '/', 'http://x');
  const offerId = url.searchParams.get('offerId');
  const kind = url.searchParams.get('kind') === 'pack' ? 'pack' : 'deck';
  if (!offerId) {
    res.status(400).json({ error: 'offerId required' });
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from('bct_deck_snapshots')
    .select('version, kind, note, pinned_at, share_token')
    .eq('offer_id', offerId)
    .eq('kind', kind)
    .order('version', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const versions = (data || []).map((v) => ({
    ...v,
    share_url: v.share_token ? `https://bmovies.online/deck.html?v=${v.share_token}` : null,
  }));

  res.status(200).json({ versions });
}
