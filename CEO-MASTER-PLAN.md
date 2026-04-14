# NPGX CEO Master Plan

## The Business in One Sentence

NPGX sells AI-generated character content (images, videos, music, scripts, magazines) across 26 characters, at different price points through different taps.

## The Water Analogy

One water supply: **26 character souls** (identity, appearance, personality, generation prompts).

Every product is a tap that serves that water in a different format.

```
                    ┌─ Poster Gen ────── Quick promo image (free / $1)
                    ├─ Image Gen ─────── Custom photoshoot ($2-5)
                    ├─ Video Gen ─────── Single clip ($5-10)
SOUL DATA ──────────├─ Script Gen ────── Screenplay (free)
(26 characters)     ├─ Music Gen ─────── Theme song ($3)
                    ├─ Magazine ──────── Editorial issue ($10-20)
                    ├─ Trading Cards ─── Collectible ($1-5)
                    ├─ Merch ─────────── Physical goods ($80-1000)
                    │
                    └─ ONE SHOT ──────── THE FULL SPA ($99)
                       Turns on ALL taps for one character:
                       → 3 photoshoot images
                       → 1 short film (3-5 video clips)
                       → 1 screenplay
                       → 1 theme song
                       → 1 magazine issue with editorial coverage
                       → 1 trading card set
                       → Downloadable package
```

## Product Tiers

### Tier 0: Free (Marketing)
| Product | What they get | Purpose |
|---------|--------------|---------|
| Browse roster | See all 26 characters | Discovery |
| Script Gen | Read AI screenplay | Content marketing |
| Storyline Gen | Plot generator | Engagement |
| Video Gallery | Watch existing clips | Showcase |
| Demo Video | Promo reel | Conversion |

### Tier 1: Single Tap ($1-10)
| Product | Price | What they get |
|---------|-------|--------------|
| Poster Gen | $1 | 1 character image, poster layout |
| Image Gen | $2-5 | Custom photoshoot image |
| Video Gen | $5-10 | Single video clip (6-120s) |
| Music Gen | $3 | Theme song |
| Trading Card | $1-5 | Generated card with stats |
| Cover Gen | $2 | Magazine cover image |

### Tier 2: Multi-Tap ($10-50)
| Product | Price | What they get |
|---------|-------|--------------|
| Photoshoot | $15 | 3-shot character session |
| Magazine Issue | $10-20 | Full editorial issue (cover + stories + images) |
| Movie Editor | $20 | Assembled short from clips |

### Tier 3: Full Spa ($99)
| Product | Price | What they get |
|---------|-------|--------------|
| ONE SHOT | $99 | Everything. The complete character production package. |

### Tier 4: Ongoing ($monthly)
| Product | Price | What they get |
|---------|-------|--------------|
| Character Subscription | $9.99/mo | Monthly magazine + exclusive content |
| All-Access | $29.99/mo | All 26 characters, unlimited gen |
| Creator Pro | $99/mo | API access + white-label |

## One Shot = The Spa Treatment

The One Shot is NOT a separate product. It orchestrates the EXISTING taps:

```
ONE SHOT PRODUCTION ($99)
│
├── 1. PHOTOSHOOT (uses /api/generate-image-npgx × 3)
│   └── 3 unique shots: Portrait, Action, Poster
│
├── 2. SCREENPLAY (uses /api/generate-script)
│   └── Full script with scenes, dialogue, direction
│
├── 3. VIDEO PRODUCTION (uses /api/generate-video or Wan2.1)
│   └── 3-5 video clips from screenplay scenes
│   └── Director Agent: Writer → Shot Director → Video Producer
│
├── 4. THEME SONG (uses /api/generate-song)
│   └── Original track for the character
│
├── 5. MAGAZINE COVERAGE (uses /api/magazine/generate-canonical)
│   └── Full editorial issue covering the production
│   └── Behind-the-scenes, interview, review
│
├── 6. TRADING CARDS (uses /api/cards/generate)
│   └── Character card set from production stills
│
└── OUTPUT: Downloadable package
    ├── /images/ (3 photoshoot PNGs)
    ├── /videos/ (3-5 MP4 clips)
    ├── script.pdf
    ├── song.mp3
    ├── magazine.pdf
    ├── cards/ (trading card PNGs)
    └── production.json (metadata, costs, credits)
```

## Revenue Flows

```
User pays $99
│
├── Video generation cost: ~$2-5 (Grok API or $0 via Wan2.1 self-hosted)
├── Image generation cost: ~$0.50-1.50 (3 images)
├── Text generation cost: ~$0.10 (script + magazine)
├── Music generation cost: ~$0.50
├── Total COGS: ~$3-7
│
└── Gross margin: ~$92-96 (93-97%)
```

## What's Working vs What's Broken

### Working Taps (connected to soul data, functional API)
- Image Gen → /api/generate-image-npgx
- Video Gen → /api/generate-video (Grok)
- Cover Gen → uses image gen
- Photoshoot → uses image gen
- Magazine → /api/magazine/* (full pipeline)
- Trading Cards → /api/cards/generate
- One Shot → uses image gen + script gen + song gen (images only, no video)

### Broken / Disconnected Taps
- Script Gen → API exists but UI is a template, not wired to production
- Storyline Gen → Template only, no API connection
- Storyboard Gen → Template only, no API connection
- Music Gen → Template UI, API exists but unclear if functional
- Video Gallery → Hardcoded data, not connected to generated videos
- Movie Editor → Basic, not connected to production pipeline
- NFT Marketplace → "Coming soon"
- NFT Segmenter → Template only
- Marketplace → Placeholder listings

### New Plumbing (just built, not yet connected to UI)
- Production Pipeline → /api/produce (Director Agent: Writer → Shot Director → Video Producer → Magazine Liaison)
- Wan2.1 Provider → wan-video.ts (self-hosted on Vast.ai)

## Architecture Principle

**Every generation tool should:**
1. Read from the same soul data (character identity)
2. Write to the same content library (not hardcoded, not localStorage)
3. Be callable individually (single tap) OR as part of One Shot (spa)
4. Track costs and attribute to the character's P&L
5. Be browsable in the character's gallery after generation

**The content library is the missing piece.** Right now:
- Images go to... wherever Grok/Stability returns them (URLs expire)
- Videos go to... Grok URLs (expire) or Vast.ai /download (ephemeral)
- Scripts go to... nowhere (displayed then lost)
- Songs go to... nowhere
- Magazine issues go to... localStorage + sometimes Supabase
- Cards go to... IndexedDB

We need a **unified content store** where all generated content for a character lives permanently, keyed by character slug, with metadata (type, cost, timestamp, production ID).

## Priority Actions

### P0: Connect the plumbing
1. Create unified content store (Supabase table: `npgx_content`)
2. All generation APIs save results to this store
3. Character pages pull from this store
4. Video gallery pulls from this store (not hardcoded)

### P1: Wire the One Shot properly
1. One Shot calls ALL existing APIs in sequence
2. Each step saves to content store
3. Progress streamed to UI
4. Final package downloadable

### P2: Revenue infrastructure
1. Stripe checkout before generation
2. Cost tracking per production
3. Character P&L dashboard

### P3: Content distribution
1. Dynamic video gallery from content store
2. Character page shows all generated content
3. Magazine issues properly persisted
4. NFT segmentation from real content

## CEO Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-10 | One Shot = spa orchestrator, not separate product | All taps serve same water |
| 2026-03-10 | Wan2.1 added as uncensored video provider | Grok blocks explicit content |
| 2026-03-10 | Need unified content store before more features | Content scattered across localStorage, hardcoded data, expiring URLs |
