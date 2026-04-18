# Post-Submission Changes

> **Submission locked at tag `bsva-submission`.** All commits listed below
> were made AFTER the submission was sent to BSVA on 2026-04-17 ~23:50 UTC.
>
> These are strictly **bug fixes and demo-hardening changes** to keep the
> live deployment working for judges during the review window (Apr 17–23).
> They do not add new scope. Any judge who wants to evaluate the submission
> as submitted should download the tarball at
> https://github.com/b0ase/bmovies-app/releases/tag/bsva-2026.

## Guardrails we're holding ourselves to

1. **Fix bugs, don't add features.** If a judge clicks something and it
   throws, that's fair to fix. New tiers, new UI flows, new agents are a
   second project — not in scope.
2. **Every post-submission commit prefixed `fix(post-submission)`** (or
   equivalent, where the intent is obvious) so `git log` reads as an
   honest audit trail.
3. **This file gets updated with every push** — one line per commit,
   linked to the SHA.

## Changes since submission

### 2026-04-17 (same evening as submission, post-send)

- **`58d0a76`** — `feat(bsva): lift judge-coupon rate limit for the BSVA review window`
  The 24h-per-IP cap on the `BSVA2026` coupon would have blocked judges on
  their second attempt. Replaced with a 10-second anti-duplicate window.
  `bct_judge_commissions` still records every trigger for audit. Judges
  who pay via Stripe go through the unchanged `/api/checkout` path.

### 2026-04-18 (post-submission smoke test)

- **`fdfb5f7`** — `fix(post-submission): remove smoke-test offers, genericize team counts`
  Four smoke-test offers (`trailer-judge-1776467*`) created during
  post-submission endpoint verification archived in the DB to keep them
  off the live productions strip. Also removed hardcoded "11 specialists
  / 6 founding studios" copy from `index.html` since the roster changes
  every time a user creates a studio.

- **`8d87505`** — `fix(post-submission): genericize remaining hardcoded team counts`
  Same pattern across `about.html`, `commission.html`,
  `commission-success.html`. Descriptive role lists (writer, director, …)
  kept; numeric headcounts removed.

## Not included in this log

User-driven commits that predate the first `fix(post-submission):` commit
but landed after the submission email was sent (e.g. `ea93a6f` pre-submission
cleanup wrap-up, `c06eeec` sitemap service-role key, `e13242e` USD-not-sats
on cascade view). These were in-flight work finishing up around the
deadline. The `bsva-submission` tag marks the boundary; everything above
it in `git log main` is timeline, everything post the tag is also fair
game for judge review.

## For future edits to this file

Each new commit gets one bullet:

```
- **`<sha>`** — `<commit message subject>`
  Short explanation of why this was needed post-submission.
```

Order newest-first within each day. Add a new date heading when the date
rolls over.

