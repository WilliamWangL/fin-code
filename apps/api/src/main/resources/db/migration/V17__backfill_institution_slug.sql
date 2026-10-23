-- V17__backfill_institution_slug.sql
-- Backfill financial_institution.slug (added by V16) so the website directory
-- can address institutions by slug (apps/web /banks/[slug], by-slug API).
--
-- Three-tier strategy:
--   1. Static mapping wins: the 11 institutions that exist both in the
--      hand-curated web dataset (banks.ts) and in the imported directory get
--      their website slug, keeping every already-published URL stable
--      (icbc, anz, ...). Each mapping row matches either the English name
--      (CBA/Westpac/CN anchors) or the short name (NAB/ANZ, whose directory
--      rows carry the expanded legal-style name_en); a row with several
--      directory entries (the BSB import creates one row per source
--      abbreviation, e.g. CBA + "CST") maps only the group's smallest-id
--      row - the others stay slug-less as non-representative duplicates.
--      A temp table cannot be referenced twice in one statement (MySQL error
--      1137 "Can't reopen table"), so the min-id groups are materialised
--      first (tmp_static_group).
--   2. Rule backfill for everything else, representative rows only
--      (same country + COALESCE(name_en, name_local) group, smallest id):
--      English name -> ASCII kebab (lower, non [a-z0-9] -> dash, trimmed to
--      100, trailing dashes stripped - isomorphic to the web toSlug()).
--      Chinese name (no name_en) -> CJK-preserving slug (Unicode letters and
--      numbers kept), e.g. /banks/北京银行. All name_en values verified pure
--      ASCII, so no NFKD normalisation is needed in SQL.
--      Slugs are globally unique (uk_financial_institution_slug spans all
--      countries, and directory imports can hold the same English name in
--      several countries - e.g. Bank of China rows for both CN and AU), so
--      the backfill de-duplicates in one pass: rule candidates compete with
--      already-assigned static slugs in a ROW_NUMBER window ordered
--      static-first, then by id; the winner keeps the clean slug and every
--      runner-up gets a globally unique "-<id>" suffix (id can never
--      collide, unlike an ordinal).
-- Also backfills name_norm (V16 column) as LOWER(TRIM(name)) for M2 search.

