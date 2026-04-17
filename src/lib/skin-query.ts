/**
 * Skin-aware query helpers.
 *
 * Use these wherever a list of films/offers/studios is returned to
 * the user so the two skins see two distinct catalogs. The parody
 * flag is added to bct_offers + bct_studios in migration 007.
 *
 * Keep the filter at the QUERY level, not post-fetch, so pagination
 * and row counts stay correct.
 */

import { parodyForSkin, type Skin } from './skin';

/**
 * Apply parody filter to a Supabase-style query builder. Works with
 * any object exposing an .eq(column, value) method (the Supabase JS
 * client PostgrestFilterBuilder covers this).
 *
 * Usage:
 *   const { data } = await applySkin(
 *     supabase.from('bct_offers').select('*'),
 *     skin,
 *   );
 *
 * Note: this narrows the query to the skin's universe. If you want
 * to fetch across BOTH skins (e.g. an admin view), skip this helper
 * and query raw.
 */
export function applySkin<
  T extends { eq(column: string, value: unknown): T },
>(query: T, skin: Skin, column = 'parody'): T {
  return query.eq(column, parodyForSkin(skin));
}

/**
 * Build a Postgres WHERE clause fragment for skin filtering, for
 * places that use raw SQL instead of the Supabase builder.
 *
 *   const { clause, params } = skinWhere(skin, 'o');
 *   // clause = "o.parody = $1", params = [false] (for bmovies)
 */
export function skinWhere(skin: Skin, tableAlias?: string): {
  clause: string;
  params: [boolean];
} {
  const col = tableAlias ? `${tableAlias}.parody` : 'parody';
  return { clause: `${col} = $1`, params: [parodyForSkin(skin)] };
}
