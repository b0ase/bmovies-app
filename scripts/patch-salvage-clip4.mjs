// One-shot: generate the missing 4th clip for trailer-salvage-<ts>
// after the main /api/trailer/generate call timed out with 3 of 4
// clips done. Uses the style bible Grok wrote in the same pipeline
// run so the clip stays visually consistent with the first three.
//
// Quote Chi's visual_anchor VERBATIM as the prompt requires. Name a
// bible location, pick a tone reference, set palette, state shot
// type and camera. Grok Imagine Video respects these cues.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load XAI_API_KEY from .env.local
const env = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
const xaiKey = env.match(/^XAI_API_KEY=(.+)$/m)?.[1]?.trim();
if (!xaiKey) { console.error('XAI_API_KEY missing'); process.exit(1); }

const OFFER_ID = process.argv[2] || readFileSync('/tmp/salvage-offer-id.txt', 'utf8').trim();

// The 4th clip = climax. Chi confronts all three factions at sunrise.
// Character anchor quoted verbatim from the style bible.
const CLIP_PROMPT = `Cinematic 8-second clip in the style of District 9. Handheld low-angle shot at sunrise in a harbor-district yard at night, lit by flickering oil drum fires amid distant port lights and shadows. A wiry woman in her late thirties with short dark hair, grease-streaked blue overalls, sturdy boots, a toolkit belt around her waist, and a confident stance amid scrap metal stands squarely between a black SUV's headlights, two uniformed navy officers, and a robed pastor holding a lantern. Behind her, a half-open shipping container glows faintly from within. Slow dolly-in on her face — exhausted, resolute. Rusted orange, metallic gray, hazy blue palette. Dawn mist catching the firelight. No dialogue, just the sound of port generators.`;

console.log('Submitting clip to xAI Grok Imagine Video…');
console.log('  offer:', OFFER_ID);
console.log('  prompt:', CLIP_PROMPT.slice(0, 140) + '…\n');

const submit = await fetch('https://api.x.ai/v1/videos/generations', {
  method: 'POST',
  headers: { Authorization: `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'grok-imagine-video', prompt: CLIP_PROMPT }),
});
if (!submit.ok) { console.error('submit failed', submit.status, await submit.text()); process.exit(1); }
const { request_id } = await submit.json();
console.log('  request_id:', request_id);

let videoUrl = null, costUsd = 0;
const deadline = Date.now() + 300_000;
while (Date.now() < deadline) {
  await new Promise(r => setTimeout(r, 4_000));
  const poll = await fetch(`https://api.x.ai/v1/videos/${request_id}`, {
    headers: { Authorization: `Bearer ${xaiKey}` },
  });
  if (!poll.ok) continue;
  const body = await poll.json();
  process.stdout.write(`  status: ${body.status}`.padEnd(40) + '\r');
  if (body.status === 'done' && body.video?.url) {
    videoUrl = body.video.url;
    costUsd = (body.usage?.cost_in_usd_ticks || 0) / 1e10;
    break;
  }
  if (body.error) { console.error('\n  xAI error:', body.error); process.exit(1); }
}
if (!videoUrl) { console.error('\n  timed out'); process.exit(1); }

console.log('\n  video url:', videoUrl.slice(0, 90) + '…');
console.log('  cost:     $' + costUsd.toFixed(3));
console.log('\nWriting artifact to Supabase via /api/trailer/patch-clip (fallback: direct SQL)…');

// Emit a SQL insert we can run via the psql pipe
const SQL = `
INSERT INTO bct_artifacts (offer_id, kind, url, model, prompt, payment_txid, role, step_id)
VALUES (
  '${OFFER_ID}',
  'video',
  '${videoUrl.replace(/'/g, "''")}',
  'grok-imagine-video',
  'manual 4th clip — climax, bible-anchored',
  'manual-patch-${Date.now().toString(36)}',
  'trailer-clip',
  'editor.trailer_cut_3'
) RETURNING id;
`.trim();

console.log('\nSQL to execute:');
console.log(SQL);
console.log('\n---');
console.log('VIDEO_URL=' + videoUrl);
console.log('COST_USD=' + costUsd.toFixed(3));
