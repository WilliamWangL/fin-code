#!/usr/bin/env python3
"""Export per-country bank directory snapshots from the fincode database.

Produces, for each country in --countries:
  1. <web>/src/lib/data/generated/<iso-lower>-institutions.json
     Institution index rows keyed "<iso-lower>-<db id>" carrying the database
     slug (V17 backfill) as the site URL contract, plus a snapshotKey on the
     country's top-3 banks by branch count only. Every institution lands in
     the index, so the website search covers the full directory while only
     the head banks ship build-time branch snapshots.
  2. <web>/public/data/branches/<key>.json (top-3 banks only)
     Full branch list per institution (lazy-loaded by the branch explorer).
     Stale <iso>-*.json files from previous runs are pruned per country.

Read-only against the database. Re-runnable: output is deterministic for the
same DB state, and files are overwritten in place.

Rows describing the same institution (the BSB import creates one row per
source abbreviation, e.g. "Commonwealth Bank ..." and "CST") are merged into
a single export row before writing, mirroring the match rules of
apps/web/src/lib/data/au-directory.ts. Chinese institutions have no English
name, so their merge key is the exact local name instead of the normalised
English form (which collapses to "" for CJK text).

Usage:
  python3 export_snapshot.py [--countries AU,CN] [--host H] [--port P]
                             [--user U] [--password PW]
                             [--database DB] [--web ROOT]
Defaults: --countries AU,CN,GB,IE, targeting the dev stack
(127.0.0.1:3307 fincode/fincode_dev).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

from static_contract import website_static_slugs

# Branch identifier type joined onto each branch row, per country.
COUNTRY_CONFIG = {
    "AU": {"identifier_type": "BSB"},
    "CN": {"identifier_type": "CNAPS"},
    "GB": {"identifier_type": "SORT_CODE"},
    "IE": {"identifier_type": "SORT_CODE"},
}

# Website slugs of the hand-curated static dataset (banks.ts) per country.
# The export warns when one is missing from the database - the website merge
# layer would then fail to fold the static record onto its directory row.
# GB is intentionally absent: its static records (barclays, hsbc-uk,
# lloyds-bank) fold by normalised NAME, not by slug equality, so the DB
# slugs (barclays-bank-plc, ...) never match the website slugs.
STATIC_SLUGS = {
    "AU": {"commonwealth-bank", "westpac", "national-australia-bank", "anz"},
    "CN": {"icbc", "bank-of-china", "china-construction-bank",
           "agricultural-bank-of-china", "bank-of-communications",
           "china-merchants-bank", "psbc"},
}

TOP_SNAPSHOTS_PER_COUNTRY = 3

INSTITUTION_SQL = """
SELECT fi.id,
       fi.name_en,
       fi.legal_name,
       fi.short_name,
       fi.name_local,
       fi.slug,
       fi.institution_type
FROM financial_institution fi
JOIN country c ON c.id = fi.country_id
WHERE c.iso2 = '%s' AND fi.status = 'ACTIVE'
ORDER BY fi.id
"""

BRANCH_SQL = """
SELECT bb.institution_id,
       bb.branch_name,
       bb.branch_name_en,
       bb.city,
       COALESCE(bb.state, bb.province),
       bb.address,
       bb.postal_code,
       bi.identifier_value,
       bb.id
