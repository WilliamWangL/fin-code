#!/usr/bin/env python3
"""Generate the UK & Ireland Sort Code import SQL for the fincode database.

Reads the community "UK and Ireland Sort Codes" workbook under
data/sortcodes/ and emits a single SQL file (default
data/sortcodes/import_sortcodes.sql) that populates:

  financial_institution  one row per unique bank name per country (~490)
  bank_branch            one row per unique (institution, branch name)
  bank_identifier        one row per 6-digit sort code (identifier_type=SORT_CODE)
  data_source            provenance row for the community dataset

Source notes:
  - The workbook has no address/city columns, so bank_branch carries the
    branch title only; SortCodeData responses will render city as null.
  - Bank names are the truncated (<=35 char) EISCD-style captions; the
    occasional unclosed parenthesis is kept verbatim.
  - Country assignment: the source mixes UK clearing codes with Irish NSC
    codes. Four unambiguous (prefix, name) pairs are routed to IE (Republic
    of Ireland clearing); everything else stays GB. Ulster Bank / First
    Trust / Northern Bank are Northern-Irish and therefore GB.
  - EISCD captions are cut at 35 characters, so a handful of banks appear
    twice ("...COMMERCIAL BAN" + "...COMMERCIAL BANK"). Truncated captions
    that are a strict prefix of a longer caption in the same country are
    folded onto the longer name before deduplication.

Pipeline (mirrors import_cnaps.py):
  1. Sort codes are parsed from the FIRST column ("01-00-04"); the third
     column is numeric and has lost leading zeros in Excel (010004 -> 10004).
  2. Institutions are de-duplicated Python-side (same-name rows collapse to
     one insert) to avoid the SELECT DISTINCT duplicate-institution trap.
  3. The identifier back-fill joins bank_branch on
     (institution_id, branch_name) behind a throwaway composite index.
  4. Slugs are back-filled with the V17 rule (ASCII kebab + "-<id>" suffix
     on collision) scoped to the freshly inserted GB/IE rows. Slugs already
     published by the website's static dataset (banks.ts) are reserved: a
     colliding row gets the "-<id>" suffix so it cannot shadow a static
     page, then the static slug contract (barclays / lloyds-bank) restores
     the two intentional folds.

Re-runnable: a defensive pre-clean deletes previous rows of this import
(identified via country GB/IE + identifier_type='SORT_CODE') before insert.

Usage:
  python3 import_sortcodes.py [--data DIR] [--out FILE]
Defaults: --data data/sortcodes  --out data/sortcodes/import_sortcodes.sql
Then import with (dev stack):
  docker exec -i fincode-mysql mysql -ufincode -pfincode_dev fincode < import_sortcodes.sql
"""

from __future__ import annotations

import argparse
import re
from collections import Counter
from pathlib import Path

import openpyxl

from static_contract import website_static_slugs

# (sort-code prefix, exact bank name) pairs that belong to Republic of
# Ireland clearing. Prefix pinning matters: BANK OF IRELAND and ALLIED IRISH
# BANKS also operate Northern-Irish / UK branches on UK-only code ranges.
IE_RULES: set[tuple[str, str]] = {
    ("90", "BANK OF IRELAND"),
    ("93", "ALLIED IRISH BANKS"),
    ("99", "PERMANENT TSB"),
    ("99", "BANK OF SCOTLAND IRELAND"),
}

CENTRAL_BANK_NAMES = {"BANK OF ENGLAND"}

SOURCE_CODE = "uk-ie-sort-codes"
SOURCE_NAME = "UK & Ireland Sort Codes (community dataset)"


def clean(value: object) -> str:
    """Collapse tabs/space runs, trim, upper-case (source is mostly caps)."""
    return re.sub(r"\s+", " ", str(value or "").replace("\t", " ")).strip().upper()


def sql_str(value: str | None) -> str:
    if value is None:
        return "NULL"
    escaped = value.replace("\\", "\\\\").replace("'", "\\'")
    return f"'{escaped}'"


