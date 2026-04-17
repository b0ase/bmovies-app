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
