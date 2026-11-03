import { allBankRows } from "@/lib/bank-rows";

export const dynamic = "force-static";

export const revalidate = 86400;

/**
 * Search pool for the /banks client directory.
 *
 * It used to be serialised into the page's RSC payload: ~4,150 rows made the
 * HTML ~2 MB while the rendered table only exposed 39 links, which wastes both
 * bandwidth and crawl budget. The pool is now fetched on demand, once, when a
 * visitor actually searches or filters.
 */
export function GET() {
  return Response.json(
    { rows: allBankRows() },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}
