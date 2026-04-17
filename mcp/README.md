# bMovies MCP Servers

Model Context Protocol surface for the bMovies platform. Lets any
MCP-speaking client (Claude Code, Cursor, custom agents) drive the
production pipeline — list studios, refine an idea, run a writers-room
chat, look up offers, list artifacts — all from inside the agent's
conversation.

## What's here

```
mcp/
├── bmovies-server.ts   Main MCP server. 8 tools covering query +
│                       writing + navigation. Template today; flesh
│                       out each tool's real backing endpoint before
│                       production.
└── README.md           This file.
```

## Quick start (local dev)

1. Install the MCP SDK (one-time — not yet in package.json):

   ```sh
   pnpm add -D @modelcontextprotocol/sdk
   ```

2. Boot the bMovies Next.js dev server so the MCP tools have an
   HTTP backend to hit:

   ```sh
   pnpm dev
   ```

3. Register the MCP server with your client. For Claude Code this
   is `.mcp.json` at the project root — already pointed at
   `mcp/bmovies-server.ts`. Reload the editor after editing.

4. Test a tool from the client:

   ```
   bmovies_list_skills     # dumps the full x402 skill catalog
   bmovies_refine_idea { "idea": "A librarian collects banned novels in the walls of her crumbling branch." }
   ```

## Environment

| Var                     | Default                   | Purpose |
|-------------------------|---------------------------|---------|
| `BMOVIES_BASE_URL`      | `http://localhost:3100`   | HTTP target for tool calls. Set to `https://bmovies.online` to drive production. |
| `BMOVIES_SERVICE_JWT`   | —                         | Optional Supabase JWT. Required for gated tools like `bmovies_writers_room`. |

## Adding a new tool

1. Add the skill definition to `src/lib/x402-skills.ts` so it
   surfaces on `/.well-known/x402.json` and `/skills`.
2. Add the backing Next.js API route under `src/app/api/skills/<id>/route.ts`.
3. Add the MCP tool in `mcp/bmovies-server.ts` with a matching schema.
4. Flip the skill's `live: false` flag to `true` once the call is
   paid-and-served end-to-end.

See `skills/TEMPLATE.md` for the authoring shape expected by
`src/lib/x402-skills.ts`.

## How agents discover skills without MCP

Any HTTP client can pull `https://bmovies.online/.well-known/x402.json`
and get the same catalog. First call returns 402 + a signed BSV
payment envelope; retry with the transaction in `X-PAYMENT` to
actually receive the resource.

The MCP surface is a convenience wrapper over the same HTTP contract.
