import rawInstitutions from "./generated/au-institutions.json";
import { institutions as staticInstitutions } from "./banks";
import type { Branch, Institution, InstitutionType } from "./types";

/**
 * Merges the pipeline-exported AU BSB dataset (generated/au-institutions.json,
 * produced by scripts/import/export_snapshot.py) with the hand-curated static
 * dataset. Generated rows that clearly describe the same institution as a
 * static record are folded into it (they contribute the branch snapshot);
 * everything else becomes a new directory record. Slugs for appended records
 * are derived from the name and collision-checked, so they stay stable as
 * long as the exported name does.
 *
 * The static records stay first and keep their order; appended records are
 * sorted by branch count (the generated index is pre-sorted).
 */

export interface AuGeneratedInstitution {
  key: string;
  nameEn: string;
  legalName: string | null;
  shortName: string | null;
  institutionType: string;
  branchesCount: number;
  headOffice: { name: string; city: string | null; address: string | null } | null;
}

const generated = rawInstitutions as AuGeneratedInstitution[];

const SUFFIX_TOKENS = new Set([
  "limited",
  "ltd",
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

/** kebab-case slug derived from the English name. */
function toSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
  return slug.length > 0 ? slug : "bank";
}

function matchStatic(
  gen: AuGeneratedInstitution,
  pool: Institution[],
): Institution | undefined {
  const norm = normalizeInstitutionName(gen.nameEn);
  const short = gen.shortName?.trim().toLowerCase();
  // 1) normalized full-name equality
  const byName = pool.find(
    (institution) =>
      institution.country === "AU" &&
      normalizeInstitutionName(institution.nameEn) === norm,
  );
  if (byName) return byName;
  // 2) short-name equality (e.g. ANZ / NAB vs the expanded legal-style name)
  if (short) {
    return pool.find(
      (institution) =>
        institution.country === "AU" &&
        institution.shortName.trim().toLowerCase() === short,
    );
  }
  return undefined;
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
      if (hit.branchSnapshotKey) {
        // Already folded: the export pipeline pre-deduplicates same-institution
        // rows, so a second hit means two generated rows matched one static
        // record - keep the first snapshot and drop the row.
        continue;
      }
      hit.branchSnapshotKey = gen.key;
      hit.branchSnapshotCount = gen.branchesCount;
      mergedCount += 1;
      continue;
    }

    const baseSlug = toSlug(gen.nameEn);
    let slug = baseSlug;
    let suffix = 2;
    while (bySlug.has(slug)) {
      slug = `${baseSlug}-au-${suffix}`;
      suffix += 1;
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
      slug,
      legalName: gen.legalName ?? gen.nameEn,
      nameEn: gen.nameEn,
      shortName: gen.shortName ?? gen.nameEn,
      country: "AU",
      institutionType: (gen.institutionType as InstitutionType) ?? "BANK",
      website: "",
      identifiers: [],
      branches,
      branchSnapshotKey: gen.key,
      branchSnapshotCount: gen.branchesCount,
    };
    appended.push(record);
    bySlug.set(slug, record);
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
