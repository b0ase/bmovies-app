-- 005: Add poster_url + poster_prompt to bct_studios
-- The studio creation flow now generates TWO images: logo + roster poster.

ALTER TABLE bct_studios ADD COLUMN IF NOT EXISTS poster_url text;
ALTER TABLE bct_studios ADD COLUMN IF NOT EXISTS poster_prompt text;