FROM bank_branch bb
JOIN financial_institution fi ON fi.id = bb.institution_id
JOIN country c ON c.id = fi.country_id
LEFT JOIN bank_identifier bi ON bi.branch_id = bb.id AND bi.identifier_type = '%s'
WHERE c.iso2 = '%s'
ORDER BY bb.institution_id, bb.id
"""

# Strip characters that would break the mysql --batch TSV contract.
# mysql --batch renders SQL NULL as the literal string "NULL".
def clean(value: str | None) -> str:
    if value is None or value == "NULL":
        return ""
    return value.replace("\\t", " ").replace("\\n", " ").strip()


# Mirrors lib/data/au-directory.ts normalizeInstitutionName(): lowercase,
# strip accents/punctuation and common corporate suffix tokens. Only defined
# for Latin names - CJK names collapse to "" and must be matched by their
# exact local name instead (see export_country).
SUFFIX_TOKENS = {
    "limited", "ltd", "plc", "bank", "banking", "corporation", "corp",
    "group", "holdings", "the", "and", "of", "australia",
}


def normalize_name(name: str) -> str:
    decomposed = unicodedata.normalize("NFKD", name.lower())
    stripped = "".join(
        ch for ch in decomposed if not (0x0300 <= ord(ch) <= 0x036F)
    )
    base = re.sub(r"[^a-z0-9]+", " ", stripped).strip()
    tokens = [t for t in base.split(" ") if t and t not in SUFFIX_TOKENS]
    return " ".join(tokens) or base


def run_sql(args: argparse.Namespace, sql: str) -> list[list[str]]:
    cmd = [
        "mysql",
        f"-h{args.host}",
        f"-P{args.port}",
        f"-u{args.user}",
        f"-p{args.password}",
        args.database,
        "--batch",
        "--skip-column-names",
        "-e",
        sql,
    ]
    env = os.environ.copy()
    env["MYSQL_PWD"] = args.password
    result = subprocess.run(
        [c for c in cmd if not c.startswith("-p")],
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )
    if result.returncode != 0:
        # MYSQL_PWD carries the password; the -p flag must not appear in argv.
        print(f"mysql exited with {result.returncode}: {result.stderr.strip()}", file=sys.stderr)
        sys.exit(result.returncode)
    rows: list[list[str]] = []
    for line in result.stdout.splitlines():
        line = line.rstrip("\n")
        if line:
            rows.append(line.split("\t"))
    return rows


def export_country(args: argparse.Namespace, iso2: str,
                   branch_dir: Path, generated_dir: Path) -> None:
    """Export one country's index + top-3 branch snapshots."""
    cfg = COUNTRY_CONFIG[iso2]
    prefix = iso2.lower()
    warnings: list[str] = []

    institutions: dict[str, dict] = {}
    for row in run_sql(args, INSTITUTION_SQL % iso2):
        key = f"{prefix}-{row[0]}"
        slug = clean(row[5])
        if not slug:
            slug = key
            warnings.append(f"{key}: slug missing (V17 not applied?), fell back to key")
        institutions[key] = {
            "key": key,
            "slug": slug,
            "nameEn": clean(row[1]),
            "nameLocal": clean(row[4]) or None,
            "legalName": clean(row[2]) or None,
            "shortName": clean(row[3]) or None,
            "institutionType": clean(row[6]) or "BANK",
            "branchesCount": 0,
            "snapshotKey": None,
            "headOffice": None,
        }

    # One row per bank_branch, not per attached identifier: UK/Irish branches
    # routinely carry several sort codes (NatWest: 2,391 codes on 1,405
    # branches), and the live API exposes one row - and counts - per branch.
    # The joined identifier rows therefore collapse onto the first code, so
    # the directory counts match the detail pages.
    branches_by_key: dict[str, list[dict]] = {}
    seen_branches: dict[str, set[str]] = {}
    for row in run_sql(args, BRANCH_SQL % (cfg["identifier_type"], iso2)):
        key = f"{prefix}-{row[0]}"
        branch_id = clean(row[8])
        seen = seen_branches.setdefault(key, set())
        if branch_id in seen:
            continue
        seen.add(branch_id)
        name = clean(row[1])
        name_en = clean(row[2])
        branches_by_key.setdefault(key, []).append(
            {
                "name": name_en or name,
                "nameLocal": name if name_en and name != name_en else None,
                "city": clean(row[3]) or None,
                "state": clean(row[4]) or None,
                "address": clean(row[5]) or None,
                "postalCode": clean(row[6]) or None,
                "code": clean(row[7]) or None,
            }
        )

    # ── Merge same-institution rows ──────────────────────────────────────────
    # The BSB import creates one row per source abbreviation, so several rows
    # can describe the same institution. Latin names group by the normalised
    # English name; Chinese rows (no name_en) group by their exact local name.
    for inst in institutions.values():
        inst["branchesCount"] = len(branches_by_key.get(inst["key"], []))

    groups: list[dict] = []
    by_norm: dict[str, dict] = {}
    by_short: dict[str, dict] = {}
    for inst in institutions.values():
        norm = normalize_name(inst["nameEn"]) if inst["nameEn"] else None
        short = (inst["shortName"] or "").strip().lower()
        group = (by_norm.get(norm) if norm else None) or (by_short.get(short) if short else None)
        if group is None:
            group = {"rows": [inst["key"]]}
            groups.append(group)
            if norm:
                by_norm[norm] = group
            if short:
                by_short[short] = group
        else:
            group["rows"].append(inst["key"])
            if short and short not in by_short:
                by_short[short] = group

    merged_rows = 0
    for group in groups:
        rows = group["rows"]
        if len(rows) == 1:
            continue
        keep = rows[0]  # rows follow the id order, so this is the lowest id
        merged_rows += len(rows) - 1
        rep = max(
            (institutions[key] for key in rows),
            key=lambda item: item["branchesCount"],
        )
        institutions[keep].update(
            nameEn=rep["nameEn"],
            nameLocal=rep["nameLocal"],
            legalName=rep["legalName"],
            shortName=rep["shortName"],
            institutionType=rep["institutionType"],
        )
        merged_branches: list[dict] = []
        seen_codes: set[str] = set()
        for key in rows:
            for branch in branches_by_key.get(key, []):
                code = branch.get("code")
                if code:
                    if code in seen_codes:
                        continue
                    seen_codes.add(code)
                merged_branches.append(branch)
        branches_by_key[keep] = merged_branches
        for key in rows:
            if key != keep:
                del institutions[key]
                branches_by_key.pop(key, None)

    # ── Top-N snapshot selection ─────────────────────────────────────────────
    ranked = sorted(
        institutions.values(),
        key=lambda item: (-item["branchesCount"], item["nameEn"] or item["nameLocal"] or ""),
    )
    snapshot_keys = {
        inst["key"] for inst in ranked[:TOP_SNAPSHOTS_PER_COUNTRY]
        if inst["branchesCount"] > 0
    }
    for inst in institutions.values():
        inst["snapshotKey"] = inst["key"] if inst["key"] in snapshot_keys else None

    index = []
    for inst in institutions.values():
        rows = branches_by_key.get(inst["key"], [])
        inst["branchesCount"] = len(rows)
        if rows:
            head = rows[0]
            inst["headOffice"] = {
                "name": head["name"],
                "city": head["city"],
                "address": head["address"],
            }
        if inst["snapshotKey"]:
            branch_file = branch_dir / f"{inst['key']}.json"
            branch_file.write_text(
                json.dumps({"institution": inst["key"], "count": len(rows), "branches": rows}, ensure_ascii=False),
                encoding="utf-8",
            )
        index.append(inst)

    # Drop stale per-country branch files (e.g. banks that fell out of top-N).
    for stale in branch_dir.glob(f"{prefix}-*.json"):
        if stale.stem not in snapshot_keys:
            stale.unlink()

    # Static fold integrity: every website slug of this country must exist.
    missing_static = STATIC_SLUGS.get(iso2, set()) - {i["slug"] for i in index}
    if missing_static:
        warnings.append(f"static slugs missing from {iso2} export: {sorted(missing_static)}")

    # A slug that belongs to a static page must not be reused by a different
    # institution (see static_contract.py) - the detail page resolves slugs
    # with a first-match lookup, so the duplicate would be unreachable. The
    # intended folds are exempt: per-country slug equality and the GB records
    # folded by name.
    fold_slugs = {"barclays", "lloyds-bank"}
    for slugs in STATIC_SLUGS.values():
        fold_slugs |= slugs
    collisions = (website_static_slugs() - fold_slugs) & {i["slug"] for i in index}
    if collisions:
        warnings.append(f"slugs shadowing website static pages: {sorted(collisions)}")

    index.sort(key=lambda item: (-item["branchesCount"], item["nameEn"] or item["nameLocal"] or ""))
    index_file = generated_dir / f"{prefix}-institutions.json"
    index_file.write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")

    total_branches = sum(item["branchesCount"] for item in index)
    print(f"[{iso2}] institutions: {len(index)} (merged {merged_rows} duplicate rows)")
    print(f"[{iso2}] branches:     {total_branches}")
    print(f"[{iso2}] snapshots:    {sorted(snapshot_keys)}")
    print(f"[{iso2}] index:        {index_file}")
    for warning in warnings:
        print(f"[{iso2}] WARNING: {warning}", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--countries", default=os.environ.get("SNAPSHOT_COUNTRIES", "AU,CN,GB,IE"),
                        help="comma-separated ISO2 list (default AU,CN,GB,IE)")
    parser.add_argument("--host", default=os.environ.get("MYSQL_HOST", "127.0.0.1"))
    parser.add_argument("--port", default=os.environ.get("MYSQL_PORT", "3307"))
    parser.add_argument("--user", default=os.environ.get("MYSQL_USER", "fincode"))
    parser.add_argument("--password", default=os.environ.get("MYSQL_PASSWORD", "fincode_dev"))
    parser.add_argument("--database", default=os.environ.get("MYSQL_DATABASE", "fincode"))
    parser.add_argument("--web", default="apps/web", help="path to the apps/web checkout")
    args = parser.parse_args()

    countries = [c.strip().upper() for c in args.countries.split(",") if c.strip()]
    unknown = [c for c in countries if c not in COUNTRY_CONFIG]
    if unknown:
        print(f"unsupported country (no COUNTRY_CONFIG entry): {', '.join(unknown)}", file=sys.stderr)
        sys.exit(2)

    branch_dir = Path(args.web) / "public" / "data" / "branches"
    branch_dir.mkdir(parents=True, exist_ok=True)
    generated_dir = Path(args.web) / "src" / "lib" / "data" / "generated"
    generated_dir.mkdir(parents=True, exist_ok=True)

    for iso2 in countries:
        export_country(args, iso2, branch_dir, generated_dir)
    print(f"branch files kept under {branch_dir}")


if __name__ == "__main__":
    main()
