/**
 * Bonding curve pricing for royalty tokens.
 *
 * Every film has 1 billion tokens divided into 10 tranches of 100M each.
 * Each tranche has a fixed price per 1% of the total supply. Early
 * tranches are cheap; later ones get exponentially more expensive.
 *
 * This creates a real incentive structure: the commissioner sells
 * early tiers cheap to raise initial capital, early believers get in
 * at the best price, and later investors only buy in if the film has
 * already proven demand.
 */

export const TOTAL_SUPPLY = 1_000_000_000;
export const TRANCHE_SIZE = 100_000_000;
export const TOKENS_PER_PERCENT = TOTAL_SUPPLY / 100;

// Base curve, calibrated for a SHORT-tier offer (i.e. one raising
// $999 toward a feature upgrade → 10% costs $999 → tier-1 price $99/1%).
// Every tranche doubles-ish from there. For offers at a different tier
// (pitch / trailer / feature) the curve scales by SHORT_TO_TIER_RATIO
// below — see scaledTranches(offerTier).
export const TRANCHES = [
  { tier: 1,  minPct: 0,  maxPct: 10, pricePerPercent: 99 },
  { tier: 2,  minPct: 10, maxPct: 20, pricePerPercent: 999 },
  { tier: 3,  minPct: 20, maxPct: 30, pricePerPercent: 9999 },
  { tier: 4,  minPct: 30, maxPct: 40, pricePerPercent: 19999 },
  { tier: 5,  minPct: 40, maxPct: 50, pricePerPercent: 29999 },
  { tier: 6,  minPct: 50, maxPct: 60, pricePerPercent: 39999 },
  { tier: 7,  minPct: 60, maxPct: 70, pricePerPercent: 49999 },
  { tier: 8,  minPct: 70, maxPct: 80, pricePerPercent: 59999 },
  { tier: 9,  minPct: 80, maxPct: 90, pricePerPercent: 69999 },
  { tier: 10, minPct: 90, maxPct: 100, pricePerPercent: 99999 },
];

// Relative scale per film tier. The tier-1 tranche price for each film
// tier equals that tier's "raise 10% for the next upgrade cost":
//   pitch   → next=trailer ($9.99)  → tier-1 = $0.999/1%  (scale 0.01)
//   trailer → next=short   ($99)    → tier-1 = $9.90/1%   (scale 0.10)
//   short   → next=feature ($999)   → tier-1 = $99.00/1%  (scale 1.00, baseline)
//   feature → next=marketing($9999) → tier-1 = $999/1%    (scale 10.0)
// The rest of the bonding curve scales by the same factor so every
// film tier has a coherent 10-step curve.
export const TIER_SCALE = {
  pitch:   0.01,
  trailer: 0.10,
  short:   1.00,
  feature: 10.00,
};

// Return a tier-scaled copy of TRANCHES for a given offer tier.
// Price rounds to 2 decimal places so USD amounts display cleanly
// ($9.90, not $9.900000000001).
export function scaledTranches(offerTier) {
  const factor = TIER_SCALE[offerTier] ?? 1;
  return TRANCHES.map((t) => ({
    ...t,
    pricePerPercent: Math.round(t.pricePerPercent * factor * 100) / 100,
  }));
}

// Accepts an optional custom tranche array (e.g. one returned by
// scaledTranches(offerTier)). Falls back to the default short-tier
// TRANCHES for backward compat.
export function getCurrentTranche(pctSold, tranches = TRANCHES) {
  for (const t of tranches) {
    if (pctSold < t.maxPct) return t;
  }
  return tranches[tranches.length - 1];
}

export function getTranchePrice(tier, tranches = TRANCHES) {
  return tranches[Math.max(0, Math.min(9, tier - 1))].pricePerPercent;
}

export function formatUsd(n) {
  if (n >= 1000) return '$' + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k';
  // Sub-$1000: preserve cents when the amount isn't a whole dollar so
  // tier-scaled prices like $9.90 or $0.99 don't round away to $10 / $1.
  if (Number.isInteger(n)) return '$' + n.toFixed(0);
  if (n < 10) return '$' + n.toFixed(2);
  return '$' + n.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Calculate the cumulative amount raised if the first N% of tokens
 * have been sold through the bonding curve. Accepts an optional
 * tranche array so tier-scaled curves produce tier-scaled totals.
 */
export function cumulativeRaised(pctSold, tranches = TRANCHES) {
  let total = 0;
  for (const t of tranches) {
    if (pctSold >= t.maxPct) {
      total += 10 * t.pricePerPercent;
    } else if (pctSold > t.minPct) {
      total += (pctSold - t.minPct) * t.pricePerPercent;
      break;
    }
  }
  return total;
}

/**
 * Render an HTML tranche table showing all 10 tiers with the current
 * tier highlighted.
 */
export function renderTrancheTable(pctSold, opts = {}) {
  const theme = opts.theme || 'dark';
  const tranches = opts.tranches || TRANCHES;
  const current = getCurrentTranche(pctSold, tranches);
  const bg = theme === 'dark' ? '#0a0a0a' : '#fff';
  const border = theme === 'dark' ? '#222' : '#eee';
  const textMuted = theme === 'dark' ? '#666' : '#999';
  const text = theme === 'dark' ? '#fff' : '#111';
  const highlight = '#E50914';

  return `
    <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
      <thead>
        <tr style="border-bottom:2px solid ${highlight};">
          <th style="text-align:left;padding:0.6rem 0.5rem;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:${textMuted};">Tier</th>
          <th style="text-align:left;padding:0.6rem 0.5rem;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:${textMuted};">Range</th>
          <th style="text-align:right;padding:0.6rem 0.5rem;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:${textMuted};">Price per 1%</th>
          <th style="text-align:right;padding:0.6rem 0.5rem;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:${textMuted};">Tokens</th>
        </tr>
      </thead>
      <tbody>
        ${tranches.map(t => {
          const isCurrent = t.tier === current.tier;
          const bgColor = isCurrent ? 'rgba(229, 9, 20, 0.1)' : 'transparent';
          const color = isCurrent ? highlight : text;
          return `
            <tr style="border-bottom:1px solid ${border};background:${bgColor};">
              <td style="padding:0.7rem 0.5rem;font-weight:700;color:${color};font-family:monospace;">${t.tier}${isCurrent ? ' ◀' : ''}</td>
              <td style="padding:0.7rem 0.5rem;color:${color};">${t.minPct}% – ${t.maxPct}%</td>
              <td style="padding:0.7rem 0.5rem;text-align:right;font-weight:700;color:${color};font-family:monospace;">${formatUsd(t.pricePerPercent)}</td>
              <td style="padding:0.7rem 0.5rem;text-align:right;color:${color};font-family:monospace;font-size:0.75rem;">10M</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}
