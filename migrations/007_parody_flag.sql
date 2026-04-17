-- 007: Parody flag for bOOvies skin
--
-- bOOvies is the pink/pixelated parallel skin of bMovies. Same platform,
-- same tables, same commission flow — films just get flagged as `parody`
-- so the /boovies/* routes can filter the catalog down to the spoof
-- universe while /* keeps showing the straight bMovies catalog.
--
-- Offers (films in investment listing state) and studios (the producing
-- entity) both get the flag. A parody studio produces parody offers by
-- default, but the flag lives on both so a serious studio can still
-- cut a one-off spoof without changing its own classification.

ALTER TABLE bct_offers   ADD COLUMN IF NOT EXISTS parody boolean NOT NULL DEFAULT false;
ALTER TABLE bct_studios  ADD COLUMN IF NOT EXISTS parody boolean NOT NULL DEFAULT false;

-- Index the column because the commonest query will be
--   WHERE parody = false  (mainline bMovies catalog)
-- and
--   WHERE parody = true   (bOOvies drive-in).
-- A partial index on the minority case (parody = true) is cheaper to
-- maintain than a full one and still speeds up the bOOvies path.
CREATE INDEX IF NOT EXISTS bct_offers_parody_idx  ON bct_offers  (parody) WHERE parody = true;
CREATE INDEX IF NOT EXISTS bct_studios_parody_idx ON bct_studios (parody) WHERE parody = true;

COMMENT ON COLUMN bct_offers.parody  IS 'True for bOOvies drive-in spoof films. Filter by skin.';
COMMENT ON COLUMN bct_studios.parody IS 'True for studios producing bOOvies parody content.';
