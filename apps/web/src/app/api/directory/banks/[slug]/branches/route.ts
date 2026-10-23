import { NextRequest, NextResponse } from "next/server";

import { decodeSlug, fetchBankBranches, fetchBankBySlug } from "@/lib/directory-api";

export const revalidate = 300;

/**
 * Website BFF for live branch pages:
 * /api/directory/banks/{slug}/branches?q=&city=&cursor=&limit=
 *   -> GET /v1/banks/{id}/branches (slug resolved through the cached by-slug
 *   lookup first, because the API addresses institutions by public id).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Route params arrive percent-encoded (CJK slugs); normalize like the pages.
  const detail = await fetchBankBySlug(decodeSlug(slug));
  if (!detail) {
    return NextResponse.json(
      { error: { code: "DIRECTORY_UNAVAILABLE", message: "Live directory lookup failed." } },
      { status: 502 },
    );
  }

  const search = request.nextUrl.searchParams;
  const q = search.get("q")?.trim() || undefined;
  const city = search.get("city")?.trim() || undefined;
  const cursor = search.get("cursor")?.trim() || undefined;
  const rawLimit = Number(search.get("limit"));
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1 && rawLimit <= 100 ? rawLimit : 50;

  const page = await fetchBankBranches(detail.id, { q, city, cursor, limit });
  if (!page) {
    return NextResponse.json(
      { error: { code: "DIRECTORY_UNAVAILABLE", message: "Live branch lookup failed." } },
      { status: 502 },
    );
  }
  return NextResponse.json({ data: page.branches, meta: { next_cursor: page.nextCursor } });
}
