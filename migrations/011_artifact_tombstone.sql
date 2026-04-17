-- 011: Tombstone marker for permanently-dead artifacts
--
-- When an xAI ephemeral URL expires and we cannot recover the asset
-- (pre-sweep orphans, 404'd bucket, etc.), we mark the row as
-- archived. The UI filters archived_at IS NULL on public queries so
-- broken video players / image tags don't render.
--
-- This is distinct from `superseded_by` which means "there's a newer
-- version." An archived row has no replacement — the content is just
-- gone. Keeping the row (vs deleting) preserves provenance for audit
-- and lets us know what WAS generated if we later recover the asset
-- from a different source.

ALTER TABLE bct_artifacts ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE bct_artifacts ADD COLUMN IF NOT EXISTS archive_reason text;

CREATE INDEX IF NOT EXISTS bct_artifacts_archived_idx
  ON bct_artifacts (archived_at)
  WHERE archived_at IS NOT NULL;

-- The main "current artifact" index should now also exclude archived rows.
DROP INDEX IF EXISTS bct_artifacts_current_idx;
CREATE INDEX bct_artifacts_current_idx
  ON bct_artifacts (offer_id, role, kind)
  WHERE superseded_by IS NULL AND archived_at IS NULL;
