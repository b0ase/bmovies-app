// Pulp FictOOn — yellow pulp novel, neon diner, briefcase glow, dance
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGif, ease, credit } from './lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const W = 720, H = 405;

function frame(i, total) {
  const t = i / total;
  const yellow = '#f6d64e', neonPink = '#FF69B4', blue = '#36c8ef', red = '#e62b4a';
  let scene = '';

  if (t < 0.22) {
    // Pulp novel cover
    const p = t / 0.22;
    const op = p < 0.15 ? p/0.15 : p > 0.85 ? (1-p)/0.15 : 1;
    const tilt = -3 + Math.sin(p * Math.PI) * 2;
    scene = `
      <rect width="${W}" height="${H}" fill="#0a0a0a"/>
      <g transform="translate(${W/2} ${H/2}) rotate(${tilt.toFixed(2)})" opacity="${op}">
        <!-- book -->
        <rect x="-140" y="-160" width="280" height="320" fill="${yellow}"/>
        <!-- black bars -->
        <rect x="-140" y="-120" width="280" height="40" fill="#0a0a0a"/>
        <rect x="-140" y="100" width="280" height="60" fill="#0a0a0a"/>
        <text x="0" y="-88" text-anchor="middle"
              font-family="Bebas Neue, Impact, sans-serif" font-size="30"
              letter-spacing="3" fill="${yellow}">PULP FICT<tspan fill="${neonPink}">OO</tspan>N</text>
        <text x="0" y="140" text-anchor="middle"
              font-family="Bebas Neue, Impact, sans-serif" font-size="16"
              letter-spacing="3" fill="${yellow}">10 CENTS · 1994</text>
        <!-- revolver silhouette -->
        <g fill="#0a0a0a" transform="translate(0 -20)">
          <rect x="-40" y="0" width="80" height="14"/>
          <rect x="20" y="-6" width="24" height="26"/>
          <rect x="-50" y="14" width="20" height="30"/>
          <circle cx="30" cy="6" r="10"/>
        </g>
      </g>`;
  } else if (t < 0.48) {
    // Neon diner "PULP" text buzzing
    const p = (t - 0.22) / 0.26;
    const flicker = Math.sin(p * Math.PI * 22) > -0.6 ? 1 : 0.35;
    scene = `
      <rect width="${W}" height="${H}" fill="#0a0005"/>
      <!-- brick texture -->
      <g fill="#1a0808" opacity="0.6">
        ${[...Array(14)].map((_, y) => [...Array(12)].map((_, x) =>
          `<rect x="${x * 60 + (y % 2 ? 0 : 30)}" y="${y * 30}" width="56" height="26"/>`
        ).join('')).join('')}
      </g>
      <!-- neon sign tubes -->
      <g opacity="${flicker}">
        <text x="${W/2}" y="${H/2 + 10}" text-anchor="middle"
              font-family="Bebas Neue, Impact, sans-serif" font-size="90"
              letter-spacing="8" fill="none" stroke="${neonPink}" stroke-width="3">PULP</text>
        <text x="${W/2}" y="${H/2 + 10}" text-anchor="middle"
              font-family="Bebas Neue, Impact, sans-serif" font-size="90"
              letter-spacing="8" fill="${neonPink}" opacity="0.3">PULP</text>
      </g>
      <text x="${W/2}" y="${H/2 + 70}" text-anchor="middle"
            font-family="Bebas Neue, Impact, sans-serif" font-size="20"
            letter-spacing="6" fill="${blue}" opacity="${flicker}">JACK RABBIT SLIMS</text>
      <!-- underglow -->
      <rect x="0" y="${H - 40}" width="${W}" height="40" fill="${neonPink}" opacity="0.08"/>`;
  } else if (t < 0.74) {
    // Briefcase opening with pink glow
    const p = (t - 0.48) / 0.26;
    const glow = ease(Math.min(1, p * 1.2));
    const lidAngle = -glow * 70;
    scene = `
      <rect width="${W}" height="${H}" fill="#08030a"/>
      <!-- table top -->
      <rect x="0" y="${H*0.75}" width="${W}" height="${H*0.25}" fill="#1a0f08"/>
      <g transform="translate(${W/2} ${H*0.6})">
        <!-- case base -->
        <rect x="-120" y="-10" width="240" height="80" fill="#3a2010" stroke="#5a3a18" stroke-width="2"/>
        <!-- lid rotating open -->
        <g transform="rotate(${lidAngle})">
          <rect x="-120" y="-80" width="240" height="70" fill="#3a2010" stroke="#5a3a18" stroke-width="2"/>
        </g>
        <!-- pink glow from interior -->
        <circle cx="0" cy="-4" r="${70 * glow}" fill="${neonPink}" opacity="${(0.7 * glow).toFixed(2)}"/>
        <circle cx="0" cy="-4" r="${36 * glow}" fill="#ffd6ec" opacity="${(0.95 * glow).toFixed(2)}"/>
        <!-- latches -->
        <rect x="-60" y="-14" width="12" height="6" fill="#e8b464"/>
        <rect x="50"  y="-14" width="12" height="6" fill="#e8b464"/>
      </g>
      <text x="${W/2}" y="60" text-anchor="middle"
            font-family="Bebas Neue, Impact, sans-serif" font-size="22"
            letter-spacing="5" fill="${yellow}" opacity="${glow}">WHAT'S IN THE BRIEFCASE?</text>`;
  } else {
    // Twist dance silhouettes
    const p = (t - 0.74) / 0.26;
    const sway = Math.sin(p * Math.PI * 6);
    scene = `
      <rect width="${W}" height="${H}" fill="${yellow}"/>
      <rect x="0" y="${H*0.3}" width="${W}" height="2" fill="#0a0a0a"/>
      <rect x="0" y="${H*0.32}" width="${W}" height="2" fill="${red}"/>
      <!-- checkerboard floor -->
      <g opacity="0.5">
        ${[...Array(10)].map((_, x) => [...Array(6)].map((_, y) =>
          ((x + y) % 2 === 0) ?
            `<rect x="${x * 72}" y="${H * 0.5 + y * 30}" width="72" height="30" fill="#0a0a0a"/>` : ''
        ).join('')).join('')}
      </g>
      <!-- two dancers as pixel silhouettes with pink OO -->
      <g transform="translate(${W/2 - 100 + sway * 10} ${H/2})">
        <!-- girl -->
        <circle cx="0" cy="-30" r="20" fill="#0a0a0a"/>
        <rect x="-14" y="-10" width="28" height="40" fill="#0a0a0a"/>
        <rect x="-20" y="0" width="40" height="10" fill="${red}"/>
        <rect x="-14" y="30" width="10" height="30" fill="#0a0a0a"/>
        <rect x="4" y="30" width="10" height="30" fill="#0a0a0a"/>
        <rect x="-6" y="-30" width="3" height="4" fill="${neonPink}"/>
        <rect x="3" y="-30" width="3" height="4" fill="${neonPink}"/>
      </g>
      <g transform="translate(${W/2 + 100 - sway * 10} ${H/2})">
        <!-- guy -->
        <circle cx="0" cy="-30" r="20" fill="#0a0a0a"/>
        <rect x="-16" y="-10" width="32" height="50" fill="#0a0a0a"/>
        <rect x="-10" y="-4" width="20" height="14" fill="#fff"/>
        <rect x="-2" y="-4" width="4" height="14" fill="#0a0a0a"/>
        <rect x="-14" y="40" width="12" height="32" fill="#0a0a0a"/>
        <rect x="2" y="40" width="12" height="32" fill="#0a0a0a"/>
      </g>
      <text x="${W/2}" y="50" text-anchor="middle"
            font-family="Bebas Neue, Impact, sans-serif" font-size="28"
            letter-spacing="5" fill="#0a0a0a">PULP FICT<tspan fill="${neonPink}">OO</tspan>N</text>`;
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
  ${credit(W, H, '#f6d64e')}
</svg>`;
}

buildGif({
  outPath: resolve(ROOT, 'public/boovies-pulp-trailer.gif'),
  frameDir: '/tmp/pulp-frames',
  W, H, fps: 18, durationS: 6,
  renderFrame: frame,
});
console.log('done: pulp');
