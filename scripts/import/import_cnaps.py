#!/usr/bin/env python3
"""Generate the China CNAPS import SQL for the fincode database.

Reads the CNAPS directory snapshot under data/cnaps/ and emits a single SQL
file (default data/cnaps/import_cnaps.sql) that populates:

  financial_institution  one row per bank / credit-union institution (~3.5k)
  bank_branch            one row per CNAPS branch point (~150k)
  bank_identifier        one row per 12-digit CNAPS code (identifier_type=CNAPS)
  data_source            provenance row for the community CNAPS mirror

Pipeline (mirrors the AU BSB import conventions):
  1. Primary source: samelabs/cnaps cnaps.db (154,570 rows, updated 2026-02,
     People's Bank of China public data) -- 12-digit codes only.
  2. Province enrichment: chaclee/cnaps bank_code.csv provides the GB/T 2260
     province code per CNAPS code plus an area-code -> province mapping for
     codes the join misses.
  3. City inference: branch names of the big-5 banks strip to a geographic
     prefix, which is resolved against the GB administrative-division tables
     (modood/Administrative-divisions-of-China) by majority vote per CNAPS
     area code. City stays NULL when no confident match exists.

Skipped rows (reported at the end): treasury offices (011), clearing-system
special codes (000/012/9xx: CIPS, e-CNY, financial companies, HK/MO agents),
and PBoC alphanumeric bookkeeping codes.

NOT idempotent: re-running against an already imported database duplicates
institutions/branches and fails on the bank_identifier unique key. The
data_source and country inserts themselves are guarded and re-runnable.

Usage:
  python3 import_cnaps.py [--data DIR] [--out FILE]
Defaults: --data data/cnaps  --out data/cnaps/import_cnaps.sql
Then import with (dev stack):
  docker exec -i fincode-mysql mysql -ufincode -pfincode_dev fincode < import_cnaps.sql
"""

from __future__ import annotations

import argparse
import csv
import re
import sqlite3
import sys
from collections import Counter, defaultdict
from pathlib import Path

# --------------------------------------------------------------------------
# Institution anchors: single-institution bank-type codes (CNAPS digits 1-3).
# Anchoring by bank-type code beats name extraction: it absorbs typos,
# abbreviated names ("工行...支行") and full/short legal-name variants.
# (name_local, legal_name, short_name, name_en, institution_type)
# --------------------------------------------------------------------------
ANCHORS: dict[str, tuple[str, str, str, str, str]] = {
    "001": ("中国人民银行", "中国人民银行", "人民银行", "People's Bank of China", "CENTRAL_BANK"),
    "102": ("中国工商银行", "中国工商银行股份有限公司", "工商银行", "Industrial and Commercial Bank of China", "BANK"),
    "103": ("中国农业银行", "中国农业银行股份有限公司", "农业银行", "Agricultural Bank of China", "BANK"),
    "104": ("中国银行", "中国银行股份有限公司", "中国银行", "Bank of China", "BANK"),
    "105": ("中国建设银行", "中国建设银行股份有限公司", "建设银行", "China Construction Bank", "BANK"),
    "201": ("国家开发银行", "国家开发银行", "国开行", "China Development Bank", "BANK"),
    "202": ("中国进出口银行", "中国进出口银行", "进出口银行", "Export-Import Bank of China", "BANK"),
    "203": ("中国农业发展银行", "中国农业发展银行", "农发行", "Agricultural Development Bank of China", "BANK"),
    "301": ("交通银行", "交通银行股份有限公司", "交通银行", "Bank of Communications", "BANK"),
    "302": ("中信银行", "中信银行股份有限公司", "中信银行", "China CITIC Bank", "BANK"),
    "303": ("中国光大银行", "中国光大银行股份有限公司", "光大银行", "China Everbright Bank", "BANK"),
    "304": ("华夏银行", "华夏银行股份有限公司", "华夏银行", "Hua Xia Bank", "BANK"),
    "305": ("中国民生银行", "中国民生银行股份有限公司", "民生银行", "China Minsheng Bank", "BANK"),
    "306": ("广发银行", "广发银行股份有限公司", "广发银行", "China Guangfa Bank", "BANK"),
    "307": ("平安银行", "平安银行股份有限公司", "平安银行", "Ping An Bank", "BANK"),
    "308": ("招商银行", "招商银行股份有限公司", "招商银行", "China Merchants Bank", "BANK"),
    "309": ("兴业银行", "兴业银行股份有限公司", "兴业银行", "Industrial Bank", "BANK"),
    "310": ("上海浦东发展银行", "上海浦东发展银行股份有限公司", "浦发银行", "Shanghai Pudong Development Bank", "BANK"),
    "315": ("恒丰银行", "恒丰银行股份有限公司", "恒丰银行", "Hengfeng Bank", "BANK"),
    "316": ("浙商银行", "浙商银行股份有限公司", "浙商银行", "Zheshang Bank", "BANK"),
    "318": ("渤海银行", "渤海银行股份有限公司", "渤海银行", "China Bohai Bank", "BANK"),
    "319": ("徽商银行", "徽商银行股份有限公司", "徽商银行", "Huishang Bank", "BANK"),
    "321": ("重庆三峡银行", "重庆三峡银行股份有限公司", "三峡银行", "Chongqing Three Gorges Bank", "BANK"),
    "403": ("中国邮政储蓄银行", "中国邮政储蓄银行股份有限公司", "邮储银行", "Postal Savings Bank of China", "SAVINGS_BANK"),
}

