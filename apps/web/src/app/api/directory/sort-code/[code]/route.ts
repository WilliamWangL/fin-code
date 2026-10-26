import { NextResponse } from "next/server";

import { fetchSortCode } from "@/lib/directory-api";

export const revalidate = 300;

/**
 * Website BFF for live sort-code lookups:
 * /api/directory/sort-code/{code} -> GET /v1/sort-code/{code}
 * The server API key stays here; browsers only ever see this route.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const data = await fetchSortCode(decodeURIComponent(code));
  if (!data) {
    return NextResponse.json(
      { error: { code: "SORT_CODE_UNAVAILABLE", message: "Live sort code lookup failed." } },
      { status: 502 },
    );
  }
  return NextResponse.json({ data });
}
