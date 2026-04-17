---
id: <skill-id>                  # e.g. generate-poster
name: <Human Readable Name>     # e.g. Generate Poster
category: writing | visual | audio | video | production | query
endpoint: /api/skills/<skill-id>  # actual Next.js route
method: POST                    # or GET for read-only queries
price_sats: 500                 # see README.md §Pricing
price_unit: per poster          # short noun phrase, shown in UI
auth_required: false            # true for anything that calls a
                                # privileged backend (writers-room
                                # chat, commissions, account-linked
                                # artifacts)
live: false                     # flip to true once the endpoint is
                                # paid-and-served end-to-end
tags:                           # free-text labels for search / grouping
  - storyboard
  - poster
  - grok-imagine-image-pro
---

# <Human Readable Name>

One-paragraph description of what this skill does, who calls it,
and what shape it returns. Write for an autonomous agent's reading
comprehension — be specific about the output contract.

## Parameters

| Name     | Type    | Required | Description |
|----------|---------|----------|-------------|
| `title`  | string  | ✓        | Film title. |
| `prompt` | string  | —        | Optional creative brief. |

## Prompt

The model/system prompt used internally. Keep it verbatim here so
downstream changes to the prompt are reviewable in git.

```
You are the bMovies <role> agent. Given a title and synopsis, return...
```

## Example call

```sh
curl -X POST https://bmovies.online/api/skills/<skill-id> \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <signed BSV tx hex>" \
  -d '{
    "title": "The Last Librarian",
    "prompt": "Neo-noir, teal and amber palette"
  }'
```

## Response

```json
{
  "url": "https://api.b0ase.com/bmovies-assets/images/...",
  "model": "grok-imagine-image-pro",
  "prompt": "<echo of the effective prompt>",
  "costUsd": 0.05,
  "durationMs": 9423,
  "payment": {
    "txid": "a1b2c3...",
    "sats": 500,
    "payTo": "<bMovies pay-to address>"
  }
}
```

## Errors

| Status | Meaning | What the agent should do |
|--------|---------|--------------------------|
| 400    | Bad input | Fix the params and retry. |
| 402    | Payment required | Sign a BSV tx for the quoted amount and retry with `X-PAYMENT`. |
| 429    | Rate limited | Back off per the `Retry-After` header. |
| 502    | Upstream provider failed | Retry after a short delay; if persistent, try a different skill. |
| 503    | Not yet wired | Skill is still a template — check `live` in the manifest. |

## Notes

Any gotchas, upstream-model quirks, rate limit considerations, or
known-bad prompt shapes that future authors should know about.

## Changelog

- `YYYY-MM-DD` — Initial template.