# Digital banks (internet-only lenders) labelled by name; everything else
# defaults to BANK / CREDIT_UNION via the rules below.
DIGITAL_BANK_NAMES = {"中信百信银行", "中邮邮惠万家银行有限责任公司"}

# Bank-type codes whose rows are out of scope: state treasury (011), clearing
# hubs (000/012), CIPS & e-CNY channels, group finance companies (907),
# payment reserve accounts (991) and HK/Macau agent codes (969/989).
SKIP_PREFIXES = {
    "000", "011", "012",
    "901", "902", "903", "904", "905", "906", "907", "908", "909",
    "910", "911", "912", "913", "969", "989", "991",
}

# Big-5 banks used as the city-inference signal: dense branch coverage and
# uniform "<institution><city><branch>" naming.
BIG5 = {"102", "103", "104", "105", "301"}

# GB/T 2260 province code -> name (CNAPS data covers mainland China only).
PROVINCES: dict[str, str] = {
    "11": "北京市", "12": "天津市", "13": "河北省", "14": "山西省", "15": "内蒙古自治区",
    "21": "辽宁省", "22": "吉林省", "23": "黑龙江省",
    "31": "上海市", "32": "江苏省", "33": "浙江省", "34": "安徽省", "35": "福建省",
    "36": "江西省", "37": "山东省",
    "41": "河南省", "42": "湖北省", "43": "湖南省", "44": "广东省", "45": "广西壮族自治区",
    "46": "海南省", "50": "重庆市", "51": "四川省", "52": "贵州省", "53": "云南省",
    "54": "西藏自治区", "61": "陕西省", "62": "甘肃省", "63": "青海省",
    "64": "宁夏回族自治区", "65": "新疆维吾尔自治区",
}

CORP_SUFFIXES = ("股份有限公司", "有限责任公司", "有限公司")
CREDIT_UNION_PAT = re.compile(
    r"^(.{1,16}?(?:农村)?(?:城市)?信用(?:合作)?(?:联合|联)?社(?:股份有限公司|有限责任公司)?)"
)


def fix_typos(name: str) -> str:
    """Normalise recurring source-data typos before extraction."""
    return name.replace("银银行", "银行").replace("储蓄很行", "储蓄银行")


