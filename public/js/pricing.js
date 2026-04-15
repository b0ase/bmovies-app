/**
 * bMovies canonical pricing — single source of truth.
 *
 * Every page that mentions a price, a percentage, or a split
 * should import these constants. No hardcoded numbers in HTML.
 *
 * Pricing model:
 *   - $99 to commission a film (first version)
 *   - Commissioner receives 99% of ticket revenue
 *   - Studio (bMovies) receives 1%
 *   - Re-edits: each additional $99 version shifts +1% to studio
 *     (v2 = 98/2, v3 = 97/3, etc.)
 *   - Viewer ticket price: $2.99
 */

export const COMMISSION_PRICE_USD = 99;
export const TICKET_PRICE_USD = 2.99;

// Revenue split on FIRST version
export const COMMISSIONER_SHARE_PCT = 99;
export const STUDIO_SHARE_PCT = 1;

// Re-edit pricing
export const REEDIT_PRICE_USD = 99;
export const REEDIT_STUDIO_INCREMENT_PCT = 1;

// Display helpers
export const COMMISSION_PRICE_DISPLAY = '$99';
export const TICKET_PRICE_DISPLAY = '$2.99';
export const COMMISSIONER_SHARE_DISPLAY = '99%';
export const STUDIO_SHARE_DISPLAY = '1%';
