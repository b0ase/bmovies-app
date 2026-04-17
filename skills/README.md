# bMovies Skills

This folder is the **authoring surface** for every skill the bMovies
platform exposes to autonomous agents. One skill = one paid HTTP
endpoint + a clear input/output contract.

## What lives here

```
skills/
├── README.md       — this file
├── TEMPLATE.md     — copy this when adding a new skill
└── <skill-id>.md   — one markdown file per skill (future)
```

Each skill file is a small spec that captures the prompt, the
parameters, the pricing rationale, and any notes the agent needs to
call it correctly. The actual Next.js API route lives under
`src/app/api/skills/<skill-id>/route.ts`; the catalog entry lives in
`src/lib/x402-skills.ts`; this markdown file is the *source of
truth* the other two are derived from.

## Adding a new skill

1. Copy `skills/TEMPLATE.md` to `skills/<your-skill-id>.md` and fill
   in every field.
2. Add the corresponding entry to `SKILLS` in
   `src/lib/x402-skills.ts` so it shows up on `/skills` and
   `/.well-known/x402.json`.
3. Add the backing API route at
   `src/app/api/skills/<skill-id>/route.ts`. Use the existing
   `/api/refine` route as a structural reference.
4. If the skill should also be exposed via MCP, register it in
   `mcp/bmovies-server.ts` with a matching Zod schema.
5. Flip `live: false` → `live: true` in the catalog entry once the
   endpoint is paid-and-served end-to-end. Until then it stays a
   *template* — surfaces in `/skills` with the ⭘ flag so agents
   don't call it expecting production behaviour.

## Why markdown

Because the skill spec is content, not config. Prompts need
paragraphs. Examples want fenced code blocks. Future readers (human
or AI) get a readable contract without digging through TypeScript.
The TS catalog stays lean and references the markdown for detail.

## Skill naming

Use short, verb-first, kebab-case ids:

```
refine-idea           good
generate-poster       good
do-the-poster-thing   no
```

Keep ids stable once live — agents cache them.

## Pricing

Default pricing anchors live in `src/lib/x402-skills.ts`. When
adding a skill, match or beat the real upstream cost:

- **Cheap chat/refine**: 50–100 sats (≈ $0.025–0.05)
- **Text-heavy generation** (treatment, screenplay): 100–500 sats
- **Image**: 200–800 sats depending on model
- **8s video clip**: 1,000–2,500 sats
- **Full commission** (pitch/trailer/short/feature): matches the
  USD commission price converted to sats at current BSV.

Don't set the price lower than the upstream call costs. Don't mark
a skill `live: true` until both the endpoint AND the billing code
path are exercised in a real test.