-- 1) Hand-curated website slugs for institutions present in the directory.
-- Tiny lookup table (11 rows); no key constraints - match columns are NULLable.
CREATE TEMPORARY TABLE tmp_static_slug (
    iso2       VARCHAR(2)   NOT NULL,
    name_en    VARCHAR(200) NULL,
    short_name VARCHAR(100) NULL,
    slug       VARCHAR(140) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

INSERT INTO tmp_static_slug (iso2, name_en, short_name, slug) VALUES
    -- Australia (CBA/Westpac matched by name_en, NAB/ANZ by short_name)
    ('AU', 'Commonwealth Bank of Australia', NULL, 'commonwealth-bank'),
    ('AU', 'Westpac Banking Corporation',    NULL, 'westpac'),
    ('AU', NULL, 'NAB', 'national-australia-bank'),
    ('AU', NULL, 'ANZ', 'anz'),
    -- China (CNAPS ANCHORS names, identical to the web dataset nameEn)
    ('CN', 'Industrial and Commercial Bank of China', NULL, 'icbc'),
    ('CN', 'Bank of China',                         NULL, 'bank-of-china'),
    ('CN', 'China Construction Bank',               NULL, 'china-construction-bank'),
    ('CN', 'Agricultural Bank of China',            NULL, 'agricultural-bank-of-china'),
    ('CN', 'Bank of Communications',                NULL, 'bank-of-communications'),
    ('CN', 'China Merchants Bank',                  NULL, 'china-merchants-bank'),
    ('CN', 'Postal Savings Bank of China',          NULL, 'psbc');

-- Static mapping predicate: name_en mappings match the name_en column,
-- short_name mappings (name_en NULL) match the short_name column.
-- Materialised once so the UPDATE below can join it twice.
CREATE TEMPORARY TABLE tmp_static_group AS
SELECT fi2.country_id, t2.name_en, t2.short_name, MIN(fi2.id) AS min_id
FROM financial_institution fi2
JOIN country c2 ON c2.id = fi2.country_id
JOIN tmp_static_slug t2
  ON c2.iso2 = t2.iso2
 AND ((t2.name_en IS NOT NULL AND fi2.name_en <=> t2.name_en)
   OR (t2.name_en IS NULL AND fi2.short_name <=> t2.short_name))
GROUP BY fi2.country_id, t2.name_en, t2.short_name;

UPDATE financial_institution fi
JOIN country c ON c.id = fi.country_id
JOIN tmp_static_slug t
  ON c.iso2 = t.iso2
 AND ((t.name_en IS NOT NULL AND fi.name_en <=> t.name_en)
   OR (t.name_en IS NULL AND fi.short_name <=> t.short_name))
JOIN tmp_static_group g
  ON g.country_id = fi.country_id
 AND ((g.name_en IS NOT NULL AND fi.name_en <=> g.name_en)
   OR (g.name_en IS NULL AND fi.short_name <=> g.short_name))
 AND fi.id = g.min_id
SET fi.slug = t.slug;

-- 2) Rule backfill with in-pass global de-duplication. The window partitions
-- over the union of already-assigned static slugs (is_rule = 0, always first)
-- and rule candidates (is_rule = 1): a candidate colliding with a static slug
-- or an earlier-id row of its own candidate group gets the "-<id>" suffix.
UPDATE financial_institution fi
JOIN (
    SELECT x.id, x.candidate, x.is_rule,
           ROW_NUMBER() OVER (
               PARTITION BY x.candidate
               ORDER BY x.is_rule, x.id) AS rn
    FROM (
        SELECT fi2.id,
               CASE
                   WHEN fi2.name_en IS NOT NULL AND fi2.name_en <> '' THEN
                       -- ASCII kebab, isomorphic to the web toSlug(); name_en
                       -- is pure ASCII (verified), so LOWER + dash-out covers
                       -- the NFKD step.
                       REGEXP_REPLACE(
                           LEFT(REGEXP_REPLACE(LOWER(TRIM(fi2.name_en)), '[^0-9a-z]+', '-'), 100),
                           '-+$', '')
                   ELSE
                       -- Chinese slug: keep Unicode letters/numbers, dash out
                       -- the rest.
                       REGEXP_REPLACE(
                           LEFT(REGEXP_REPLACE(LOWER(TRIM(fi2.name_local)), '[^\\p{L}\\p{N}]+', '-'), 100),
                           '-+$', '')
               END AS candidate,
               1 AS is_rule
        FROM financial_institution fi2
        JOIN (SELECT id,
                     ROW_NUMBER() OVER (
                         PARTITION BY country_id, COALESCE(name_en, name_local)
                         ORDER BY id) AS rep_rn
              FROM financial_institution) rep
          ON rep.id = fi2.id AND rep.rep_rn = 1
        WHERE fi2.slug IS NULL
          AND (fi2.name_en IS NOT NULL OR fi2.name_local IS NOT NULL)
        UNION ALL
        -- Static slugs occupy their slot so colliding candidates are suffixed.
        SELECT id, slug, 0 AS is_rule
        FROM financial_institution
        WHERE slug IS NOT NULL
    ) x
    WHERE x.candidate IS NOT NULL AND x.candidate <> ''
) ranked ON ranked.id = fi.id AND ranked.is_rule = 1
SET fi.slug = CASE
    WHEN ranked.rn = 1 THEN ranked.candidate
    ELSE CONCAT(LEFT(ranked.candidate, 120), '-', ranked.id)
END;

-- name_norm for the M2 search pipeline: lower-cased display name.
UPDATE financial_institution
SET name_norm = LOWER(TRIM(COALESCE(name_en, name_local)))
WHERE name_norm IS NULL;

DROP TEMPORARY TABLE tmp_static_slug;
DROP TEMPORARY TABLE tmp_static_group;
