import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * One row of /public/data/branches/{key}.json (written by the export pipeline).
 */
export interface SnapshotBranch {
  name: string;
  nameLocal: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  postalCode: string | null;
  code: string | null;
}

/** Rows server-rendered into the page before the client takes over. */
export const SSR_BRANCH_ROWS = 20;

const SNAPSHOT_DIR = path.join(process.cwd(), "public", "data", "branches");

/** Parsed snapshots, keyed by snapshot key (a page render is not cheap to redo). */
const cache = new Map<string, SnapshotBranch[]>();

/**
 * Read a branch snapshot from disk. Server-only: the detail page renders the
 * first rows so the HTML carries real branch content instead of the client
 * explorer's empty initial state. Failures degrade to an empty list, which
 * falls back to the directory rows the caller already has.
 */
export async function readBranchSnapshot(key: string): Promise<SnapshotBranch[]> {
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    const raw = await readFile(path.join(SNAPSHOT_DIR, `${key}.json`), "utf8");
    const parsed = JSON.parse(raw) as { branches?: SnapshotBranch[] };
    const branches = parsed.branches ?? [];
    cache.set(key, branches);
    return branches;
  } catch {
    return [];
  }
}
