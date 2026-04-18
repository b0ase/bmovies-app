-- Versioned snapshots of a project's investor deck + pack.
--
-- /deck.html renders live from bct_offers + bct_artifacts on every
-- load, so the doc you download today will differ from the one you
-- downloaded last week (more clips, more raised, more holders). That's
-- good for a live project page but bad for deck distribution — once
-- you send a deck to a Hollywood exec or an investor, you want to
-- know what they actually saw.
--
-- Each row here is a frozen point-in-time capture. The payload field
-- carries the full JSON the deck renderer used (story fields, stats,
-- step_log slice, cap-table slice). /deck.html?id=X&version=N reads
-- the snapshot; /deck.html?id=X (no version) stays live.

create table if not exists bct_deck_snapshots (
  id bigserial primary key,
  offer_id text not null references bct_offers(id) on delete cascade,
  -- Monotonic per-offer version number. First snapshot is 1.
  version integer not null,
  -- "deck" = story-first pitch. "pack" = investor DD artifact.
  -- Two scoped version sequences so v3 of the deck isn't confused
  -- with v3 of the pack.
  kind text not null check (kind in ('deck', 'pack')),
  -- Full payload the deck renderer needs. Schema is intentionally
  -- open — we want to evolve the deck without migrations, and the
  -- renderer tolerates missing fields.
  payload jsonb not null,
  -- Optional commissioner note — "sent to Aster after the pitch
  -- meeting" etc. Helps them remember which version went where.
  note text,
  pinned_at timestamptz not null default now(),
  pinned_by_account_id uuid references bct_accounts(id),
  -- Human-readable link token so a commissioner can share a
  -- permanent URL for a snapshot without exposing the numeric id.
  -- /deck.html?id=X&v=<share_token>. Generated server-side.
  share_token text unique,
  unique (offer_id, kind, version)
);

create index if not exists bct_deck_snapshots_offer_idx
  on bct_deck_snapshots (offer_id, kind, version desc);
create index if not exists bct_deck_snapshots_token_idx
  on bct_deck_snapshots (share_token);

-- RLS: commissioners can see their own snapshots; everyone can see a
-- snapshot via its share_token (the link IS the auth).
alter table bct_deck_snapshots enable row level security;

create policy bct_deck_snapshots_owner_read on bct_deck_snapshots
  for select
  using (
    offer_id in (
      select id from bct_offers
      where account_id = (
        select id from bct_accounts where auth_user_id = auth.uid()
      )
    )
  );

create policy bct_deck_snapshots_service_all on bct_deck_snapshots
  to service_role
  using (true)
  with check (true);

-- Anyone with the share_token can read the snapshot (it's the link).
-- The public /deck.html?v=<token> path uses the anon role and this
-- policy lets it fetch the pinned payload without auth.
create policy bct_deck_snapshots_share_token_read on bct_deck_snapshots
  for select
  to anon, authenticated
  using (share_token is not null);
