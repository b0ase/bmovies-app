-- 013_film_stats_exclude_swarm.sql
--
-- The bct_film_stats view was counting swarm-demo fan-out payments
-- (settlement_provider='studio-cfo', price_usd=0) as real share sales.
-- With the swarm running at ~20 TX/s to hit BSVA's 1.5M/24h TX-volume
-- target, offers quickly hit percent_sold > 100%, which made the
-- cap-table grid on /offer.html render every tranche as "sold" (grey)
-- so no BSV-funding tiles were clickable.
--
-- This migration rewrites the view to exclude the swarm rows at the
-- JOIN predicate. Idempotent (CREATE OR REPLACE). Safe to re-apply.

CREATE OR REPLACE VIEW bct_film_stats AS
SELECT o.id AS offer_id,
       o.title,
       COALESCE(SUM(t.price_usd), 0::numeric) AS gross_usd,
       COUNT(t.id) AS tickets_sold,
       COALESCE(SUM(s.percent_bought), 0::numeric) AS percent_sold
  FROM bct_offers o
  LEFT JOIN bct_ticket_sales t ON t.offer_id = o.id
  LEFT JOIN bct_share_sales  s ON s.offer_id  = o.id
    AND (s.settlement_provider IS NULL OR s.settlement_provider <> 'studio-cfo')
    AND (s.price_usd IS NULL OR s.price_usd > 0)
 GROUP BY o.id, o.title;
