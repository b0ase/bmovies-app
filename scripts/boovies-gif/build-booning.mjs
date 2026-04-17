// The bOOning — hotel carpet, twin OO eyes, REDRUM, axe-through-door
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGif, ease, credit } from './lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const W = 720, H = 405;

function frame(i, total) {
  const t = i / total;
  const carpet = '#c04020', beige = '#c9d0d8', blood = '#9a0c1a', pink = '#FF69B4';
  let scene = '';

  if (t < 0.25) {
    // Hotel carpet pattern (hexagonal) — scrolling forward
    const p = t / 0.25;
    const scroll = p * 60;
    const op = p < 0.15 ? p/0.15 : p > 0.85 ? (1-p)/0.15 : 1;
    const tiles = [];
    const size = 36;
    for (let y = -2; y < H/size + 2; y++) {
      for (let x = -2; x < W/size + 2; x++) {
        const cx = x * size + (y % 2 ? size/2 : 0);
        const cy = y * size + scroll;
        tiles.push(`<polygon points="${cx},${cy-16} ${cx+14},${cy-8} ${cx+14},${cy+8} ${cx},${cy+16} ${cx-14},${cy+8} ${cx-14},${cy-8}" fill="${carpet}" stroke="#3a0d0a" stroke-width="1"/>`);
        tiles.push(`<polygon points="${cx},${cy-8} ${cx+6},${cy-4} ${cx+6},${cy+4} ${cx},${cy+8} ${cx-6},${cy+4} ${cx-6},${cy-4}" fill="#e8a860" opacity="0.7"/>`);
      }
    }
    scene = `
      ${tiles.join('')}
      <!-- tricycle wheel at bottom -->
      <g transform="translate(${W/2} ${H - 60})" opacity="${op}">
        <circle r="30" fill="#0a0a0a"/>
        <circle r="22" fill="#2a2a2a"/>
        <circle r="4" fill="${pink}"/>
      </g>
      <text x="${W/2}" y="60" text-anchor="middle"
            font-family="Bebas Neue, Impact, serif" font-size="18"
            letter-spacing="5" fill="${beige}" opacity="${op}">COME PLAY WITH US…</text>`;
  } else if (t < 0.5) {
    // Twin OO eyes in dark hallway (the twins!)
    const p = (t - 0.25) / 0.25;
    const flicker = Math.sin(p * Math.PI * 12) > -0.3 ? 1 : 0.4;
    const advance = p * 60;
    scene = `
      <rect width="${W}" height="${H}" fill="#0a0005"/>
      <!-- hallway perspective -->
      <polygon points="0,0 ${W},0 ${W*0.65},${H*0.5} ${W*0.35},${H*0.5}" fill="#14080a"/>
      <polygon points="0,${H} ${W},${H} ${W*0.65},${H*0.5} ${W*0.35},${H*0.5}" fill="${carpet}" opacity="0.4"/>
      <!-- receding walls -->
      <line x1="0" y1="0" x2="${W*0.35}" y2="${H*0.5}" stroke="${blood}" stroke-width="2" opacity="0.3"/>
      <line x1="${W}" y1="0" x2="${W*0.65}" y2="${H*0.5}" stroke="${blood}" stroke-width="2" opacity="0.3"/>
      <!-- twin figures -->
      <g transform="translate(${W/2 - 60} ${H*0.5 + advance * 0.4})" opacity="${flicker}">
        <rect x="-28" y="0" width="56" height="${80 + advance * 0.3}" fill="${pink}"/>
        <circle cx="0" cy="-8" r="22" fill="${beige}"/>
        <!-- OO eyes -->
        <circle cx="-8" cy="-8" r="3" fill="#000"/>
        <circle cx="8" cy="-8" r="3" fill="#000"/>
      </g>
      <g transform="translate(${W/2 + 60} ${H*0.5 + advance * 0.4})" opacity="${flicker}">
        <rect x="-28" y="0" width="56" height="${80 + advance * 0.3}" fill="${pink}"/>
        <circle cx="0" cy="-8" r="22" fill="${beige}"/>
        <circle cx="-8" cy="-8" r="3" fill="#000"/>
        <circle cx="8" cy="-8" r="3" fill="#000"/>
      </g>
      <text x="${W/2}" y="40" text-anchor="middle"
            font-family="Bebas Neue, Impact, serif" font-size="18"
            letter-spacing="5" fill="${blood}" opacity="${flicker}">FOREVER AND EVER AND EVER</text>`;
  } else if (t < 0.75) {
    // REDRUM dripping text
    const p = (t - 0.5) / 0.25;
    const drip = Math.min(1, p * 1.3);
    const drops = [];
    for (let k = 0; k < 6; k++) {
      const dx = 120 + k * 80;
      const dy = H/2 + 40 + Math.sin(p * Math.PI * 2 + k) * 10 + drip * 80;
      drops.push(`<rect x="${dx}" y="${H/2 + 30}" width="3" height="${drip * 60}" fill="${blood}"/>`);
      drops.push(`<circle cx="${dx + 1.5}" cy="${dy.toFixed(0)}" r="3" fill="${blood}"/>`);
    }
    scene = `
      <rect width="${W}" height="${H}" fill="#f8f2ee"/>
      <!-- mirror frame -->
      <rect x="60" y="60" width="${W - 120}" height="${H - 120}" fill="none" stroke="${beige}" stroke-width="6"/>
      <rect x="66" y="66" width="${W - 132}" height="${H - 132}" fill="#e8e0da"/>
      <!-- REDRUM text -->
      <text x="${W/2}" y="${H/2 + 20}" text-anchor="middle"
            font-family="Bebas Neue, Impact, serif" font-size="70"
            letter-spacing="14" fill="${blood}"
            transform="scale(-1 1) translate(${-W} 0)">REDRUM</text>
      ${drops.join('')}
      <text x="${W/2}" y="${H - 30}" text-anchor="middle"
            font-family="Inter, sans-serif" font-size="11"
            letter-spacing="3" fill="#6a0810">(ALL JIGGLE · NO WOBBLE)</text>`;
  } else {
    // Axe splitting door — "HEEEERE'S JIGGLY!"
    const p = (t - 0.75) / 0.25;
    const axe = ease(Math.min(1, p * 1.5));
    scene = `
      <rect width="${W}" height="${H}" fill="#0a0000"/>
      <!-- door -->
      <rect x="${W/2 - 140}" y="40" width="280" height="${H - 80}" fill="#3a1f0a"/>
      <rect x="${W/2 - 130}" y="50" width="260" height="${H - 100}" fill="#5a3418"/>
      <rect x="${W/2 - 130}" y="${H/2}" width="260" height="3" fill="#3a1f0a"/>
      <!-- knob -->
      <circle cx="${W/2 + 100}" cy="${H/2 + 60}" r="6" fill="#e8b464"/>
      <!-- axe split -->
      <g transform="translate(${W/2} ${H/2})" opacity="${axe}">
        <polygon points="-80,-60 80,-60 20,60 -20,60" fill="#1a0a05" opacity="${axe}"/>
        <!-- pink face peering through -->
        <rect x="-36" y="-14" width="72" height="40" fill="${pink}" opacity="${axe}"/>
        <!-- eye OO -->
        <circle cx="-14" cy="4" r="5" fill="#0a0a0a"/>
        <circle cx="14" cy="4" r="5" fill="#0a0a0a"/>
        <!-- smile -->
        <path d="M -16 16 Q 0 26 16 16" stroke="#0a0a0a" stroke-width="2" fill="none"/>
      </g>
      <!-- axe blade -->
      <g transform="translate(${W/2 + 160 - axe * 140} ${H/2 - 40}) rotate(${-30 + axe * 30})" opacity="${axe}">
        <rect x="0" y="0" width="8" height="140" fill="#3a1f0a"/>
        <polygon points="-30,-10 30,-10 40,20 -20,20" fill="#8a8a8a"/>
        <polygon points="-30,-10 30,-10 40,20 -20,20" fill="url(#bladeShade)"/>
      </g>
      <defs>
        <linearGradient id="bladeShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ccc"/>
          <stop offset="100%" stop-color="#555"/>
        </linearGradient>
      </defs>
      <text x="${W/2}" y="${H - 30}" text-anchor="middle"
            font-family="Bebas Neue, Impact, serif" font-size="22"
            letter-spacing="6" fill="${blood}" opacity="${axe}">HEEERE'S JIGGLY!</text>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
      <stop offset="60%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.85"/>
    </radialGradient>
  </defs>
  ${scene}
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
  ${credit(W, H, '#9a0c1a')}
</svg>`;
}

buildGif({
  outPath: resolve(ROOT, 'public/boovies-booning-trailer.gif'),
  frameDir: '/tmp/booning-frames',
  W, H, fps: 18, durationS: 6,
  renderFrame: frame,
});
console.log('done: booning');
