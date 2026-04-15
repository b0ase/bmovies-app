/**
 * bMovies auth module — Supabase Auth wrapper.
 *
 * Handles sign-in (email/password, Google, GitHub), session
 * management, and account creation. Every page that needs auth
 * imports this module.
 *
 * The Supabase instance is the same Hetzner-hosted one the
 * productions/leaderboard pages already query. Auth runs through
 * Supabase's built-in GoTrue endpoints — no custom backend needed.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0';

const SUPABASE_URL = 'https://api.b0ase.com';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY3Mzk3ODYzLCJleHAiOjE5MjUwNzc4NjN9.dJlnc64RLPA1jwDaPk8gA1suwnBn7r0I5L5eojM3Iig';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: 'bmovies-auth',
    lock: false,
  },
});

/**
 * Get the current session (if the user is signed in).
 * Returns { user, session } or { user: null, session: null }.
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return { user: null, session: null };
  return { user: session.user, session };
}

/**
 * Sign in with email + password.
 */
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Sign up with email + password.
 */
export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  // Create a bct_accounts row for the new user
  if (data.user) {
    await ensureAccount(data.user);
  }
  return data;
}

/**
 * Sign in with a social provider (Google, GitHub, Discord).
 * Redirects the browser to the provider's OAuth flow.
 */
export async function signInWithProvider(provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin + '/account.html',
      skipBrowserRedirect: false,
    },
  });
  if (error) throw error;
  if (data?.url) {
    window.location.href = data.url;
  }
  return data;
}

// bMovies-specific Google OAuth client ID (GSI popup flow). The Google
// consent screen shows "bMovies" instead of the shared b0ase.com client.
// GoTrue on api.b0ase.com has this client ID on its allowed-audiences
// list, so signInWithIdToken will happily mint a session from tokens
// issued to it.
export const BMOVIES_GOOGLE_CLIENT_ID =
  '325838379150-0ittv6q8t2hnegicsnp2mectcanp5li4.apps.googleusercontent.com';

async function waitForGsi(timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (window.google?.accounts?.id) return;
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('Google Identity Services script failed to load');
}

/**
 * Renders the official Google "Sign in with Google" button into the
 * container element. When the user picks their Google account, GSI
 * returns an id_token, we hand it to Supabase via signInWithIdToken,
 * and on success we call onSuccess().
 */
export async function mountGoogleSignInButton(container, onSuccess, onError) {
  await waitForGsi();
  window.google.accounts.id.initialize({
    client_id: BMOVIES_GOOGLE_CLIENT_ID,
    ux_mode: 'popup',
    auto_select: false,
    itp_support: true,
    callback: async (response) => {
      try {
        if (!response?.credential) throw new Error('No credential returned from Google');
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.credential,
        });
        if (error) throw error;
        onSuccess?.(data);
      } catch (err) {
        onError?.(err);
      }
    },
  });
  window.google.accounts.id.renderButton(container, {
    type: 'standard',
    theme: 'filled_black',
    size: 'large',
    text: 'continue_with',
    shape: 'rectangular',
    logo_alignment: 'left',
    width: 320,
  });
}

/**
 * Sign out.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Ensure a bct_accounts row exists for the given auth user.
 * Called after sign-up and after OAuth redirect.
 */
export async function ensureAccount(user) {
  if (!user) return null;
  // Check if account already exists
  const { data: existing } = await supabase
    .from('bct_accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (existing) return existing;
  // Create new account
  const { data: created, error } = await supabase
    .from('bct_accounts')
    .insert({
      auth_user_id: user.id,
      email: user.email,
      display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
    })
    .select('id')
    .maybeSingle();
  if (error) {
    console.warn('[auth] Failed to create account:', error.message);
    return null;
  }
  return created;
}

/**
 * Get the current user's bct_accounts row with their movies.
 */
export async function getMyAccount() {
  const { user } = await getSession();
  if (!user) return null;
  await ensureAccount(user);
  const { data } = await supabase
    .from('bct_accounts')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  return data;
}

/**
 * Get all movies (bct_offers) owned by the current user's account.
 */
export async function getMyMovies() {
  const account = await getMyAccount();
  if (!account) return [];
  const { data } = await supabase
    .from('bct_offers')
    .select('*, bct_artifacts(id, kind, url, model, role)')
    .eq('account_id', account.id)
    .order('created_at', { ascending: false });
  return data || [];
}

/**
 * Listen for auth state changes (sign in, sign out, token refresh).
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
