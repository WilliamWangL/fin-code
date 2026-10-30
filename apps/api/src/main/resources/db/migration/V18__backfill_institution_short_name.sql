-- V18__backfill_institution_short_name.sql
-- Institution display names: the CNAPS importer writes no short_name for
-- non-anchor rows (every rural/commercial bank and village bank) and the
-- EISCD sort-code importer writes neither short_name nor name_local at all.
-- financial_institution.short_name is the source of the site breadcrumb and
-- of the BreadcrumbList JSON-LD label, so a NULL/empty value rendered an
-- empty ListItem name and Google rejected the whole breadcrumb as invalid
-- ("应指定 name 或 item.name"), while the detail page's overview subtitle
-- stayed blank.
-- Backfill only where the value is genuinely missing, preferring the local
-- name and falling back to the legal name; short_name is capped at 64
-- characters (LEFT) so a long legal name cannot trip the column length in
-- strict mode. name_en is deliberately not backfilled: an English name is an
-- enrichment result, and a missing one must stay missing so it is visible as
-- an enrichment gap rather than being faked with a local-script name.

UPDATE financial_institution
SET short_name = LEFT(
        COALESCE(NULLIF(TRIM(name_local), ''), NULLIF(TRIM(legal_name), '')), 64)
WHERE (short_name IS NULL OR TRIM(short_name) = '')
  AND COALESCE(NULLIF(TRIM(name_local), ''), NULLIF(TRIM(legal_name), '')) IS NOT NULL;

-- Local name is the last resort before the slug on every display path
-- (page title chain, alternateName, export snapshot); legal_name is NOT NULL
-- by schema, so it always yields a value.
UPDATE financial_institution
SET name_local = TRIM(legal_name)
WHERE (name_local IS NULL OR TRIM(name_local) = '')
  AND TRIM(legal_name) <> '';