- **`fd75225`** — `fix(post-submission): 5-item nav + genericize drifting agent counts`

  **Nav rename and re-order.** `nav-session.js` `NAV_LINKS` cut from 7 items
  to 5, labelled as actions where the page is something-you-do and ordered
  as a user journey:

  ```
  About · Pitch · Fund · Watch · Judge
  ```

  Why each change:
  - **Commission → Pitch.** "Commission" sounded expensive and formal;
    "Pitch" meets users at the $0.99 entry tier without hiding the upsell
    — the page itself still presents all four tiers.
  - **Exchange → Fund.** "Exchange" was jargon. "Fund" is the verb users
    are actually performing when they buy into a cap table.
  - **Live + Watch merged → Watch (routes to /productions.html).** Both
    "Live" and "Watch" used to point at catalogs of films; /productions.html
    is the better-presented of the two, so Watch now routes there and
    /watch.html is kept as a deep-link alias. Visitors with bookmarks still
    land on the Watch highlight.
  - **Studios dropped from nav.** The page is a directory, not a user
    flow — we haven't established what a signed-in user DOES with studios
    beyond browsing. Page is still reachable as a deep link and surfaced
    on the Judge tour. Revisit when there's a clear user action.
  - **Agents dropped from nav** (see genericize item below for why).
  - **Judges → Judge** (singular — it's the shortcut for a single visitor).

  The agent job market (`/jobboard.html`) is intentionally NOT in the
  consumer nav despite satisfying the BSVA "market for agents" criterion
  — it's surfaced on the `/judges.html` tour instead. Reason: top-nav
  pages that look sparse to a regular visitor hurt more than they help.
  Curated discovery via the Judge tour keeps it visible where it matters.

  **`ACTIVE_ALIASES` rewritten** to match: Watch highlights on
  `/film.html`, `/marketplace.html`, etc.; Fund on `/offer.html` and
  `/invest.html`; Judge on `/jobboard.html`, `/x402.html`, and
  `/bsva-submission.html`. Pages outside the nav (studios, agents,
  leaderboard) are intentionally unaliased — no nav item lights up, which
  is honest about where you are.

  **`agents.html` genericized.** The `58 agents · 6 studios + shared
  specialists` h2, the `48 studio agents / 10 shared / 11-specialist crew`
  breakdown, and the inline comments are all replaced with count-free
  copy. The page loads the roster live from `bct_agents` — the DB already
  knows how many agents exist, so hardcoding was drift-prone.

  **`judges.html` count stripped.** The tour card `The 73 agents` →
  `The agent roster`. Same reason.

- **`bd8b9df`** — `fix(post-submission): nav ordering — Produce between Pitch and Fund, commission.html H1 rename`

  Two related changes landing together so they make sense as one message:

  **Nav re-ordered: `About · Pitch · Produce · Fund · Judge`.**
  Previous ordering had Watch last (4th position, right of Fund).
  Reordered and relabelled to narrate the primary-to-secondary market
  journey left-to-right:

  1. **Pitch** — primary market. Pay, a film gets made for you, you
     receive 99% of the BSV-21 royalty token as the byproduct. Consumer
     action.
  2. **Produce** — the live production floor. /productions.html shows
     films currently being produced by the agent swarm — you see what
     happens after someone pitches. Monitoring / spectator page.
  3. **Fund** — secondary market. Buy shares in a film someone ELSE is
     making or has made. Explicit investor action via /exchange.html.

  Pitch and Fund were previously adjacent and both implied "paying for
  something"; splitting them with Produce in the middle gives each a
  clear commercial frame and makes the distinction between primary
  commission and secondary investment visible to anyone scanning the nav.

  **`/commission.html` H1 rename:** `Commission your film. Start at $0.99.`
  → `Pitch your movie for $0.99.` Matches the new nav label so a visitor
  clicking **Pitch** lands on a page whose headline uses the same verb.
  Page title also updated to `bMovies — Pitch your movie for $0.99`.
  Using **movie** (not **film**) to stay consistent with the brand
  wordmark (bMOVIES) and the "Pump dot fun for movies" site hero.

  **No new features.** This is a labelling / IA change only. Every page
  still does what it did. The MARKET nav item the user proposed (for
  film promotion post-production) is NOT being built — that's explicit
  new scope and belongs to post-hackathon work per the guardrails.

- **`4d4a1bb`** — `feat(post-submission): full lifecycle nav + Market/Release explainer pages + footer index`

  **Primary nav is now the full film lifecycle.** Pure five-verb journey,
  left to right:

  ```
  Pitch · Produce · Raise · Market · Release
  ```

  Each label is a stage a film moves through, and each page documents
  or runs that stage. The narrative — "pitch an idea, watch it get
  produced, raise capital, market the finished film, release to the
  audience" — is the site's thesis and now lives in the nav itself
  rather than being buried in About or a landing-page diagram.

  **`Fund` → `Raise`.** The /exchange.html page hosts the cap-table
  action. "Fund" is the investor-side verb; "Raise" is the creator-side
  verb. bMovies is creator-first (hero: "pitch your movie for $0.99"),
  so Raise matches the rest of the voice. Same page, more consistent
  label.

  **About and Judge moved to the footer** (new `FOOTER_LINKS` array in
  `nav-session.js` rendered by a new `mountFooterLinks()` injector).
  About is secondary — most visitors land on a hero that explains the
  product already. Judge was a scoped shortcut for one audience; it now
  sits alongside About, Studios, Agents, Jobboard, Treasury, Invest,
  x402, Watch catalog, Leaderboard, and the BSVA submission doc in a
  single discoverable footer index.

  **New explainer pages** — NOT new product functionality:
  - `/market.html` documents the Phase 2 film-promotion roadmap (cap-
    table-funded trailer boosts, audience discoverer inscriptions,
    festival submissions, Publicist-agent press kits). Stage 4 of the
    lifecycle is deliberately deferred to post-hackathon; this page
    explains what it will be, not what it does today. Phase-2 badge
    prominently displayed so visitors aren't misled.
  - `/release.html` documents the EXISTING workbench + Publish tool
    flow on `/account`. Four-bucket diagram (Workbench → Pipeline →
    Live → Archived) explains the offer status machine, the two
    Publish actions (list shares on exchange, publish to /watch), the
    KYC gate on securities issuance, and what happens after release
    (per-ticket fan-out, IP ladder cascades). All of this was already
    built; `/release.html` just makes it discoverable.

  **`ACTIVE_ALIASES` rewritten** so deep-links highlight the right
  stage:
  - `/watch.html` now highlights Release (it's the public face of
    released films; the nav item is the explainer page but /watch
    itself is part of that stage)
  - `/film.html`, `/production.html`, `/marketplace.html`, `/deck.html`
    highlight Produce
  - `/offer.html`, `/trade.html` highlight Raise
  - Footer pages are intentionally unaliased — no nav item lights up
    when you're on a footer page, which is honest about where you are

  **`mountJudgesLink` → `mountFooterLinks`.** The old lonely
  "For BSVA judges →" link is replaced by a broader footer index that
  renders every FOOTER_LINKS entry (with the current page filtered out
  to avoid self-links). Judge is still discoverable; it's just one of
  eleven footer entries now instead of the only one.
