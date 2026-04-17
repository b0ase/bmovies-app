// Raid-OO-rs — golden idol, rolling boulder, map trail, ark reveal
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGif, ease, credit } from './lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const W = 720, H = 405;

function frame(i, total) {
  const t = i / total;
  const gold = '#e8b464', darkGold = '#8a5a10', pink = '#FF69B4', sand = '#c9a063', brown = '#2a1708';
  let scene = '';

  if (t < 0.25) {
    // Golden idol on pedestal
    const p = t / 0.25;
    const op = p < 0.15 ? p/0.15 : p > 0.85 ? (1-p)/0.15 : 1;
    // shaft of light
    const beamAngle = -18;
    scene = `
      <rect width="${W}" height="${H}" fill="${brown}"/>
      <!-- stone floor tiles -->
      <g fill="#1a0a03" opacity="0.6">
        <rect x="0" y="${H - 60}" width="${W}" height="60"/>
        <line x1="0" y1="${H-60}" x2="${W}" y2="${H-60}" stroke="#3a1f0a" stroke-width="2"/>
      </g>
      <!-- light shaft -->
      <polygon points="${W/2 - 40},0 ${W/2 + 40},0 ${W/2 + 110},${H - 80} ${W/2 - 110},${H - 80}" fill="${gold}" opacity="${0.18 * op}"/>
      <!-- pedestal -->
      <rect x="${W/2 - 50}" y="${H - 120}" width="100" height="60" fill="#3a1f0a"/>
      <rect x="${W/2 - 60}" y="${H - 128}" width="120" height="10" fill="#5a3418"/>
      <!-- golden idol: pink-OO head on body -->
      <g transform="translate(${W/2} ${H - 150})" opacity="${op}">
        <rect x="-18" y="-20" width="36" height="30" fill="${gold}"/>
        <rect x="-24" y="-30" width="48" height="18" fill="${gold}"/>
        <!-- crown rays -->
        <polygon points="0,-44 -4,-32 4,-32" fill="${gold}"/>
        <polygon points="-14,-40 -14,-28 -6,-30" fill="${gold}"/>
        <polygon points="14,-40 14,-28 6,-30" fill="${gold}"/>
        <!-- pink eyes -->
        <rect x="-10" y="-20" width="4" height="6" fill="${pink}"/>
        <rect x="6" y="-20" width="4" height="6" fill="${pink}"/>
      </g>
      <text x="${W/2}" y="40" text-anchor="middle"
            font-family="Bebas Neue, Impact, serif" font-size="20"
            letter-spacing="5" fill="${gold}" opacity="${op}">IT BELONGS IN A MUSEUM</text>`;
  } else if (t < 0.5) {
    // Rolling boulder chase
    const p = (t - 0.25) / 0.25;
    const boulderX = -150 + p * (W + 300);
    const rot = p * 720;
    scene = `
      <rect width="${W}" height="${H}" fill="${brown}"/>
      <!-- tunnel walls -->
      <polygon points="0,0 ${W},0 ${W},${H} 0,${H}" fill="url(#tunnel)"/>
      <defs>
        <radialGradient id="tunnel" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stop-color="#5a3418"/>
          <stop offset="100%" stop-color="#0a0500"/>
        </radialGradient>
      </defs>
      <!-- floor -->
      <rect x="0" y="${H - 80}" width="${W}" height="80" fill="#2a1708"/>
      <!-- boulder -->
      <g transform="translate(${boulderX.toFixed(1)} ${H - 130}) rotate(${rot.toFixed(1)})">
        <circle r="85" fill="#6a4a20"/>
        <circle r="85" fill="url(#boulderShade)"/>
        <g fill="#3a2008">
          <circle cx="-30" cy="-10" r="8"/>
          <circle cx="20"  cy="20" r="6"/>
          <circle cx="15"  cy="-35" r="5"/>
          <circle cx="-45" cy="25" r="7"/>
        </g>
      </g>
      <defs>
        <radialGradient id="boulderShade" cx="0.3" cy="0.3" r="0.8">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.5"/>
        </radialGradient>
      </defs>
      <!-- running figure -->
      <g transform="translate(${Math.min(boulderX + 140, W - 60)} ${H - 120})" fill="${brown}">
        <rect x="-10" y="-20" width="20" height="26"/>
        <circle cx="0" cy="-30" r="8"/>
        <!-- fedora -->
        <rect x="-12" y="-36" width="24" height="4" fill="#3a1f0a"/>
        <ellipse cx="0" cy="-38" rx="16" ry="3" fill="#3a1f0a"/>
        <!-- legs running -->
        <rect x="-8" y="6" width="6" height="${14 + Math.sin(p * Math.PI * 8) * 4}" />
        <rect x="2"  y="6" width="6" height="${14 - Math.sin(p * Math.PI * 8) * 4}" />
      </g>`;
  } else if (t < 0.75) {
    // Map with dotted line traversing
    const p = (t - 0.5) / 0.25;
    const dashProgress = Math.min(1, p * 1.4);
    // Draw path points
    const pts = [[150, 280], [230, 240], [310, 260], [380, 210], [460, 230], [540, 180]];
    const visiblePts = pts.slice(0, Math.max(1, Math.floor(dashProgress * pts.length)));
    const lastIdx = visiblePts.length - 1;
    const nextPt = pts[Math.min(pts.length - 1, lastIdx + 1)];
    scene = `
      <rect width="${W}" height="${H}" fill="${sand}"/>
      <!-- crinkled map texture lines -->
      <g stroke="${darkGold}" stroke-width="0.5" opacity="0.25" fill="none">
        <path d="M 40 60 Q 200 80 400 50 T 700 70"/>
        <path d="M 40 340 Q 200 320 400 360 T 700 330"/>
      </g>
      <!-- continents -->
      <g fill="${darkGold}" opacity="0.35">
        <path d="M 80 150 Q 200 100 300 170 Q 320 250 200 290 Q 100 270 80 200 Z"/>
        <path d="M 400 120 Q 520 100 600 180 Q 640 260 540 300 Q 440 270 400 200 Z"/>
      </g>
      <!-- mountains -->
      <g fill="${brown}" opacity="0.5">
        <polygon points="180,220 200,180 220,220"/>
        <polygon points="280,210 300,170 320,210"/>
        <polygon points="420,180 440,140 460,180"/>
      </g>
      <!-- dotted path -->
      <g stroke="${pink}" stroke-width="3" stroke-dasharray="6 5" fill="none">
        ${visiblePts.slice(0, -1).map((pt, idx) =>
          `<line x1="${pt[0]}" y1="${pt[1]}" x2="${visiblePts[idx+1][0]}" y2="${visiblePts[idx+1][1]}"/>`
        ).join('')}
      </g>
      ${visiblePts.map(pt => `<circle cx="${pt[0]}" cy="${pt[1]}" r="4" fill="${pink}"/>`).join('')}
      <!-- plane silhouette at head of path -->
      ${lastIdx < pts.length - 1 ? `
      <g transform="translate(${visiblePts[lastIdx][0]} ${visiblePts[lastIdx][1] - 14})" fill="${brown}">
        <polygon points="-10,0 10,0 14,4 6,4 -6,4 -14,4"/>
        <polygon points="0,-6 0,4 4,0 -4,0"/>
      </g>` : ''}
      <text x="${W/2}" y="60" text-anchor="middle"
            font-family="Bebas Neue, Impact, serif" font-size="18"
            letter-spacing="5" fill="${brown}">FROM CAIRO… TO THE WELL OF SOULS</text>`;
  } else {
    // Ark reveal — pink glow beam from inside
    const p = (t - 0.75) / 0.25;
    const glow = ease(Math.min(1, p * 1.3));
    scene = `
      <rect width="${W}" height="${H}" fill="${brown}"/>
      <!-- wooden crate -->
      <g transform="translate(${W/2} ${H/2})">
        <rect x="-140" y="-80" width="280" height="160" fill="#5a3418"/>
        <rect x="-140" y="-80" width="280" height="10" fill="#3a1f0a"/>
        <rect x="-140" y="70" width="280" height="10" fill="#3a1f0a"/>
        <!-- lid cracked open -->
        <polygon points="-140,-80 140,-80 120,-120 -120,-120" fill="#6a3f18" opacity="${1 - glow * 0.5}"/>
        <!-- pink glow escaping -->
        <circle cx="0" cy="-60" r="${100 * glow}" fill="${pink}" opacity="${(0.6 * glow).toFixed(2)}"/>
        <circle cx="0" cy="-60" r="${50 * glow}" fill="#ffd6ec" opacity="${(0.8 * glow).toFixed(2)}"/>
        <!-- "ARK" stencil -->
        <text x="0" y="24" text-anchor="middle"
              font-family="Bebas Neue, Impact, sans-serif" font-size="34"
              letter-spacing="6" fill="${gold}">RAID<tspan fill="${pink}">OO</tspan>RS</text>
      </g>
      <!-- beams of light -->
      ${[...Array(6)].map((_, k) => {
        const ang = (k / 6) * Math.PI * 2;
        const x2 = W/2 + Math.cos(ang) * 400;
        const y2 = H/2 - 60 + Math.sin(ang) * 400;
        return `<line x1="${W/2}" y1="${H/2 - 60}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="${pink}" stroke-width="${(3 * glow).toFixed(1)}" opacity="${(0.4 * glow).toFixed(2)}"/>`;
      }).join('')}`;
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
  ${credit(W, H, '#e8b464')}
</svg>`;
}

buildGif({
  outPath: resolve(ROOT, 'public/boovies-raiders-trailer.gif'),
  frameDir: '/tmp/raiders-frames',
  W, H, fps: 18, durationS: 6,
  renderFrame: frame,
});
console.log('done: raiders');