def fold_truncated_names(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    """Point 35-char EISCD captions at their longer spelling when both exist."""
    names_by_country: dict[str, set[str]] = {}
    for row in rows:
        names_by_country.setdefault(row["country"], set()).add(row["name"])

    canonical: dict[tuple[str, str], str] = {}
    for country, names in names_by_country.items():
        for name in names:
            if len(name) < 34:
                continue
            longer = [other for other in names
                      if len(other) > len(name) and other.startswith(name)]
            if longer:
                canonical[(country, name)] = max(longer, key=len)

    folded = 0
    for row in rows:
        target = canonical.get((row["country"], row["name"]))
        if target:
            row["name"] = target
            folded += 1
    if folded:
        print(f"folded {folded} rows onto their untruncated bank name "
              f"({len(canonical)} captions)")
    return rows


def load_rows(path: Path) -> list[dict[str, str]]:
    """Parse the workbook into {code, name, branch, country} dicts."""
    wb = openpyxl.load_workbook(path, read_only=True)
    ws = wb[wb.sheetnames[0]]

    rows: list[dict[str, str]] = []
    skipped: list[tuple[str, str]] = []
    seen: set[str] = set()
    for raw in ws.iter_rows(min_row=2, values_only=True):
        if not raw or not raw[0]:
            continue
        # First column is the dashed sort code; column 3 lost leading zeros.
        code = re.sub(r"\D", "", str(raw[0]))
        name = clean(raw[3])
        branch = re.sub(r"\s+", " ", str(raw[4] or "").replace("\t", " ")).strip()
        if not re.fullmatch(r"\d{6}", code) or not name:
            skipped.append((str(raw[0]), name))
            continue
        if code in seen:
            skipped.append((code, name + " (duplicate code)"))
            continue
        seen.add(code)
        rows.append({
            "code": code,
            "name": name,
            "branch": branch or name,
            "country": "IE" if (code[:2], name) in IE_RULES else "GB",
        })
    wb.close()
    if skipped:
        print(f"skipped {len(skipped)} rows, e.g.: {skipped[:5]}")
    return fold_truncated_names(rows)


def build_sql(rows: list[dict[str, str]], out_path: Path) -> Counter:
    parts: list[str] = []

    # Institutions, de-duplicated Python-side: (name, country) -> one row.
    institutions: dict[tuple[str, str], str] = {}
    for row in rows:
        institutions.setdefault((row["name"], row["country"]), "BANK")
    for (name, _country) in institutions:
        if name in CENTRAL_BANK_NAMES:
            institutions[(name, _country)] = "CENTRAL_BANK"

    parts.append(
        "SET NAMES utf8mb4;\n"
        "\n"
        "-- -----------------------------------------------------------------\n"
        "-- Provenance + country rows (guarded, re-runnable).\n"
        "-- -----------------------------------------------------------------\n"
        f"INSERT INTO data_source (name, source_type, provider, source_url, license,\n"
        "                         commercial_use, redistribution_allowed, storage_allowed, status)\n"
        f"SELECT '{SOURCE_NAME}', 'COMMUNITY', 'Community UK/Ireland sort code directory',\n"
        "       NULL, 'Community-collected EISCD-derived data', FALSE, FALSE, TRUE, 'ACTIVE'\n"
        "WHERE NOT EXISTS (SELECT 1 FROM data_source WHERE name = "
        f"'{SOURCE_NAME}');\n"
        "SET @src_id := (SELECT id FROM data_source WHERE name = "
        f"'{SOURCE_NAME}' ORDER BY id LIMIT 1);\n"
        "\n"
        "INSERT INTO country (iso2, iso3, numeric_code, name_en, name_local,\n"
        "                     currency_code, swift_supported, iban_supported,\n"
        "                     local_identifier_type)\n"
        "SELECT 'GB', 'GBR', '826', 'United Kingdom', '英国', 'GBP', TRUE, TRUE, 'SORT_CODE'\n"
        "WHERE NOT EXISTS (SELECT 1 FROM country WHERE iso2 = 'GB');\n"
        "INSERT INTO country (iso2, iso3, numeric_code, name_en, name_local,\n"
        "                     currency_code, swift_supported, iban_supported,\n"
        "                     local_identifier_type)\n"
        "SELECT 'IE', 'IRL', '372', 'Ireland', '爱尔兰', 'EUR', TRUE, TRUE, NULL\n"
        "WHERE NOT EXISTS (SELECT 1 FROM country WHERE iso2 = 'IE');\n"
        "SET @gb_id := (SELECT id FROM country WHERE iso2 = 'GB' LIMIT 1);\n"
        "SET @ie_id := (SELECT id FROM country WHERE iso2 = 'IE' LIMIT 1);\n"
        "\n"
        "-- -----------------------------------------------------------------\n"
        "-- Defensive pre-clean: remove rows from a previous run of this\n"
        "-- import (GB/IE institutions carrying a SORT_CODE identifier) so the\n"
        "-- script can be re-run cleanly. Order: identifiers -> branches ->\n"
        "-- institutions -> data_source.\n"
        "-- -----------------------------------------------------------------\n"
        "START TRANSACTION;\n"
        "DELETE bi FROM bank_identifier bi\n"
        "JOIN financial_institution fi ON fi.id = bi.institution_id\n"
        "WHERE bi.identifier_type = 'SORT_CODE'\n"
        "  AND fi.country_id IN (@gb_id, @ie_id);\n"
        "DELETE bb FROM bank_branch bb\n"
        "JOIN financial_institution fi ON fi.id = bb.institution_id\n"
        "WHERE fi.country_id IN (@gb_id, @ie_id)\n"
        "  AND NOT EXISTS (SELECT 1 FROM bank_identifier bi WHERE bi.branch_id = bb.id);\n"
        "DELETE fi FROM financial_institution fi\n"
        "WHERE fi.country_id IN (@gb_id, @ie_id)\n"
        "  AND NOT EXISTS (SELECT 1 FROM bank_identifier bi WHERE bi.institution_id = fi.id);\n"
        "COMMIT;\n"
    )

    # A previously failed run can leave the throwaway join index behind
    # (DDL never rolls back); clear it defensively so reruns don't abort on
    # "Duplicate key name". MySQL has no DROP INDEX IF EXISTS, hence PREPARE.
    parts.append(
        "-- Drop a leftover throwaway join index from an aborted run.\n"
        "SET @drop_idx := IF(EXISTS(SELECT 1 FROM information_schema.statistics\n"
        "         WHERE table_schema = DATABASE() AND table_name = 'bank_branch'\n"
        "           AND index_name = 'idx_sortcode_import_join'),\n"
        "  'ALTER TABLE bank_branch DROP INDEX idx_sortcode_import_join', 'SELECT 1');\n"
        "PREPARE stmt FROM @drop_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;\n"
    )

    parts.append(
        "-- -----------------------------------------------------------------\n"
        "-- Staging table: one row per sort code.\n"
        "-- -----------------------------------------------------------------\n"
        "CREATE TEMPORARY TABLE tmp_sort_code (\n"
        "    sort_code    VARCHAR(6)   NOT NULL PRIMARY KEY,\n"
        "    inst_name    VARCHAR(200) NOT NULL,\n"
        "    country_iso2 CHAR(2)      NOT NULL,\n"
        "    branch_name  VARCHAR(200) NOT NULL,\n"
        "    KEY idx_tmp_sort_inst (inst_name, country_iso2)\n"
        ") ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;\n"
    )

    esc = sql_str  # local alias keeps the batches compact
    batch: list[str] = []
    for row in rows:
        batch.append(
            f"({esc(row['code'])},{esc(row['name'])},{esc(row['country'])},"
            f"{esc(row['branch'])})"
        )
        if len(batch) >= 1000:
            parts.append("INSERT INTO tmp_sort_code VALUES\n  " + ",\n  ".join(batch) + ";\n")
            batch = []
    if batch:
        parts.append("INSERT INTO tmp_sort_code VALUES\n  " + ",\n  ".join(batch) + ";\n")

    # Institutions are emitted directly from the Python-side assembly: one
    # row per unique (name, country). legal_name = name_en = short_name =
    # source caption; short_name feeds the site breadcrumb and its
    # BreadcrumbList JSON-LD label, which must never be blank.
    inst_batch: list[str] = []
    for (name, country), inst_type in institutions.items():
        country_var = "@ie_id" if country == "IE" else "@gb_id"
        inst_batch.append(
            f"({esc(name)},{esc(name)},{esc(name)},{esc(name)},{country_var},"
            f"{esc(inst_type)},'ACTIVE')"
        )
    parts.append("START TRANSACTION;\n")
    for i in range(0, len(inst_batch), 500):
        parts.append(
            "INSERT INTO financial_institution (legal_name, name_en, short_name, name_norm,\n"
            "                                   country_id, institution_type, status) VALUES\n  "
            + ",\n  ".join(inst_batch[i:i + 500]) + ";\n"
        )

    # The identifier back-fill joins bank_branch on
    # (institution_id, branch_name); the base schema only indexes
    # institution_id. Same-name branches of one institution (e.g. HEAD
    # OFFICE) collapse to a single row and carry several sort codes.
    parts.append(
        "\n"
        "-- Branch points (duplicate branch names of one institution collapse to one row).\n"
        "INSERT INTO bank_branch (institution_id, branch_name, status)\n"
        "SELECT DISTINCT fi.id, t.branch_name, 'ACTIVE'\n"
        "FROM tmp_sort_code t\n"
        "JOIN financial_institution fi\n"
        "  ON fi.name_en = t.inst_name\n"
        " AND fi.country_id = (CASE WHEN t.country_iso2 = 'IE' THEN @ie_id ELSE @gb_id END);\n"
        "COMMIT;\n"
        "\n"
        "-- Throwaway join index for the identifier back-fill (DDL commits implicitly).\n"
        "ALTER TABLE bank_branch ADD INDEX idx_sortcode_import_join\n"
        "    (institution_id, branch_name);\n"
        "\n"
        "START TRANSACTION;\n"
        "-- Sort code identifiers, one per staged code, linked back to the branch.\n"
        "INSERT INTO bank_identifier (institution_id, branch_id, identifier_type, identifier_value,\n"
        "                             country_code, status, source_id)\n"
        "SELECT fi.id, bb.id, 'SORT_CODE', t.sort_code, t.country_iso2, 'ACTIVE', @src_id\n"
        "FROM tmp_sort_code t\n"
        "JOIN financial_institution fi\n"
        "  ON fi.name_en = t.inst_name\n"
        " AND fi.country_id = (CASE WHEN t.country_iso2 = 'IE' THEN @ie_id ELSE @gb_id END)\n"
        "JOIN bank_branch bb ON bb.institution_id = fi.id AND bb.branch_name = t.branch_name;\n"
        "COMMIT;\n"
        "\n"
        "ALTER TABLE bank_branch DROP INDEX idx_sortcode_import_join;\n"
        "DROP TEMPORARY TABLE tmp_sort_code;\n"
    )

    # Slug back-fill (V17 rule) scoped to this import: ASCII kebab from
    # name_en; colliding candidates (vs. every already-assigned slug or an
    # earlier-id row of the same candidate) get a "-<id>" suffix.
    parts.append(
        "\n"
        "-- Slug back-fill for the new institutions (V17 rule, GB/IE scope).\n"
        "UPDATE financial_institution fi\n"
        "JOIN (\n"
        "    SELECT x.id, x.candidate,\n"
        "           ROW_NUMBER() OVER (\n"
        "               PARTITION BY x.candidate\n"
        "               ORDER BY x.is_rule, x.id) AS rn\n"
        "    FROM (\n"
        "        SELECT fi2.id,\n"
        "               REGEXP_REPLACE(\n"
        "                   LEFT(REGEXP_REPLACE(LOWER(TRIM(fi2.name_en)), '[^0-9a-z]+', '-'), 100),\n"
        "                   '-+$', '') AS candidate,\n"
        "               1 AS is_rule\n"
        "        FROM financial_institution fi2\n"
        "        WHERE fi2.slug IS NULL\n"
        "          AND fi2.country_id IN (@gb_id, @ie_id)\n"
        "          AND fi2.name_en IS NOT NULL AND fi2.name_en <> ''\n"
        "        UNION ALL\n"
        "        -- Already-assigned slugs occupy their slot so colliding\n"
        "        -- candidates are suffixed.\n"
        "        SELECT id, slug, 0 AS is_rule\n"
        "        FROM financial_institution\n"
        "        WHERE slug IS NOT NULL\n"
        "    ) x\n"
        "    WHERE x.candidate IS NOT NULL AND x.candidate <> ''\n"
        ") ranked ON ranked.id = fi.id\n"
        "SET fi.slug = CASE\n"
        "    WHEN ranked.rn = 1 THEN ranked.candidate\n"
        "    ELSE CONCAT(LEFT(ranked.candidate, 120), '-', ranked.id)\n"
        "END;\n"
    )

    # Slugs already published by the static dataset are reserved: a GB/IE row
    # that landed on one of those candidates is a *different* institution
    # (e.g. GB "SOCIETE GENERALE" vs the French static page) and would shadow
    # it, so it takes the same "-<id>" suffix as any other collision.
    static_slugs = sorted(website_static_slugs())
    if static_slugs:
        reserved = ", ".join(f"'{slug}'" for slug in static_slugs)
        parts.append(
            "\n"
            "-- Website slug contract: never steal a published static slug.\n"
            "UPDATE financial_institution\n"
            "SET slug = CONCAT(LEFT(slug, 120), '-', id)\n"
            "WHERE country_id IN (@gb_id, @ie_id)\n"
            f"  AND slug IN ({reserved});\n"
        )

    # Website slug contract for the hand-curated banks.ts records: those
    # static pages fold onto their directory rows by name, and the detail
    # pages re-query the live API by the static slug - so the database row
    # must carry it instead of a generated -<id> variant. HSBC keeps its
    # own slug: "HSBC UK Bank plc" (static hsbc-uk) and "HSBC Bank plc"
    # are separate legal entities and must not be folded.
    parts.append(
        "\n"
        "-- Static slug contract (barclays / lloyds-bank), idempotent.\n"
        "UPDATE financial_institution SET slug = 'barclays'\n"
        "WHERE country_id = @gb_id AND name_en = 'BARCLAYS BANK PLC';\n"
        "UPDATE financial_institution SET slug = 'lloyds-bank'\n"
        "WHERE country_id = @gb_id AND name_en = 'LLOYDS BANK PLC';\n"
        "\n"
        "-- Verification counts.\n"
        "SELECT 'GB institutions' AS metric, COUNT(*) AS n FROM financial_institution\n"
        "WHERE country_id = @gb_id\n"
        "UNION ALL\n"
        "SELECT 'IE institutions', COUNT(*) FROM financial_institution WHERE country_id = @ie_id\n"
        "UNION ALL\n"
        "SELECT 'GB branches', COUNT(*) FROM bank_branch bb\n"
        "JOIN financial_institution fi ON fi.id = bb.institution_id WHERE fi.country_id = @gb_id\n"
        "UNION ALL\n"
        "SELECT 'IE branches', COUNT(*) FROM bank_branch bb\n"
        "JOIN financial_institution fi ON fi.id = bb.institution_id WHERE fi.country_id = @ie_id\n"
        "UNION ALL\n"
        "SELECT 'GB sort codes', COUNT(*) FROM bank_identifier\n"
        "WHERE identifier_type = 'SORT_CODE' AND country_code = 'GB'\n"
        "UNION ALL\n"
        "SELECT 'IE sort codes', COUNT(*) FROM bank_identifier\n"
        "WHERE identifier_type = 'SORT_CODE' AND country_code = 'IE';\n"
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write("".join(parts))
    return Counter(
        {"institutions": len(institutions),
         "countries_ie_rows": sum(1 for r in rows if r["country"] == "IE")}
    )


def main() -> None:
    here = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=here.parent.parent / "data" / "sortcodes",
                        help="directory containing the source workbook")
    parser.add_argument("--out", type=Path, default=None,
                        help="output SQL path (default <data>/import_sortcodes.sql)")
    args = parser.parse_args()

    xlsx = next(p for p in args.data.glob("*.xlsx") if "Sort Codes" in p.stem)
    rows = load_rows(xlsx)

    out_path = args.out or (args.data / "import_sortcodes.sql")
    counters = build_sql(rows, out_path)

    size_mb = out_path.stat().st_size / 1024 / 1024
    print("\n===== Import summary =====")
    print(f"output: {out_path} ({size_mb:.1f} MB)")
    print(f"rows: {len(rows)} sort codes")
    print(f"institutions: {counters['institutions']}")
    print(f"IE-routed rows: {counters['countries_ie_rows']} "
          f"(GB: {len(rows) - counters['countries_ie_rows']})")


if __name__ == "__main__":
    main()
