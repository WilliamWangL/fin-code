#!/usr/bin/env python3
"""Export the AU BSB snapshot from the fincode database for the website.

Produces two artefacts consumed by apps/web:
  1. <web>/src/lib/data/generated/au-institutions.json
     Institution index rows (keyed "au-<db id>", no slug: slugs are assigned at
     build time by lib/data/au-directory.ts so they stay stable and collide-checked
     against the hand-curated static dataset).
  2. <web>/public/data/branches/au-<db id>.json
     Full branch list per institution (lazy-loaded by the branch explorer).

Read-only against the database. Re-runnable: output is deterministic for the
same DB state, and files are overwritten in place.

Rows describing the same institution (the BSB import creates one row per
source abbreviation, e.g. "Commonwealth Bank ..." and "CST") are merged into
a single export row before writing, mirroring the match rules of
apps/web/src/lib/data/au-directory.ts.

Usage:
  python3 export_snapshot.py [--host H] [--port P] [--user U] [--password PW]
                             [--database DB] [--web ROOT]
Defaults target the dev stack (127.0.0.1:3307 fincode/fincode_dev).
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

INSTITUTION_SQL = """
SELECT fi.id,
       fi.name_en,
       fi.legal_name,
       fi.short_name,
       fi.institution_type
FROM financial_institution fi
JOIN country c ON c.id = fi.country_id
WHERE c.iso2 = 'AU' AND fi.status = 'ACTIVE'
ORDER BY fi.id
"""

BRANCH_SQL = """
SELECT bb.institution_id,
       bb.branch_name,
       bb.branch_name_en,
       bb.city,
       bb.state,
       bb.address,
       bb.postal_code,
       bi.identifier_value
FROM bank_branch bb
JOIN financial_institution fi ON fi.id = bb.institution_id
JOIN country c ON c.id = fi.country_id
LEFT JOIN bank_identifier bi ON bi.branch_id = bb.id AND bi.identifier_type = 'BSB'
WHERE c.iso2 = 'AU'
ORDER BY bb.institution_id, bb.id
"""

# Strip characters that would break the mysql --batch TSV contract.
# mysql --batch renders SQL NULL as the literal string "NULL".
def clean(value: str | None) -> str:
    if value is None or value == "NULL":
        return ""
    return value.replace("\\t", " ").replace("\\n", " ").strip()


# Mirrors lib/data/au-directory.ts normalizeInstitutionName(): lowercase,
# strip accents/punctuation and common corporate suffix tokens. The web merge
# layer assumes exported rows are pre-deduplicated under the same rules, so
# the two implementations must stay in sync.
SUFFIX_TOKENS = {
    "limited", "ltd", "bank", "banking", "corporation", "corp",
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


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default=os.environ.get("MYSQL_HOST", "127.0.0.1"))
    parser.add_argument("--port", default=os.environ.get("MYSQL_PORT", "3307"))
    parser.add_argument("--user", default=os.environ.get("MYSQL_USER", "fincode"))
    parser.add_argument("--password", default=os.environ.get("MYSQL_PASSWORD", "fincode_dev"))
    parser.add_argument("--database", default=os.environ.get("MYSQL_DATABASE", "fincode"))
    parser.add_argument("--web", default="apps/web", help="path to the apps/web checkout")
    args = parser.parse_args()

    institutions: dict[str, dict] = {}
    for row in run_sql(args, INSTITUTION_SQL):
        key = f"au-{row[0]}"
        institutions[key] = {
            "key": key,
            "nameEn": clean(row[1]),
            "legalName": clean(row[2]) or None,
            "shortName": clean(row[3]) or None,
            "institutionType": clean(row[4]) or "BANK",
            "branchesCount": 0,
            "headOffice": None,
        }

    branch_dir = Path(args.web) / "public" / "data" / "branches"
    branch_dir.mkdir(parents=True, exist_ok=True)

    branches_by_key: dict[str, list[dict]] = {}
    for row in run_sql(args, BRANCH_SQL):
        key = f"au-{row[0]}"
        name = clean(row[1])
        name_en = clean(row[2])
        city = clean(row[3])
        state = clean(row[4])
        address = clean(row[5])
        postal = clean(row[6])
        bsb = clean(row[7])
        branches_by_key.setdefault(key, []).append(
            {
                "name": name_en or name,
                "nameLocal": name if name_en and name != name_en else None,
                "city": city or None,
                "state": state or None,
                "address": address or None,
                "postalCode": postal or None,
                "code": bsb or None,
            }
        )

    generated_dir = Path(args.web) / "src" / "lib" / "data" / "generated"
    generated_dir.mkdir(parents=True, exist_ok=True)

    # ── Merge same-institution rows ──────────────────────────────────────────
    # The BSB import creates one row per source abbreviation, so several rows
    # can describe the same institution. Group with the same two-level match
    # as au-directory.ts matchStatic() (normalized full name, then short
    # name) and keep one row per group: the member with the most branches
    # provides the display fields, branches are unioned by BSB code.
    for inst in institutions.values():
        inst["branchesCount"] = len(branches_by_key.get(inst["key"], []))

    groups: list[dict] = []
    by_norm: dict[str, dict] = {}
    by_short: dict[str, dict] = {}
    for inst in institutions.values():
        norm = normalize_name(inst["nameEn"])
        short = (inst["shortName"] or "").strip().lower()
        group = by_norm.get(norm) or by_short.get(short)
        if group is None:
            group = {"rows": [inst["key"]]}
            groups.append(group)
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
                # Drop stale per-row branch files from previous runs.
                (branch_dir / f"{key}.json").unlink(missing_ok=True)

    index = []
    for key, inst in institutions.items():
        rows = branches_by_key.get(key, [])
        inst["branchesCount"] = len(rows)
        if rows:
            head = rows[0]
            inst["headOffice"] = {
                "name": head["name"],
                "city": head["city"],
                "address": head["address"],
            }
        index.append(inst)
        branch_file = branch_dir / f"{key}.json"
        branch_file.write_text(
            json.dumps({"institution": key, "count": len(rows), "branches": rows}, ensure_ascii=False),
            encoding="utf-8",
        )

    index.sort(key=lambda item: (-item["branchesCount"], item["nameEn"]))
    index_file = generated_dir / "au-institutions.json"
    index_file.write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")

    total_branches = sum(item["branchesCount"] for item in index)
    print(f"institutions: {len(index)} (merged {merged_rows} duplicate rows)")
    print(f"branches:     {total_branches}")
    print(f"index:        {index_file}")
    print(f"branch files: {len(branches_by_key)} under {branch_dir}")


if __name__ == "__main__":
    main()
