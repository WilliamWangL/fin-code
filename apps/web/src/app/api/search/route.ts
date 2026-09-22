import { NextRequest, NextResponse } from "next/server";

import { detectIdentifierType, searchAll } from "@/lib/data";

/**
 * Universal search API used by the website's search box (spec §11).
 *
 * GET /api/search?q=ICBKCNBJ
 * → { "query": "ICBKCNBJ", "detected_type": "SWIFT", "results": [...] }
 */
export function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limitParam = Number(request.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 20) : 10;

  if (!query) {
    return NextResponse.json(
      { query: "", detected_type: null, results: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const detectedType = detectIdentifierType(query);
  const results = searchAll(query).slice(0, limit).map((result) => ({
    kind: result.kind,
    type: result.identifierType ?? null,
    title: result.title,
    subtitle: result.subtitle ?? null,
    value: result.value ?? null,
    url: result.href,
  }));

  return NextResponse.json(
    { query, detected_type: detectedType, results },
    {
      headers: {
        // Identifier lookups are stable; short edge cache is safe.
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    },
  );
}
