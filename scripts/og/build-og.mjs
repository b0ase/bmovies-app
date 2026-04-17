// scripts/og/build-og.mjs
//
// Generate public/bmovies_og.jpg from the bMovies logo + hero strapline.
//
// Layout: 1200×630 (standard OG / Twitter summary_large_image).
//   ▪ Black canvas
//   ▪ Centred red-bordered "logo box" with the bMovies wordmark inside
//     (inlined from public/bmovies-logo.svg so rsvg-convert doesn't need
//     to resolve externals)
//   ▪ Three-line strapline below, matching the homepage hero copy
//       Commission your movie.
//       Sell royalty shares to finance it.   (red "to finance it")
//       Earn from every ticket sold.
//
// Font note: Bebas Neue isn't installed on typical hosts, so rsvg will
// fall back to Impact / Helvetica Condensed Black — both wider than
// Bebas. Each line carries textLength + lengthAdjust="spacingAndGlyphs"
// to force-fit the canvas regardless of which font the renderer picks.
//
// Toolchain: rsvg-convert (Homebrew librsvg) for SVG→PNG, then sharp
// for PNG→JPG.
//
// Usage:
//   node scripts/og/build-og.mjs
//
// Re-run whenever the strapline or the brand mark changes.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const W = 1200;
const H = 630;
const RED = '#E50914';
const WHITE = '#FFFFFF';

// ─── Inline the bMovies logo ────────────────────────────────
const logoFull = readFileSync(resolve(ROOT, 'public/bmovies-logo.svg'), 'utf8');
// Strip the outer <svg …>…</svg> wrapper; keep <defs> + children.
const logoInner = logoFull
  .replace(/^[\s\S]*?<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '')
  .trim();

// Logo source viewBox is 0 0 400 100. Artwork runs x≈10..363,
// y≈6..103. Target inside-box width drives the scale.
const LOGO_TARGET_W = 620;
const LOGO_SCALE = LOGO_TARGET_W / 400;    // 1.55
const LOGO_W = 400 * LOGO_SCALE;
const LOGO_H = 103 * LOGO_SCALE;

// Logo box — comfortable padding around the wordmark.
const BOX_W = 800;
const BOX_H = 240;
const BOX_X = (W - BOX_W) / 2;
const BOX_Y = 70;
const BOX_BORDER = 6;

const LOGO_X = BOX_X + (BOX_W - LOGO_W) / 2;
const LOGO_Y = BOX_Y + (BOX_H - LOGO_H) / 2;

// Strapline — sized so the longest line ("SELL ROYALTY SHARES TO
// FINANCE IT.", 34 chars) fits the canvas at the fallback font's
// natural width. librsvg ignores textLength on multi-tspan lines so
// we can't rely on force-fitting; we set the size small enough that
// every line clears the edges without it.
const STRAP_FONT = 'Bebas Neue, Impact, &apos;Helvetica Neue Condensed Black&apos;, &apos;Arial Black&apos;, sans-serif';
const STRAP_SIZE = 44;
const STRAP_LEAD = 56;
const STRAP_Y0 = BOX_Y + BOX_H + 85;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="vg" cx="50%" cy="40%" r="80%">
      <stop offset="0%"  stop-color="#1a0003" stop-opacity="0.9"/>
      <stop offset="70%" stop-color="#000000" stop-opacity="1"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="#000000"/>
  <rect width="${W}" height="${H}" fill="url(#vg)"/>

  <!-- Red-bordered logo box -->
  <rect
    x="${BOX_X}" y="${BOX_Y}" width="${BOX_W}" height="${BOX_H}"
    fill="#000000"
    stroke="${RED}" stroke-width="${BOX_BORDER}"
  />

  <!-- bMovies logo, inlined + scaled -->
  <g transform="translate(${LOGO_X} ${LOGO_Y}) scale(${LOGO_SCALE})">
    ${logoInner}
  </g>

  <!-- Three-line strapline. xml:space="preserve" keeps the trailing
       space inside the white "SHARES " tspan so it doesn't butt up
       against the red "TO FINANCE IT". -->
  <g font-family="${STRAP_FONT}" font-weight="900" font-size="${STRAP_SIZE}"
     text-anchor="middle" fill="${WHITE}">
    <text x="${W / 2}" y="${STRAP_Y0}">COMMISSION YOUR MOVIE.</text>

    <text x="${W / 2}" y="${STRAP_Y0 + STRAP_LEAD}" xml:space="preserve">SELL ROYALTY SHARES <tspan fill="${RED}">TO FINANCE IT</tspan>.</text>

    <text x="${W / 2}" y="${STRAP_Y0 + STRAP_LEAD * 2}">EARN FROM EVERY TICKET SOLD.</text>
  </g>

  <!-- Bottom red rule, echoing the logo's accent bar -->
  <rect x="0" y="${H - 8}" width="${W}" height="8" fill="${RED}" opacity="0.9"/>
</svg>
`;

const svgPath = resolve(ROOT, 'public/bmovies_og.svg');
const pngPath = resolve(ROOT, 'public/bmovies_og.png');
const jpgPath = resolve(ROOT, 'public/bmovies_og.jpg');

writeFileSync(svgPath, svg);
console.log(`[og] wrote SVG ${svgPath}`);

execFileSync('rsvg-convert', [
  '-w', String(W),
  '-h', String(H),
  '-o', pngPath,
  svgPath,
]);
console.log(`[og] wrote PNG ${pngPath}`);

await sharp(pngPath)
  .jpeg({ quality: 88, progressive: true, mozjpeg: true })
  .toFile(jpgPath);
console.log(`[og] wrote JPG ${jpgPath}`);