def extract_institution(branch_name: str) -> str | None:
    """Derive the institution legal name from a Chinese branch name.

    Chinese branch names are "<institution>[（区域）][公司后缀]<branch>"; the
    institution part always ends with 银行 or 信用..社. The last 银行 wins,
    except when it belongs to 银行卡 ("bank card") inside a department name.
    """
    name = fix_typos(branch_name)
    m = CREDIT_UNION_PAT.match(name)
    if m:
        return m.group(1)
    # Abbreviated rural-commercial names ("XX农商行XX支行") carry no 银行.
    i = name.rfind("农商行")
    if i >= 0:
        return name[:i + 3]
    i = name.rfind("银行")
    while i >= 0 and name[i:i + 3] == "银行卡":
        i = name.rfind("银行", 0, i)
    if i < 0:
        return None
    end = i + 2
    rest = name[end:]
    # Foreign subsidiaries: 汇丰银行（中国）有限公司 / 东亚银行（中国）...
    m2 = re.match(r"^(（[^）]{1,8}）)?(股份有限公司|有限责任公司|有限公司)", rest)
    if m2:
        end += len(m2.group(0))
    return name[:end]


def strip_corp_suffix(name: str) -> str:
    for suffix in CORP_SUFFIXES:
        if name.endswith(suffix) and len(name) > len(suffix) + 2:
            return name[: -len(suffix)]
    return name


def institution_key(name_local: str) -> str:
    """Merge key folding the 农商银行/农村商业银行 spelling variants."""
    return name_local.replace("农商银行", "农村商业银行")


def load_primary(data_dir: Path) -> list[tuple[str, str]]:
    """(cnaps_code, bank_name) rows with valid 12-digit codes."""
    conn = sqlite3.connect(data_dir / "cnaps.db")
    try:
        rows = conn.execute(
            "SELECT cnaps_code, bank_name FROM cnaps "
            "WHERE cnaps_code GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]' "
            "AND bank_name IS NOT NULL AND TRIM(bank_name) <> ''"
        ).fetchall()
    finally:
        conn.close()
    return rows


