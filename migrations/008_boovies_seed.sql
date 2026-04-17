-- 008: Seed the 6 bOOvies drive-in films into bct_offers with parody=true
--
-- Creates a single "bOOvies Drive-In" studio to own all six films,
-- then inserts one bct_offers row per film. The existing static
-- /public/boovies-*.html pages are the marketing surface; this seed
-- puts the same films into the database so they appear in the
-- exchange/watch/commission flows when the user is on the bOOvies
-- skin (parody = true filter).
--
-- Idempotent: uses ON CONFLICT where possible and checks for the
-- studio by a well-known slug.

-- 1. The drive-in studio (parent of all 6 parody films)
INSERT INTO bct_studios (id, name, slug, is_public, parody, created_by)
VALUES (
  gen_random_uuid(),
  'bOOvies Drive-In',
  'boovies-drive-in',
  true,
  true,
  'platform'
)
ON CONFLICT (slug) DO UPDATE
  SET parody = EXCLUDED.parody,
      is_public = EXCLUDED.is_public;

-- 2. The 6 films.
-- Using DO block so we can resolve the studio_id once and reuse it.
DO $$
DECLARE
  studio_uuid uuid;
BEGIN
  SELECT id INTO studio_uuid FROM bct_studios WHERE slug = 'boovies-drive-in';

  -- If the studio wasn't created (e.g. schema mismatch), bail quietly.
  IF studio_uuid IS NULL THEN
    RAISE NOTICE 'bOOvies studio not found — skipping film seed';
    RETURN;
  END IF;

  -- Each offer mirrors the static page metadata so the exchange UI
  -- can list them with correct poster/tagline/runtime. The `parody`
  -- flag is the routing hinge that keeps them out of the main
  -- bMovies catalog.
  INSERT INTO bct_offers (id, studio_id, slug, title, tagline, poster_url, trailer_url, runtime_min, year, status, parody, created_by)
  VALUES
    (gen_random_uuid(), studio_uuid, 'star-boors',        'Star bOOrs',             'May the jiggle be with you.',
     '/boovies-star-trailer.gif',       '/boovies-star-preview.html',       121, 1977, 'live', true, 'platform'),
    (gen_random_uuid(), studio_uuid, 'boobfather',        'The bOObfather',         'An offer you can''t jiggle out of.',
     '/boovies-boobfather-trailer.gif', '/boovies-boobfather-preview.html', 175, 1972, 'live', true, 'platform'),
    (gen_random_uuid(), studio_uuid, 'jurassic-pork',     'Jurassic Pork',          '65 million years in the making. Still bouncy.',
     '/boovies-jurassic-trailer.gif',   '/boovies-jurassic-preview.html',   127, 1993, 'live', true, 'platform'),
    (gen_random_uuid(), studio_uuid, 'raiders',           'Raid-OO-rs of the Lost Ark', 'It belongs in a museum. Behind plexiglass.',
     '/boovies-raiders-trailer.gif',    '/boovies-raiders-preview.html',    115, 1981, 'live', true, 'platform'),
    (gen_random_uuid(), studio_uuid, 'pulp-fiction',      'Pulp Fict-OO-n',         'Royale with cheese.',
     '/boovies-pulp-trailer.gif',       '/boovies-pulp-preview.html',       154, 1994, 'live', true, 'platform'),
    (gen_random_uuid(), studio_uuid, 'booning',           'The bOOning',            'All jiggle and no wobble makes Jack a dull boy.',
     '/boovies-booning-trailer.gif',    '/boovies-booning-preview.html',    146, 1980, 'live', true, 'platform')
  ON CONFLICT (slug) DO UPDATE
    SET parody     = EXCLUDED.parody,
        poster_url = EXCLUDED.poster_url,
        trailer_url= EXCLUDED.trailer_url,
        tagline    = EXCLUDED.tagline;
END $$;
