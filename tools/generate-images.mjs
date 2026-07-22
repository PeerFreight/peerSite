#!/usr/bin/env node
// Batch-generate the site's background photos with OpenAI's image API.
// Usage: node tools/generate-images.mjs [name ...]
//   With no args, generates every shot in SHOTS. Pass shot names to rerun a subset.
// Requires OPENAI_API_KEY in the environment or in .env at the repo root.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

if (!process.env.OPENAI_API_KEY && existsSync(resolve(ROOT, '.env'))) {
  for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY not set'); process.exit(1); }

const MODEL = 'gpt-image-2';

// Shared realism guardrails appended to every prompt.
const STYLE = `Photorealistic editorial photograph, shot on a full-frame camera with a 35mm lens,
natural light only, realistic color grading, faint film grain. This is real working American
trucking, not an ad: equipment shows honest wear like road grime, faded paint, stone chips,
scuffed mud flaps, reflective tape, DOT numbers and small compliance lettering on the cab doors.
Company logos, if visible at all, are small, incidental, partially out of focus, and read as real
US freight brands seen at a distance; no logo is large or centered and none dominates the frame.
No oversized branding, no invented gibberish text, no watermarks, no showroom-clean trucks,
no CGI smoothness. Pleasant clear weather.`;

const SHOTS = [
  {
    name: 'hero',
    file: 'site/freight-hero-terminal-morning.jpg',
    size: '1536x1024',
    prompt: `Wide establishing shot of a worn white day cab semi truck coupled to a 53 foot dry van
trailer at a large distribution terminal, low front three quarter angle. Early morning golden
yellow sunrise light rakes across wet asphalt with long shadows; other trailers sit at dock doors
in the far background. The main truck sits right of center so the left third of the frame is open
yard and sky for text overlay.`,
  },
  {
    name: 'dock',
    file: 'site/freight-dock-dusk.jpg',
    size: '1536x1024',
    prompt: `A well used dry van trailer backed into a busy warehouse loading dock at purple blue
dusk, dock lights glowing, a forklift moving a pallet inside the lit dock door, eye level side
angle from the yard. Deep violet sky after sundown.`,
  },
  {
    name: 'tanker',
    file: 'site/freight-tanker-day.jpg',
    size: '1536x1024',
    prompt: `A stainless steel chemical tanker semi truck with orange hazmat placards rolling down
an interstate on a bright sunny day, full side profile with slight motion in the wheels, wide
green grass median and shoulder in the foreground and a clear blue sky with a few small clouds.
The tractor is a working truck with grime behind the wheels and a slightly faded hood.`,
  },
  {
    name: 'drayage',
    file: 'site/freight-drayage-port.jpg',
    size: '1536x1024',
    prompt: `A drayage semi truck hauling a weathered shipping container on a chassis out of a
marine container terminal, tall blue gantry cranes and stacks of multicolored containers behind
it, clear bright morning, slightly elevated wide angle. Haze of the harbor in the distance.`,
  },
  {
    name: 'oversize',
    file: 'site/freight-oversize-morning.jpg',
    size: '1536x1024',
    prompt: `A flatbed semi truck hauling a large tarped industrial machine with yellow OVERSIZE
LOAD banners and red corner flags, traveling a two lane rural road along the edge of a tall green
cornfield, warm yellow morning sun low in a blue sky, front three quarter view from the road
shoulder.`,
  },
  {
    name: 'yard-aerial',
    file: 'site/freight-yard-aerial-night.jpg',
    size: '1024x1024',
    prompt: `Aerial view straight down a working intermodal container yard just after sunset, deep
purple and magenta sky on the horizon, warm sodium vapor floodlights over rows of stacked
containers and parked trailers, a few tractors moving between rows with headlights on.`,
  },
  {
    name: 'highway',
    file: 'site/freight-highway-cornfield.jpg',
    size: '1536x1024',
    prompt: `High aerial side view of a single semi truck with a plain white dry van trailer
rolling down an open rural highway that cuts through cornfields and strips of golden yellow
grass, wide clear blue midday sky, sense of scale and open country. Road surface shows patching
and tire marks.`,
  },
  {
    name: 'bol',
    file: 'site/freight-bol-daylight.jpg',
    size: '1536x1024',
    prompt: `Close up of a driver's weathered hand holding a metal clipboard with a filled out
bill of lading form against the corrugated rear doors of a well used semi trailer, soft neutral
daylight, shallow depth of field, hints of the freight yard blurred in the background. The form
reads as generic shipping paperwork without legible invented words.`,
  },
  {
    name: 'reefer',
    file: 'site/freight-reefer-evening.jpg',
    size: '1536x1024',
    prompt: `A row of white refrigerated trailers with reefer units lined up at a freight yard in
warm early evening light, straight on view down the row so the trailers recede in perspective,
soft orange sun catching the trailer sides, light wear and road film on the doors.`,
  },
];

async function generate(shot) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      prompt: `${shot.prompt}\n\n${STYLE}`,
      size: shot.size,
      quality: 'high',
      output_format: 'jpeg',
      output_compression: 88,
    }),
  });
  if (!res.ok) throw new Error(`${shot.name}: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error(`${shot.name}: no image in response`);
  const out = resolve(ROOT, shot.file);
  writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log(`ok ${shot.name} -> ${shot.file} (${Math.round(Buffer.from(b64, 'base64').length / 1024)} KB)`);
}

const wanted = process.argv.slice(2);
const queue = wanted.length ? SHOTS.filter(s => wanted.includes(s.name)) : SHOTS;
if (wanted.length && queue.length !== wanted.length) {
  console.error(`unknown shot name; valid: ${SHOTS.map(s => s.name).join(', ')}`);
  process.exit(1);
}

const CONCURRENCY = 3;
let failed = 0;
for (let i = 0; i < queue.length; i += CONCURRENCY) {
  const batch = queue.slice(i, i + CONCURRENCY);
  const results = await Promise.allSettled(batch.map(generate));
  for (const r of results) if (r.status === 'rejected') { failed++; console.error(r.reason.message); }
}
process.exit(failed ? 1 : 0);