def load_province_join(data_dir: Path) -> tuple[dict[str, str], dict[str, str]]:
    """code -> province-code join table plus area-code -> province-code votes."""
    code_prov: dict[str, str] = {}
    area_votes: dict[str, Counter] = defaultdict(Counter)
    with open(data_dir / "bank_code.csv", encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            code, prov = row.get("branch_code", ""), row.get("province", "")
            if not (code.isdigit() and len(code) == 12 and prov in PROVINCES):
                continue
            code_prov[code] = prov
            area_votes[code[3:7]][prov] += 1
    area_prov = {area: counts.most_common(1)[0][0] for area, counts in area_votes.items()}
    return code_prov, area_prov


def load_geo_index(data_dir: Path) -> dict[str, set[str]]:
    """Geographic name index: surface prefix -> canonical division names.

    Includes prefecture cities and county divisions; "北京市"-style
    municipality names double as city names. Province names ending in 省
    are excluded from the index so "河北省分行..." rows never vote.
    """
    index: dict[str, set[str]] = defaultdict(set)

    def add(name: str) -> None:
        if not name or name in {"市辖区", "县", "直辖区", "自治区直辖县级行政区划"}:
            return
        if name.endswith("省"):
            return
        index[name].add(name)
        if name.endswith("市") and len(name) >= 3:
            index[name[:-1]].add(name)  # 石家庄市 -> 石家庄

    for filename in ("china_cities.csv", "china_areas.csv"):
        with open(data_dir / filename, encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                add((row.get("name") or "").strip())
    for prov in ("北京市", "天津市", "上海市", "重庆市"):
        index[prov].add(prov)
        index[prov[:-1]].add(prov)
    return index


def match_geo_prefix(text: str, index: dict[str, set[str]]) -> set[str] | None:
    """Longest geographic prefix of `text` present in the index."""
    for length in range(min(len(text), 10), 1, -1):
        hit = index.get(text[:length])
        if hit:
            return hit
    return None


def sql_str(value: str | None) -> str:
    if value is None:
        return "NULL"
    escaped = value.replace("\\", "\\\\").replace("'", "\\'")
    return f"'{escaped}'"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", default="data/cnaps", help="directory holding cnaps.db and helper CSVs")
    parser.add_argument("--out", default="data/cnaps/import_cnaps.sql", help="output SQL file")
    args = parser.parse_args()

    data_dir = Path(args.data)
    out_path = Path(args.out)

    print("Loading sources ...")
    primary = load_primary(data_dir)
    code_prov, area_prov = load_province_join(data_dir)
    geo_index = load_geo_index(data_dir)
    print(f"  primary rows: {len(primary)}, province join: {len(code_prov)}, "
          f"area->province map: {len(area_prov)}, geo names: {len(geo_index)}")

    # ------------------------------------------------------------------
    # Row classification: keep / skip
    # ------------------------------------------------------------------
    skipped: Counter = Counter()
    kept: list[tuple[str, str]] = []
    for code, name in primary:
        prefix = code[:3]
        if prefix in SKIP_PREFIXES:
            skipped[f"bank-type {prefix} (out of scope)"] += 1
            continue
        if prefix == "001" and "银行" not in name:
            skipped["PBoC alphanumeric bookkeeping codes"] += 1
            continue
        kept.append((code, name))
    print(f"  kept {len(kept)} rows, skipped {sum(skipped.values())}")

    # ------------------------------------------------------------------
    # Institution resolution per row
    # ------------------------------------------------------------------
    no_extract: list[str] = []
    rows: list[dict] = []
    for code, name in kept:
        prefix = code[:3]
        if prefix in ANCHORS:
            name_local, legal, short, name_en, inst_type = ANCHORS[prefix]
        else:
            inst = extract_institution(name)
            if inst is None:
                no_extract.append(name)
                skipped["unresolvable institution name"] += 1
                continue
            name_local = strip_corp_suffix(inst)
            legal = inst if inst != name_local else inst
            short = None
            name_en = None
            if inst in DIGITAL_BANK_NAMES or name_local in {"中信百信银行", "中邮邮惠万家银行"}:
                inst_type = "DIGITAL_BANK"
            elif "信用" in inst:
                inst_type = "CREDIT_UNION"
            else:
                inst_type = "BANK"
        rows.append({
            "code": code,
            "branch_name": name,
            "inst_name": name_local,
            "inst_legal": legal,
            "inst_short": short,
            "inst_en": name_en,
            "inst_type": inst_type,
        })

    # Fold 农商银行/农村商业银行 spelling variants onto one institution:
    # the dominant surface form becomes name_local, the longest one legal_name.
    variant_rows: dict[str, Counter] = defaultdict(Counter)
    for row in rows:
        variant_rows[institution_key(row["inst_name"])][row["inst_name"]] += 1
    canonical: dict[str, str] = {}
    for key, forms in variant_rows.items():
        if len(forms) > 1:
            canonical[key] = forms.most_common(1)[0][0]
    if canonical:
        for row in rows:
            key = institution_key(row["inst_name"])
            if key in canonical and row["inst_name"] != canonical[key]:
                row["inst_name"] = canonical[key]
        merged = len(canonical)
        print(f"  merged {merged} 农商银行/农村商业银行 spelling variants")

    if no_extract:
        print(f"  WARNING: {len(no_extract)} rows without a resolvable institution, "
              f"e.g. {no_extract[:3]}")

    # ------------------------------------------------------------------
    # Province: direct join -> area-code map -> name-based fallback
    # ------------------------------------------------------------------
    prov_names = list(PROVINCES.values())
    unresolved_prov = 0
    for row in rows:
        prov_code = code_prov.get(row["code"]) or area_prov.get(row["code"][3:7])
        if prov_code:
            row["province"] = PROVINCES[prov_code]
        else:
            hit = next((p for p in prov_names if row["branch_name"].startswith(p)), None)
            if hit is None:
                hit = next((p for p in prov_names if p in row["branch_name"][:8]), None)
            row["province"] = hit
            if hit is None:
                unresolved_prov += 1
    print(f"  province resolved: {len(rows) - unresolved_prov}/{len(rows)} rows")

    # ------------------------------------------------------------------
    # City inference: big-5 branch prefixes vote per CNAPS area code
    # ------------------------------------------------------------------
    area_rests: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        if row["code"][:3] in BIG5:
            head = row["inst_legal"] if row["branch_name"].startswith(row["inst_legal"]) else row["inst_name"]
            rest = row["branch_name"][len(head):]
            if rest:
                area_rests[row["code"][3:7]].append(rest)

    def vote_city(area: str, rests: list[str]) -> str | None:
        votes: Counter = Counter()
        for rest in rests:
            hits = match_geo_prefix(rest, geo_index)
            if hits and len(hits) == 1:  # ambiguous names abstain
                votes[next(iter(hits))] += 1
        if not votes:
            return None
        city, count = votes.most_common(1)[0]
        return city if count >= 2 or len(votes) == 1 else city

    area_city: dict[str, str] = {}
    for area, rests in area_rests.items():
        city = vote_city(area, rests)
        if city:
            area_city[area] = city

    # Areas without big-5 coverage: vote on every branch name's prefix.
    all_areas = {row["code"][3:7] for row in rows}
    for area in sorted(all_areas - set(area_city)):
        names = [row["branch_name"] for row in rows if row["code"][3:7] == area]
        city = vote_city(area, names)
        if city:
            area_city[area] = city

    for row in rows:
        row["city"] = area_city.get(row["code"][3:7])
    with_city = sum(1 for row in rows if row["city"])
    print(f"  city inferred: {with_city}/{len(rows)} rows "
          f"({len(area_city)}/{len(all_areas)} area codes)")

    # ------------------------------------------------------------------
    # (institution, branch_name) groups: unify city/province by majority so
    # the branch join keys stay unique for duplicate-code branch points.
    # ------------------------------------------------------------------
    group_votes: dict[tuple[str, str], Counter] = defaultdict(Counter)
    group_prov: dict[tuple[str, str], Counter] = defaultdict(Counter)
    for row in rows:
        key = (row["inst_name"], row["branch_name"])
        if row["city"]:
            group_votes[key][row["city"]] += 1
        if row["province"]:
            group_prov[key][row["province"]] += 1
    for row in rows:
        key = (row["inst_name"], row["branch_name"])
        if key in group_votes:
            row["city"] = group_votes[key].most_common(1)[0][0]
        if key in group_prov:
            row["province"] = group_prov[key].most_common(1)[0][0]

    # ------------------------------------------------------------------
    # Institution table assembly
    # ------------------------------------------------------------------
    institutions: dict[str, dict] = {}
    for row in rows:
        inst = institutions.get(row["inst_name"])
        if inst is None:
            institutions[row["inst_name"]] = {
                "legal": row["inst_legal"],
                "short": row["inst_short"],
                "en": row["inst_en"],
                "type": row["inst_type"],
            }
        else:
            # Prefer the longest legal name seen and any enriched metadata.
            if len(row["inst_legal"]) > len(inst["legal"]):
                inst["legal"] = row["inst_legal"]
            inst["short"] = inst["short"] or row["inst_short"]
            inst["en"] = inst["en"] or row["inst_en"]
    # Non-anchor institutions (rural / commercial / village banks) carry no
    # short name in the source. short_name feeds the site breadcrumb and its
    # BreadcrumbList JSON-LD label, and a blank label invalidates the whole
    # breadcrumb, so fall back to the local name here (same rule as Flyway V18).
    # name_en stays empty on purpose: it is an enrichment result.
    for name, inst in institutions.items():
        inst["short"] = (inst["short"] or name)[:64]
    print(f"  institutions: {len(institutions)}")

    # ------------------------------------------------------------------
    # SQL emission
    # ------------------------------------------------------------------
    def esc(v):  # local alias keeps the batches compact
        return sql_str(v)

    parts: list[str] = []
    parts.append(
        "-- import_cnaps.sql (generated by scripts/import/import_cnaps.py)\n"
        "-- China bank & branch directory from the public CNAPS register\n"
        "-- (samelabs/cnaps snapshot 2026-02-05, PBoC public data).\n"
        f"-- Rows: {len(rows)} branch points, {len(institutions)} institutions.\n"
        "-- NOT idempotent for institutions/branches/identifiers.\n"
        "SET NAMES utf8mb4;\n"
    )

    parts.append(
        "-- Provenance: community mirror of the public CNAPS register.\n"
        "START TRANSACTION;\n"
        "INSERT INTO data_source (name, source_type, provider, source_url, license,\n"
        "                        commercial_use, redistribution_allowed, storage_allowed, status)\n"
        "SELECT 'CNAPS 联行号目录（人行公开数据社区镜像）', 'PUBLIC', 'samelabs/cnaps',\n"
        "       'https://github.com/samelabs/cnaps', '人行公开公示数据', TRUE, TRUE, TRUE, 'ACTIVE'\n"
        "WHERE NOT EXISTS (SELECT 1 FROM data_source WHERE name = 'CNAPS 联行号目录（人行公开数据社区镜像）');\n"
        "COMMIT;\n"
        "SET @src_id := (SELECT id FROM data_source WHERE name = 'CNAPS 联行号目录（人行公开数据社区镜像）' LIMIT 1);\n"
    )

    parts.append(
        "-- Country row mirrors the V14 seed values (idempotent).\n"
        "START TRANSACTION;\n"
        "INSERT INTO country (iso2, iso3, numeric_code, name_en, name_local, currency_code,\n"
        "                     iban_supported, swift_supported, local_identifier_type, status)\n"
        "SELECT 'CN', 'CHN', '156', 'China', '中国', 'CNY', FALSE, TRUE, 'CNAPS', 'ACTIVE'\n"
        "WHERE NOT EXISTS (SELECT 1 FROM country WHERE iso2 = 'CN');\n"
        "COMMIT;\n"
        "SET @cn_id := (SELECT id FROM country WHERE iso2 = 'CN' LIMIT 1);\n"
    )

    # A previously failed run can leave the throwaway join index behind
    # (DDL never rolls back); clear it defensively so reruns don't abort on
    # "Duplicate key name". MySQL has no DROP INDEX IF EXISTS, hence PREPARE.
    parts.append(
        "-- Drop a leftover throwaway join index from an aborted run.\n"
        "SET @drop_idx := IF(EXISTS(SELECT 1 FROM information_schema.statistics\n"
        "         WHERE table_schema = DATABASE() AND table_name = 'bank_branch'\n"
        "           AND index_name = 'idx_cnaps_import_join'),\n"
        "  'ALTER TABLE bank_branch DROP INDEX idx_cnaps_import_join', 'SELECT 1');\n"
        "PREPARE stmt FROM @drop_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;\n"
    )

    parts.append(
        "-- Staging table: one row per CNAPS branch point. Institution\n"
        "-- metadata lives in the generated INSERT below, not here: folding it\n"
        "-- into DISTINCT staging rows once produced duplicate same-name\n"
        "-- institutions (short vs. incorporated legal names) and multiplied\n"
        "-- every downstream join.\n"
        "CREATE TEMPORARY TABLE tmp_cn_branch (\n"
        "    cnaps_code   VARCHAR(12)  NOT NULL PRIMARY KEY,\n"
        "    inst_name    VARCHAR(200) NOT NULL,\n"
        "    branch_name  VARCHAR(200) NOT NULL,\n"
        "    city         VARCHAR(100) NULL,\n"
        "    province     VARCHAR(100) NULL,\n"
        "    KEY idx_tmp_cn_inst (inst_name)\n"
        ") ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;\n"
    )

    batch: list[str] = []
    for row in rows:
        batch.append(
            f"({esc(row['code'])},{esc(row['inst_name'])},"
            f"{esc(row['branch_name'])},{esc(row['city'])},{esc(row['province'])})"
        )
        if len(batch) >= 1000:
            parts.append("INSERT INTO tmp_cn_branch VALUES\n  " + ",\n  ".join(batch) + ";\n")
            batch = []
    if batch:
        parts.append("INSERT INTO tmp_cn_branch VALUES\n  " + ",\n  ".join(batch) + ";\n")

    # Institutions are emitted directly from the Python-side assembly: one
    # row per unique name_local with the longest legal name observed.
    inst_batch: list[str] = []
    for name, inst in institutions.items():
        inst_batch.append(
            f"({esc(inst['legal'])},{esc(name)},{esc(inst['short'])},{esc(inst['en'])},"
            f"@cn_id,{esc(inst['type'])},'ACTIVE')"
        )
    parts.append("START TRANSACTION;\n")
    for i in range(0, len(inst_batch), 500):
        parts.append(
            "INSERT INTO financial_institution (legal_name, name_local, short_name, name_en,\n"
            "                                   country_id, institution_type, status) VALUES\n  "
            + ",\n  ".join(inst_batch[i:i + 500]) + ";\n"
        )

    # The identifier back-fill joins bank_branch on
    # (institution_id, branch_name, city, province); the base schema only
    # indexes institution_id, which degrades to O(N*M) scans for the big
    # banks (ICBC alone contributes ~14k branches). A throwaway composite
    # index is created after the branch insert and dropped at the end.
    parts.append(
        "\n"
        "-- Branch points (duplicate branch names of one institution collapse to one row).\n"
        "INSERT INTO bank_branch (institution_id, branch_name, city, province, status)\n"
        "SELECT DISTINCT fi.id, t.branch_name, t.city, t.province, 'ACTIVE'\n"
        "FROM tmp_cn_branch t\n"
        "JOIN financial_institution fi ON fi.name_local = t.inst_name AND fi.country_id = @cn_id;\n"
        "COMMIT;\n"
        "\n"
        "-- Throwaway join index for the identifier back-fill (DDL commits implicitly).\n"
        "ALTER TABLE bank_branch ADD INDEX idx_cnaps_import_join\n"
        "    (institution_id, branch_name, city, province);\n"
        "\n"
        "START TRANSACTION;\n"
        "-- CNAPS identifiers, one per staged code, linked back to the branch.\n"
        "INSERT INTO bank_identifier (institution_id, branch_id, identifier_type, identifier_value,\n"
        "                             country_code, status, source_id)\n"
        "SELECT fi.id, bb.id, 'CNAPS', t.cnaps_code, 'CN', 'ACTIVE', @src_id\n"
        "FROM tmp_cn_branch t\n"
        "JOIN financial_institution fi ON fi.name_local = t.inst_name AND fi.country_id = @cn_id\n"
        "JOIN bank_branch bb ON bb.institution_id = fi.id AND bb.branch_name = t.branch_name\n"
        "     AND bb.city <=> t.city AND bb.province <=> t.province;\n"
        "COMMIT;\n"
        "\n"
        "ALTER TABLE bank_branch DROP INDEX idx_cnaps_import_join;\n"
        "DROP TEMPORARY TABLE tmp_cn_branch;\n"
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write("".join(parts))
    size_mb = out_path.stat().st_size / 1024 / 1024

    # ------------------------------------------------------------------
    # Report
    # ------------------------------------------------------------------
    print("\n===== Import summary =====")
    print(f"output: {out_path} ({size_mb:.1f} MB)")
    print(f"branch points: {len(rows)}")
    print(f"institutions : {len(institutions)}")
    print(f"city filled  : {with_city}/{len(rows)}")
    print(f"province     : {len(rows) - unresolved_prov}/{len(rows)}")
    if skipped:
        print("skipped rows:")
        for reason, count in skipped.most_common():
            print(f"  {reason}: {count}")
    type_counts = Counter(inst["type"] for inst in institutions.values())
    print("institution types:", dict(type_counts))

    # Sample codes for post-import verification.
    print("\nverification samples:")
    seen_types = set()
    for row in rows:
        t = row["inst_type"]
        if t not in seen_types:
            seen_types.add(t)
            print(f"  [{t}] {row['code']} {row['inst_name']} / {row['branch_name']}"
                  f" @ {row['province'] or '?'}/{row['city'] or '?'}")


if __name__ == "__main__":
    main()
