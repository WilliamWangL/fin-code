"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { normalizeQuery } from "@/lib/banks-search";

/** One row of /public/data/branches/{key}.json (written by the export pipeline). */
export interface SnapshotBranch {
  name: string;
  nameLocal: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  postalCode: string | null;
  code: string | null;
}

/** One row of the /api/directory BFF branch page (API SNAKE_CASE fields). */
interface ApiBranchRow {
  branch_name: string;
  branch_name_en: string | null;
  city: string | null;
  state: string | null;
  province: string | null;
  address: string | null;
  postal_code: string | null;
  code: string | null;
}

function toSnapshotBranch(row: ApiBranchRow): SnapshotBranch {
  return {
    name: row.branch_name,
    nameLocal: row.branch_name_en,
    city: row.city,
    state: row.state ?? row.province,
    address: row.address,
    postalCode: row.postal_code,
    code: row.code,
  };
}

const PAGE_SIZE = 50;
const API_DEBOUNCE_MS = 300;

/**
 * Branch lookup over the exported snapshot. The head office row is rendered
 * on the server; the full list (up to thousands of rows) is fetched lazily
 * from the static JSON asset so detail pages stay buildable and small.
 */
export function BranchExplorer({
  snapshotKey,
  apiSlug,
  initialBranches,
  initialCursor,
}: {
  /**
   * L2 (snapshot) mode: key of the lazily-loaded /data/branches/{key}.json
   * asset produced at build time.
   */
  snapshotKey?: string;
  /**
   * L3 (live) mode: institution slug queried through the website's directory
   * BFF at request time, with server-side search/city filtering and cursor
   * pagination.
   */
  apiSlug?: string;
  initialBranches: SnapshotBranch[];
  /** L3: cursor for the next live branch page. */
  initialCursor?: string | null;
}) {
  const t = useTranslations("banks");
  const common = useTranslations("common");
  const [snapshotBranches, setSnapshotBranches] = useState<SnapshotBranch[] | null>(null);
  const [liveBranches, setLiveBranches] = useState<SnapshotBranch[]>(initialBranches);
  const [cursor, setCursor] = useState<string | null>(initialCursor ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  // Server-rendered rows; kept in a ref so the fetch effect only depends on
  // the snapshot key (the prop is a fresh array on every render).
  const initialRef = useRef(initialBranches);

  // ── L2 snapshot mode: one lazy fetch of the full static asset.
  useEffect(() => {
    if (!snapshotKey) return;
    let cancelled = false;
    fetch(`/data/branches/${snapshotKey}.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data: { branches?: SnapshotBranch[] }) => {
        if (!cancelled) setSnapshotBranches(data.branches ?? []);
      })
      .catch(() => {
        // Keep the server-rendered head office row on failure.
        if (!cancelled) setSnapshotBranches(initialRef.current);
      });
    return () => {
      cancelled = true;
    };
  }, [snapshotKey]);

  // ── L3 live mode: every search/city change refetches page one through the
  // BFF (the API filters by name/city server-side).
  useEffect(() => {
    if (!apiSlug) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(false);
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      const trimmed = query.trim();
      if (trimmed) params.set("q", trimmed);
      if (city) params.set("city", city);
      fetch(`/api/directory/banks/${encodeURIComponent(apiSlug)}/branches?${params}`)
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((payload: { data?: ApiBranchRow[]; meta?: { next_cursor?: string | null } }) => {
          if (cancelled) return;
          setLiveBranches((payload.data ?? []).map(toSnapshotBranch));
          setCursor(payload.meta?.next_cursor ?? null);
          setLimit(PAGE_SIZE);
        })
        .catch(() => {
          if (!cancelled) setError(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, API_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [apiSlug, query, city, retryCount]);

  const loadMore = () => {
    if (!apiSlug || !cursor || loading) return;
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), cursor });
    const trimmed = query.trim();
    if (trimmed) params.set("q", trimmed);
    if (city) params.set("city", city);
    fetch(`/api/directory/banks/${encodeURIComponent(apiSlug)}/branches?${params}`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload: { data?: ApiBranchRow[]; meta?: { next_cursor?: string | null } }) => {
        setLiveBranches((current) => [
          ...current,
          ...(payload.data ?? []).map(toSnapshotBranch),
        ]);
        setCursor(payload.meta?.next_cursor ?? null);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  const branches = apiSlug ? liveBranches : (snapshotBranches ?? initialRef.current);

  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const branch of branches) {
      if (branch.city) counts.set(branch.city, (counts.get(branch.city) ?? 0) + 1);
    }
    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
  }, [branches]);

  const filtered = useMemo(() => {
    // Live pages arrive pre-filtered from the API; only snapshot rows are
    // filtered client-side.
    if (apiSlug) return branches;
    const source = snapshotBranches ?? initialBranches;
    const tokens = normalizeQuery(query).split(" ").filter(Boolean);
    return source.filter((branch) => {
      if (city && branch.city !== city) return false;
      if (tokens.length === 0) return true;
      const haystack = normalizeQuery(
        [branch.name, branch.nameLocal ?? "", branch.city ?? "", branch.code ?? ""].join(" "),
      );
      return tokens.every((token) => haystack.includes(token));
    });
  }, [apiSlug, branches, snapshotBranches, initialBranches, query, city]);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [query, city]);

  const visible = apiSlug ? filtered : filtered.slice(0, limit);
  const hasMore = apiSlug ? cursor !== null : visible.length < filtered.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("branchSearchPlaceholder")}
            aria-label={t("branchSearchPlaceholder")}
            className="pl-9 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
        <select
          value={city}
          onChange={(event) => setCity(event.target.value)}
          aria-label={t("allCities")}
          className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-auto"
        >
          <option value="">{t("allCities")}</option>
          {cities.map(([name, count]) => (
            <option key={name} value={name}>
              {name} ({count})
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {apiSlug
            ? loading && branches.length === 0
              ? t("loadingBranches")
              : t("branchesLoaded", { count: branches.length })
            : snapshotBranches
              ? t("branchesShown", { shown: visible.length, total: filtered.length })
              : t("loadingBranches")}
        </p>
      </div>

      {error && branches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">{t("apiError")}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            {t("retry")}
          </Button>
        </div>
      ) : visible.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{common("branch")}</TableHead>
                <TableHead>{common("city")}</TableHead>
                <TableHead>{t("stateColumn")}</TableHead>
                <TableHead>{t("postalCodeColumn")}</TableHead>
                <TableHead>{t("codeColumn")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((branch, index) => (
                <TableRow key={`${branch.code ?? "row"}-${index}`}>
                  <TableCell>
                    <span className="block text-sm font-medium">{branch.name}</span>
                    {branch.nameLocal && branch.nameLocal !== branch.name ? (
                      <span className="block text-xs text-muted-foreground">
                        {branch.nameLocal}
                      </span>
                    ) : null}
                    {branch.address ? (
                      <span className="block text-xs text-muted-foreground">
                        {branch.address}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">{branch.city ?? "—"}</TableCell>
                  <TableCell className="text-sm">{branch.state ?? "—"}</TableCell>
                  <TableCell className="text-sm">{branch.postalCode ?? "—"}</TableCell>
                  <TableCell>
                    {branch.code ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="font-mono text-sm font-medium">{branch.code}</span>
                        <CopyButton value={branch.code} />
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {hasMore ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => {
                  if (apiSlug) {
                    loadMore();
                  } else {
                    setLimit((current) => current + PAGE_SIZE);
                  }
                }}
              >
                {loading ? t("loadingBranches") : t("loadMore")}
              </Button>
            </div>
          ) : null}
          {error && branches.length > 0 ? (
            <p className="text-center text-sm text-muted-foreground">{t("apiError")}</p>
          ) : null}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          {t("branchNoResults")}
        </div>
      )}
    </div>
  );
}
