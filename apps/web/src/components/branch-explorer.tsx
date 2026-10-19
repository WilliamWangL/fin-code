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

const PAGE_SIZE = 50;

/**
 * Branch lookup over the exported snapshot. The head office row is rendered
 * on the server; the full list (up to thousands of rows) is fetched lazily
 * from the static JSON asset so detail pages stay buildable and small.
 */
export function BranchExplorer({
  snapshotKey,
  initialBranches,
}: {
  snapshotKey: string;
  initialBranches: SnapshotBranch[];
}) {
  const t = useTranslations("banks");
  const common = useTranslations("common");
  const [branches, setBranches] = useState<SnapshotBranch[] | null>(null);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  // Server-rendered head office row; kept in a ref so the fetch effect only
  // depends on the snapshot key (the prop is a fresh array on every render).
  const initialRef = useRef(initialBranches);

  useEffect(() => {
    let cancelled = false;
    fetch(`/data/branches/${snapshotKey}.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data: { branches?: SnapshotBranch[] }) => {
        if (!cancelled) setBranches(data.branches ?? []);
      })
      .catch(() => {
        // Keep the server-rendered head office row on failure.
        if (!cancelled) setBranches(initialRef.current);
      });
    return () => {
      cancelled = true;
    };
  }, [snapshotKey]);

  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const branch of branches ?? []) {
      if (branch.city) counts.set(branch.city, (counts.get(branch.city) ?? 0) + 1);
    }
    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
  }, [branches]);

  const filtered = useMemo(() => {
    const source = branches ?? initialBranches;
    const tokens = normalizeQuery(query).split(" ").filter(Boolean);
    return source.filter((branch) => {
      if (city && branch.city !== city) return false;
      if (tokens.length === 0) return true;
      const haystack = normalizeQuery(
        [branch.name, branch.nameLocal ?? "", branch.city ?? "", branch.code ?? ""].join(" "),
      );
      return tokens.every((token) => haystack.includes(token));
    });
  }, [branches, initialBranches, query, city]);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [query, city]);

  const visible = filtered.slice(0, limit);

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
          {branches
            ? t("branchesShown", { shown: visible.length, total: filtered.length })
            : t("loadingBranches")}
        </p>
      </div>

      {visible.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{common("branch")}</TableHead>
                <TableHead>{common("city")}</TableHead>
                <TableHead>{t("stateColumn")}</TableHead>
                <TableHead>{t("postalCodeColumn")}</TableHead>
                <TableHead>{t("bsbColumn")}</TableHead>
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

          {visible.length < filtered.length ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLimit((current) => current + PAGE_SIZE)}
              >
                {t("loadMore")}
              </Button>
            </div>
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
