# bMovies App

The authenticated creative suite for [bMovies](https://bmovies.online) — a Next.js 16 / React 18 application that lives at `app.bmovies.online` and hosts the account dashboard, studio management, cap tables, investor packs, and the full creative tool suite (movie editor, storyboard generator, title designer, script editor, pitch deck builder, music studio, quality checker).

## What this is

`bMovies` is a two-tier product:

- **[bmovies.online](https://bmovies.online)** — the public marketing site + film catalogue + commission flow + legal documents + exchange + treasury dashboard. Static HTML served by Vercel from [`b0ase/bmovies`](https://github.com/b0ase/bmovies).
- **`app.bmovies.online`** (this repo) — the authenticated experience that kicks in after sign-in. Next.js app with the full creative tool suite and per-user dashboard.

Both tiers share the same self-hosted Supabase at `api.b0ase.com`, the same Bitcoin SV mainnet tokens (33 canonical BSV-21 tokens across 20 films, 6 studios, 6 directors, and 1 platform share `$bMovies`), and the same brand.

## Origin

This repo was bootstrapped from [NPGX](https://github.com/b0ase/npgx) in April 2026 as part of the bMovies hackathon submission. NPGX was a Next.js 16 platform with a mature creative tool suite and a working Supabase integration. The bMovies port strips out NPG-specific routes, rebrands the UI to bMovies' black/red theme, rewires the data layer from `npg_*` tables to `bct_*` tables, and adds bMovies-specific features (cap tables, investor packs, BSV-21 royalty share integration, x402 per-scene payments, BRC-100 wallet connect).

## Stack

- Next.js 16 (App Router)
- React 18
- TypeScript strict mode
- Tailwind CSS
- `@supabase/supabase-js` (shared with bmovies.online)
- `@stripe/stripe-js` for checkout
- `@bsv/sdk` for on-chain operations
- `@handcash/handcash-connect` for HandCash wallet integration
- `lucide-react` for icons
- `framer-motion` for transitions

## Creative tools

Ported and rewired to `bct_*` tables:

- **Movie editor** — timeline-based video editor with scene reordering
- **Storyboard generator** — AI-generated frame-by-frame storyboards tied to a film's offer
- **Title designer** — typography + layout tool for poster rendering
- **Script editor** — formatted screenplay editor with act/scene structure
- **Pitch deck builder** — printable deck generator for investor outreach
- **Cover art / image gen** — xAI Grok-backed image generation for poster art
- **Music studio** — audio track composition for film scores
- **Music mixer** — multi-track mixing
- **Quality checker** — output QC tool for films approaching ship

## Account dashboard tabs

- **My Films** — every film the user has commissioned, with status, tier, token ticker, thumbnail, and edit/watch buttons
- **Studio** — studio profile (name, logo, bio), current pipeline, agent roster
- **Agents** — hire cast, crew, editors; agent marketplace; salaries and soul files
- **Cap tables** — per-film and $bMovies cap tables with allocation bars, holder lists, on-chain verification links
- **Investor packs** — printable per-film investor decks
- **Creative tools** — launcher grid for all the tools above
- **Wallet** — BRC-100 wallet connect, $bMovies balance, $TICKER balances for films held, dividend history

## Local dev

```bash
pnpm install
cp .env.example .env.local
# fill in env vars (see .env.example)
pnpm dev
# app runs at http://localhost:3100
```

## Deploy

Target: Vercel, deployed as `app.bmovies.online`. Environment variables configured in the Vercel dashboard.

## Legal

**Operator**: The Bitcoin Corporation Ltd (Company No. **16735102**, registered in England & Wales). Registered office: Flat 6, 315 Barking Road, London, E13 8EE, United Kingdom. Director: Richard Boase. Contact: [info@thebitcoincorporation.website](mailto:info@thebitcoincorporation.website).

Full legal pack lives on [bmovies.online](https://bmovies.online):

- [Terms of Service](https://bmovies.online/terms.html)
- [$bMovies Prospectus](https://bmovies.online/legal/platform-token-prospectus.html)
- [Film Token Risk Disclosure](https://bmovies.online/legal/film-token-risk-disclosure.html)
- [Non-custodial Disclosure](https://bmovies.online/legal/non-custodial-disclosure.html)
- [Runar Covenant Design](https://bmovies.online/legal/runar-covenant-design.html)

All legal documents currently carry a **DRAFT** status banner and must not be relied upon for investment decisions until reviewed by FCA-experienced counsel. See [`docs/LEGAL-REVIEW-2026-04-14.md`](https://github.com/b0ase/bmovies/blob/main/docs/LEGAL-REVIEW-2026-04-14.md) for the full legal audit punch list.

## Licence

Source-available under the **[PolyForm Noncommercial License 1.0.0](./LICENSE)**. You may read, study, and run this software for noncommercial purposes (personal study, research, evaluation, academic use). **Commercial use of any kind requires a separate written licence** from The Bitcoin Corporation Ltd — contact [online.bmovies@gmail.com](mailto:online.bmovies@gmail.com).

Copyright © 2026 The Bitcoin Corporation Ltd. All rights not expressly granted in the licence are reserved.
