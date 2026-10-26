import auIndex from "./generated/au-institutions.json";
import cnIndex from "./generated/cn-institutions.json";
import gbIndex from "./generated/gb-institutions.json";
import ieIndex from "./generated/ie-institutions.json";
import { institutions as staticInstitutions } from "./banks";
import type { Branch, Institution, InstitutionType } from "./types";

/**
 * Merges the pipeline-exported directory indexes (one JSON per country,
 * produced by scripts/import/export_snapshot.py from the database) with the
 * hand-curated static dataset.
 *
 * Slugs arrive from the database (V17 backfill) and are the single source of
 * truth for the site URL contract; the build no longer assigns or
 * collision-checks slugs. Static records folded onto a directory row keep
 * their hand-authored slug (icbc, anz, ...) so already-published URLs never
 * move.
 *
 * Records fall into three tiers:
 *   - static-only (no directory row): the L1 pages, rendered purely from
 *     this module's data;
 *   - snapshot-backed (directory row with snapshotKey, per-country top 3 by
 *     branch count): L2 pages with build-time branch snapshots;
 *   - live (directory row without snapshotKey): L3 pages - the detail page
 *     hydrates branch count / identifiers / branch pages from the backend at
 *     request time.
 *
 * The static records stay first and keep their order; appended records are
 * sorted by branch count (each generated index is pre-sorted).
 */

export interface DirectoryIndexRow {
  key: string;
  slug: string;
  nameEn: string;
  nameLocal: string | null;
  legalName: string | null;
  shortName: string | null;
  institutionType: string;
  branchesCount: number;
  snapshotKey: string | null;
  headOffice: { name: string; city: string | null; address: string | null } | null;
}

const generated = [
  ...(gbIndex as DirectoryIndexRow[]),
  ...(ieIndex as DirectoryIndexRow[]),
  ...(auIndex as DirectoryIndexRow[]),
  ...(cnIndex as DirectoryIndexRow[]),
];

const SUFFIX_TOKENS = new Set([
  "limited",
  "ltd",
  "plc",
  "bank",
  "banking",
  "corporation",
  "corp",
  "group",
  "holdings",
  "the",
  "and",
  "of",
  "australia",
]);

/** Lowercase, strip accents/punctuation and common corporate suffix tokens. */
export function normalizeInstitutionName(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const tokens = base
    .split(" ")
    .filter((token) => token.length > 0 && !SUFFIX_TOKENS.has(token));
  return tokens.join(" ") || base;
}

function matchStatic(
  gen: DirectoryIndexRow,
  pool: Institution[],
): Institution | undefined {
  const norm = normalizeInstitutionName(gen.nameEn);
  const short = gen.shortName?.trim().toLowerCase();
  // 1) normalized full-name equality (covers the CN anchors, whose exported
  //    nameEn matches the static dataset exactly)
  const byName = pool.find(
    (institution) =>
      institution.country === genCountryOf(gen) &&
      normalizeInstitutionName(institution.nameEn) === norm,
  );
  if (byName) return byName;
  // 2) short-name equality (e.g. ANZ / NAB vs the expanded legal-style name)
  if (short) {
    return pool.find(
      (institution) =>
        institution.country === genCountryOf(gen) &&
        institution.shortName.trim().toLowerCase() === short,
    );
  }
  return undefined;
}

/** Country ISO2 derived from the export key prefix ("au-4" -> "AU"). */
function genCountryOf(gen: DirectoryIndexRow): string {
  return gen.key.slice(0, 2).toUpperCase();
}

export interface DirectoryDataset {
  institutions: Institution[];
  institutionBySlug: Record<string, Institution>;
  /** Generated rows folded into existing static records. */
  mergedCount: number;
  /** Generated rows appended as new directory records. */
  appendedCount: number;
}

function buildDirectory(): DirectoryDataset {
  const merged: Institution[] = staticInstitutions.map((institution) => ({
    ...institution,
  }));
  const bySlug = new Map(merged.map((institution) => [institution.slug, institution]));
  const appended: Institution[] = [];
  let mergedCount = 0;

  for (const gen of generated) {
    // Match against `merged` (the copies we own): folding must mutate the
    // copies the directory exports, not the static module records.
    const hit = matchStatic(gen, merged);
    if (hit) {
      hit.liveKey = gen.key;
      hit.liveBranchCount = gen.branchesCount;
      if (gen.snapshotKey) {
        hit.branchSnapshotKey = gen.snapshotKey;
        hit.branchSnapshotCount = gen.branchesCount;
      }
      mergedCount += 1;
      continue;
    }

    const branches: Branch[] = gen.headOffice
      ? [
          {
            slug: "head-office",
            name: gen.headOffice.name || "Head Office",
            city: gen.headOffice.city ?? "",
            address: gen.headOffice.address ?? undefined,
          },
        ]
      : [];

    const record: Institution = {
      slug: gen.slug,
      legalName: gen.legalName ?? (gen.nameEn || gen.nameLocal || gen.slug),
      nameEn: gen.nameEn || gen.nameLocal || gen.slug,
      nameLocal: gen.nameLocal ?? undefined,
      shortName: gen.shortName ?? gen.nameEn ?? gen.slug,
      country: genCountryOf(gen),
      institutionType: (gen.institutionType as InstitutionType) ?? "BANK",
      website: "",
      identifiers: [],
      branches,
      liveKey: gen.key,
      liveBranchCount: gen.branchesCount,
    };
    if (gen.snapshotKey) {
      record.branchSnapshotKey = gen.snapshotKey;
      record.branchSnapshotCount = gen.branchesCount;
    }
    appended.push(record);
    bySlug.set(gen.slug, record);
  }

  const institutions = [...merged, ...appended];
  return {
    institutions,
    institutionBySlug: Object.fromEntries(
      institutions.map((institution) => [institution.slug, institution]),
    ),
    mergedCount,
    appendedCount: appended.length,
  };
}

export const directory: DirectoryDataset = buildDirectory();

/**
 * Resolve the directory record behind a live identifier response. The API
 * returns name_en + country only (no slug), and the export folds name
 * variants onto one row (e.g. "ULSTER BANK" / "ULSTER BANK LTD"), so the
 * lookup compares normalised names instead of raw strings.
 */
export function institutionForLiveBank(
  nameEn: string,
  country: string,
): Institution | undefined {
  const norm = normalizeInstitutionName(nameEn);
  return directory.institutions.find(
    (institution) =>
      institution.country === country &&
      normalizeInstitutionName(institution.nameEn) === norm,
  );
}
